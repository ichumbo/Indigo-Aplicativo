<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StudentController extends Controller
{
    private function ensureTrainerHasAccess(string $trainerId, string $studentId): bool
    {
        return TrainerStudent::where('trainer_id', $trainerId)
            ->where('student_id', $studentId)
            ->exists();
    }

    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $relationships = TrainerStudent::where('trainer_id', $trainer->id)
            ->get();
        $studentIds = $relationships->pluck('student_id')->toArray();

        $query = StudentProfile::whereIn('id', $studentIds);

        // Filtro de busca textual (nome, e-mail, objetivo)
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('main_goal', 'like', "%{$search}%")
                  ->orWhere('profession', 'like', "%{$search}%");
            });
        }

        // Filtro de status
        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $students = $query->with(['trainingPlans' => function ($q) use ($trainer) {
            $q->where('trainer_id', $trainer->id)->where('status', 'ativo');
        }, 'assessments' => function ($q) use ($trainer) {
            $q->where('trainer_id', $trainer->id)->orderBy('assessment_date', 'desc');
        }])->get();

        return response()->json([
            'students' => $students,
            'total' => $students->count(),
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        // Verificação estrita de autorização (Prevenção de IDOR)
        if (! $this->ensureTrainerHasAccess($trainer->id, $id)) {
            return response()->json([
                'message' => 'Acesso negado. Este aluno não pertence à sua carteira de clientes.',
            ], 403);
        }

        $student = StudentProfile::with([
            'trainingPlans.sessions.versions.exercises',
            'assessments' => function ($q) {
                $q->orderBy('assessment_date', 'desc');
            },
            'executedSets' => function ($q) {
                $q->orderBy('executed_at', 'desc')->take(50);
            }
        ])->find($id);

        if (! $student) {
            return response()->json(['message' => 'Aluno não encontrado.'], 404);
        }

        return response()->json(['student' => $student]);
    }

    public function store(Request $request): JsonResponse
    {
        $trainer = $request->user();

        // Validação de limites de assinatura (Freemium: máx 1 aluno ativo)
        $sub = $trainer->subscription;
        if ($sub && $sub->plan_id === 'free') {
            $activeCount = TrainerStudent::where('trainer_id', $trainer->id)
                ->where('status', 'ACTIVE')
                ->count();
            if ($activeCount >= 1) {
                return response()->json([
                    'message' => 'Limite do plano Free atingido (1 aluno ativo). Faça o upgrade para o Plano Pro para gerenciar alunos ilimitados.',
                    'code' => 'UPGRADE_REQUIRED',
                ], 403);
            }
        }

        $validated = $request->validate([
            'fullName' => 'required|string|min:3|max:120',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'birthDate' => 'nullable|date',
            'gender' => 'nullable|string',
            'mainGoal' => 'required|string',
            'secondaryGoals' => 'nullable|array',
            'profession' => 'nullable|string',
            'address' => 'nullable|string',
            'administrativeNotes' => 'nullable|string',
        ]);

        $studentId = 'student-' . Str::random(10);

        $student = StudentProfile::create([
            'id' => $studentId,
            'full_name' => $validated['fullName'],
            'birth_date' => $validated['birthDate'] ?? null,
            'gender' => $validated['gender'] ?? 'not_informed',
            'main_goal' => $validated['mainGoal'],
            'secondary_goals' => $validated['secondaryGoals'] ?? [],
            'profession' => $validated['profession'] ?? null,
            'address' => $validated['address'] ?? null,
            'contact' => [
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
            ],
            'status' => 'ativo',
            'administrative_notes' => $validated['administrativeNotes'] ?? null,
            'follow_up_summary' => [
                'startedAt' => now()->toIso8601String(),
                'adherencePercent' => 100,
            ],
        ]);

        TrainerStudent::create([
            'id' => 'rel-' . Str::random(12),
            'trainer_id' => $trainer->id,
            'student_id' => $student->id,
            'status' => 'ACTIVE',
            'started_at' => now(),
        ]);

        AuditLog::create([
            'id' => 'audit-' . Str::random(12),
            'action' => 'student.created',
            'actor_id' => $trainer->id,
            'actor_role' => 'trainer',
            'target_id' => $student->id,
            'details' => "Aluno {$student->full_name} cadastrado pelo personal.",
        ]);

        return response()->json([
            'message' => 'Aluno cadastrado com sucesso!',
            'student' => $student,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        if (! $this->ensureTrainerHasAccess($trainer->id, $id)) {
            return response()->json([
                'message' => 'Acesso negado. Este aluno não pertence à sua consultoria.',
            ], 403);
        }

        $student = StudentProfile::findOrFail($id);

        $validated = $request->validate([
            'fullName' => 'sometimes|string|min:3',
            'mainGoal' => 'sometimes|string',
            'secondaryGoals' => 'nullable|array',
            'status' => 'sometimes|string',
            'profession' => 'nullable|string',
            'address' => 'nullable|string',
            'contact' => 'nullable|array',
            'administrativeNotes' => 'nullable|string',
            'anamnesis' => 'nullable|array',
            'privateTrainerNotes' => 'nullable|array',
        ]);

        if (isset($validated['fullName'])) $student->full_name = $validated['fullName'];
        if (isset($validated['mainGoal'])) $student->main_goal = $validated['mainGoal'];
        if (isset($validated['secondaryGoals'])) $student->secondary_goals = $validated['secondaryGoals'];
        if (isset($validated['status'])) $student->status = $validated['status'];
        if (isset($validated['profession'])) $student->profession = $validated['profession'];
        if (isset($validated['address'])) $student->address = $validated['address'];
        if (isset($validated['contact'])) $student->contact = $validated['contact'];
        if (isset($validated['administrativeNotes'])) $student->administrative_notes = $validated['administrativeNotes'];
        if (isset($validated['anamnesis'])) $student->anamnesis = $validated['anamnesis'];
        if (isset($validated['privateTrainerNotes'])) $student->private_trainer_notes = $validated['privateTrainerNotes'];

        $student->save();

        return response()->json([
            'message' => 'Dados do aluno atualizados com sucesso.',
            'student' => $student,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        if (! $this->ensureTrainerHasAccess($trainer->id, $id)) {
            return response()->json([
                'message' => 'Acesso negado.',
            ], 403);
        }

        TrainerStudent::where('trainer_id', $trainer->id)
            ->where('student_id', $id)
            ->update(['status' => 'ENDED', 'ended_at' => now()]);

        return response()->json([
            'message' => 'Aluno desvinculado com sucesso.',
        ]);
    }
}
