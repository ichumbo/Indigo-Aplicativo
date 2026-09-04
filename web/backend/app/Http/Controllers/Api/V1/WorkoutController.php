<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\AuditLog;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\TrainingExercisePrescription;
use App\Models\TrainingPlan;
use App\Models\TrainingSession;
use App\Models\TrainingSessionVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkoutController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $query = TrainingPlan::where('trainer_id', $trainer->id)
            ->with(['student', 'sessions.versions.exercises']);

        if ($studentId = $request->query('studentId')) {
            $query->where('student_id', $studentId);
        }

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $plans = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'workouts' => $plans,
            'total' => $plans->count(),
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $plan = TrainingPlan::with([
            'student',
            'sessions.versions.exercises' => function ($q) {
                $q->orderBy('order', 'asc');
            }
        ])->find($id);

        if (! $plan) {
            return response()->json(['message' => 'Treino não encontrado.'], 404);
        }

        // Verificação estrita de autorização IDOR
        if ($plan->trainer_id !== $trainer->id) {
            return response()->json([
                'message' => 'Acesso proibido. Você não possui permissão para visualizar este treino.',
            ], 403);
        }

        return response()->json(['workout' => $plan]);
    }

    public function store(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $validated = $request->validate([
            'studentId' => 'required|string',
            'name' => 'required|string|min:3|max:150',
            'objective' => 'required|string|max:200',
            'notes' => 'nullable|string',
            'validUntil' => 'nullable|date',
            'frequencyPerWeek' => 'nullable|integer|min:1|max:7',
            'sessions' => 'required|array|min:1',
            'sessions.*.name' => 'required|string',
            'sessions.*.identifier' => 'nullable|string',
            'sessions.*.objective' => 'nullable|string',
            'sessions.*.muscleGroups' => 'nullable|array',
            'sessions.*.level' => 'nullable|string',
            'sessions.*.estimatedDurationMinutes' => 'nullable|integer',
            'sessions.*.instructions' => 'nullable|string',
            'sessions.*.exercises' => 'required|array|min:1',
            'sessions.*.exercises.*.name' => 'required|string',
            'sessions.*.exercises.*.exerciseCatalogId' => 'nullable|string',
            'sessions.*.exercises.*.type' => 'nullable|string',
            'sessions.*.exercises.*.muscleGroup' => 'required|string',
            'sessions.*.exercises.*.combinationId' => 'nullable|string',
            'sessions.*.exercises.*.combinationLabel' => 'nullable|string',
            'sessions.*.exercises.*.plannedSets' => 'required|integer|min:1',
            'sessions.*.exercises.*.plannedSetDetails' => 'nullable|array',
            'sessions.*.exercises.*.plannedReps' => 'nullable|integer',
            'sessions.*.exercises.*.plannedLoad' => 'nullable|numeric',
            'sessions.*.exercises.*.loadUnit' => 'nullable|string',
            'sessions.*.exercises.*.restSeconds' => 'nullable|integer',
            'sessions.*.exercises.*.observation' => 'nullable|string',
            'sessions.*.exercises.*.videoUrl' => 'nullable|string',
            'sessions.*.exercises.*.unilateral' => 'nullable|boolean',
        ]);

        // Validar vínculo do treinador com o aluno (Proteção IDOR)
        $hasStudent = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('student_id', $validated['studentId'])
            ->exists();

        if (! $hasStudent) {
            return response()->json([
                'message' => 'Não autorizado: o aluno indicado não pertence à sua consultoria.',
            ], 403);
        }

        DB::beginTransaction();

        try {
            $planId = 'plan-' . Str::random(10);

            $plan = TrainingPlan::create([
                'id' => $planId,
                'student_id' => $validated['studentId'],
                'trainer_id' => $trainer->id,
                'name' => $validated['name'],
                'objective' => $validated['objective'],
                'status' => 'ativo',
                'version' => 1,
                'start_at' => now()->toDateString(),
                'valid_until' => $validated['validUntil'] ?? now()->addDays(60)->toDateString(),
                'frequency_per_week' => $validated['frequencyPerWeek'] ?? 4,
                'notes' => $validated['notes'] ?? null,
            ]);

            $sessionIds = [];

            foreach ($validated['sessions'] as $sIndex => $sData) {
                $sessionId = 'session-' . Str::random(10);
                $versionId = 'version-' . Str::random(10);
                $sessionIds[] = $sessionId;

                $session = TrainingSession::create([
                    'id' => $sessionId,
                    'plan_id' => $plan->id,
                    'student_id' => $plan->student_id,
                    'trainer_id' => $trainer->id,
                    'status' => 'liberado',
                    'active_version_id' => $versionId,
                ]);

                $version = TrainingSessionVersion::create([
                    'id' => $versionId,
                    'session_id' => $session->id,
                    'version' => 1,
                    'status' => 'published',
                    'name' => $sData['name'],
                    'identifier' => $sData['identifier'] ?? ('Treino ' . chr(65 + $sIndex)),
                    'objective' => $sData['objective'] ?? $plan->objective,
                    'muscle_groups' => $sData['muscleGroups'] ?? [],
                    'level' => $sData['level'] ?? 'intermediario',
                    'estimated_duration_minutes' => $sData['estimatedDurationMinutes'] ?? 60,
                    'order' => $sIndex + 1,
                    'instructions' => $sData['instructions'] ?? null,
                    'show_when_locked' => true,
                ]);

                foreach ($sData['exercises'] as $eIndex => $eData) {
                    TrainingExercisePrescription::create([
                        'id' => 'presc-' . Str::random(10),
                        'version_id' => $version->id,
                        'exercise_catalog_id' => $eData['exerciseCatalogId'] ?? null,
                        'name' => $eData['name'],
                        'type' => $eData['type'] ?? 'main',
                        'muscle_group' => $eData['muscleGroup'],
                        'order' => $eIndex + 1,
                        'combination_id' => $eData['combinationId'] ?? null,
                        'combination_label' => $eData['combinationLabel'] ?? null,
                        'planned_sets' => $eData['plannedSets'],
                        'planned_set_details' => $eData['plannedSetDetails'] ?? null,
                        'planned_reps' => $eData['plannedReps'] ?? 10,
                        'planned_load' => $eData['plannedLoad'] ?? null,
                        'load_unit' => $eData['loadUnit'] ?? 'kg',
                        'rest_seconds' => $eData['restSeconds'] ?? 60,
                        'observation' => $eData['observation'] ?? null,
                        'video_url' => $eData['videoUrl'] ?? null,
                        'unilateral' => $eData['unilateral'] ?? false,
                    ]);
                }
            }

            $plan->session_ids = $sessionIds;
            $plan->save();

            // Notificação instantânea para o aluno no aplicativo mobile
            AppNotification::create([
                'id' => 'notif-' . Str::random(10),
                'user_id' => $plan->student_id,
                'audience' => 'student',
                'type' => 'workout',
                'title' => 'Novo Treino Liberado!',
                'message' => "Seu treinador liberou o treino: {$plan->name}.",
                'read' => false,
            ]);

            AuditLog::create([
                'id' => 'audit-' . Str::random(12),
                'action' => 'workout.created',
                'actor_id' => $trainer->id,
                'actor_role' => 'trainer',
                'target_id' => $plan->id,
                'details' => "Plano '{$plan->name}' criado com " . count($sessionIds) . " sessões.",
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Treino criado e sincronizado com o aplicativo com sucesso!',
                'workout' => $plan->load('sessions.versions.exercises'),
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Falha ao salvar o treino. Nenhuma alteração foi persistida.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $plan = TrainingPlan::with('sessions.versions.exercises')->find($id);

        if (! $plan || $plan->trainer_id !== $trainer->id) {
            return response()->json(['message' => 'Treino não encontrado ou acesso não autorizado.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|min:3',
            'objective' => 'sometimes|string',
            'status' => 'sometimes|string',
            'notes' => 'nullable|string',
            'validUntil' => 'nullable|date',
            'sessions' => 'sometimes|array|min:1',
        ]);

        DB::beginTransaction();

        try {
            if (isset($validated['name'])) $plan->name = $validated['name'];
            if (isset($validated['objective'])) $plan->objective = $validated['objective'];
            if (isset($validated['status'])) $plan->status = $validated['status'];
            if (isset($validated['notes'])) $plan->notes = $validated['notes'];
            if (isset($validated['validUntil'])) $plan->valid_until = $validated['validUntil'];
            $plan->version = $plan->version + 1;
            $plan->save();

            // Se novas sessões e exercícios forem fornecidos, atualiza a versão ativa
            if (!empty($validated['sessions'])) {
                foreach ($validated['sessions'] as $sIndex => $sData) {
                    $session = TrainingSession::where('plan_id', $plan->id)->first();
                    if ($session && isset($sData['exercises'])) {
                        // Limpa prescrições antigas da versão ativa e insere novas
                        $version = TrainingSessionVersion::find($session->active_version_id);
                        if ($version) {
                            TrainingExercisePrescription::where('version_id', $version->id)->delete();
                            foreach ($sData['exercises'] as $eIndex => $eData) {
                                TrainingExercisePrescription::create([
                                    'id' => 'presc-' . Str::random(10),
                                    'version_id' => $version->id,
                                    'exercise_catalog_id' => $eData['exerciseCatalogId'] ?? null,
                                    'name' => $eData['name'],
                                    'type' => $eData['type'] ?? 'main',
                                    'muscle_group' => $eData['muscleGroup'],
                                    'order' => $eIndex + 1,
                                    'combination_id' => $eData['combinationId'] ?? null,
                                    'combination_label' => $eData['combinationLabel'] ?? null,
                                    'planned_sets' => $eData['plannedSets'],
                                    'planned_set_details' => $eData['plannedSetDetails'] ?? null,
                                    'planned_reps' => $eData['plannedReps'] ?? 10,
                                    'planned_load' => $eData['plannedLoad'] ?? null,
                                    'load_unit' => $eData['loadUnit'] ?? 'kg',
                                    'rest_seconds' => $eData['restSeconds'] ?? 60,
                                    'observation' => $eData['observation'] ?? null,
                                    'video_url' => $eData['videoUrl'] ?? null,
                                    'unilateral' => $eData['unilateral'] ?? false,
                                ]);
                            }
                        }
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Treino atualizado com sucesso!',
                'workout' => $plan->fresh(['sessions.versions.exercises']),
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Falha ao atualizar o treino.', 'error' => $e->getMessage()], 500);
        }
    }

    public function duplicate(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $original = TrainingPlan::with('sessions.versions.exercises')->find($id);

        if (! $original || $original->trainer_id !== $trainer->id) {
            return response()->json(['message' => 'Treino não encontrado.'], 403);
        }

        $targetStudentId = $request->input('targetStudentId', $original->student_id);

        DB::beginTransaction();

        try {
            $newPlan = $original->replicate();
            $newPlan->id = 'plan-' . Str::random(10);
            $newPlan->student_id = $targetStudentId;
            $newPlan->name = $original->name . ' (Cópia)';
            $newPlan->created_at = now();
            $newPlan->updated_at = now();
            $newPlan->save();

            $newSessionIds = [];

            foreach ($original->sessions as $origSession) {
                $newSession = $origSession->replicate();
                $newSession->id = 'session-' . Str::random(10);
                $newSession->plan_id = $newPlan->id;
                $newSession->student_id = $targetStudentId;

                $newVersion = $origSession->activeVersion ? $origSession->activeVersion->replicate() : null;
                if ($newVersion) {
                    $newVersion->id = 'version-' . Str::random(10);
                    $newVersion->session_id = $newSession->id;
                    $newVersion->save();

                    $newSession->active_version_id = $newVersion->id;
                    $newSession->save();

                    foreach ($origSession->activeVersion->exercises as $origExercise) {
                        $newExercise = $origExercise->replicate();
                        $newExercise->id = 'presc-' . Str::random(10);
                        $newExercise->version_id = $newVersion->id;
                        $newExercise->save();
                    }
                } else {
                    $newSession->save();
                }

                $newSessionIds[] = $newSession->id;
            }

            $newPlan->session_ids = $newSessionIds;
            $newPlan->save();

            DB::commit();

            return response()->json([
                'message' => 'Treino duplicado com sucesso!',
                'workout' => $newPlan->load('sessions.versions.exercises'),
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Falha ao duplicar treino.'], 500);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $plan = TrainingPlan::find($id);

        if (! $plan || $plan->trainer_id !== $trainer->id) {
            return response()->json(['message' => 'Treino não encontrado.'], 403);
        }

        $plan->status = 'arquivado';
        $plan->save();

        return response()->json(['message' => 'Treino arquivado com sucesso.']);
    }
}
