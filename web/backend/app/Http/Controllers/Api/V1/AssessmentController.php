<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PhysicalAssessment;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AssessmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $query = PhysicalAssessment::where('trainer_id', $trainer->id)
            ->with('student');

        if ($studentId = $request->query('studentId')) {
            $query->where('student_id', $studentId);
        }

        $assessments = $query->orderBy('assessment_date', 'desc')->get();

        return response()->json([
            'assessments' => $assessments,
            'total' => $assessments->count(),
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $assessment = PhysicalAssessment::with('student')->find($id);

        if (! $assessment || $assessment->trainer_id !== $trainer->id) {
            return response()->json(['message' => 'Avaliação não encontrada ou acesso negado.'], 403);
        }

        return response()->json(['assessment' => $assessment]);
    }

    public function store(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $validated = $request->validate([
            'studentId' => 'required|string',
            'assessmentDate' => 'required|date',
            'type' => 'nullable|string',
            'generalInfo' => 'nullable|array',
            'anamnesis' => 'nullable|array',
            'bodyComposition' => 'required|array',
            'perimeters' => 'nullable|array',
            'skinfolds' => 'nullable|array',
            'cardio' => 'nullable|array',
            'functional' => 'nullable|array',
            'postural' => 'nullable|array',
            'conclusion' => 'nullable|string',
        ]);

        $hasAccess = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('student_id', $validated['studentId'])
            ->exists();

        if (! $hasAccess) {
            return response()->json(['message' => 'Aluno não autorizado.'], 403);
        }

        // Cálculos automáticos de Composição Corporal
        $comp = $validated['bodyComposition'];
        $weight = isset($comp['weightKg']) ? floatval($comp['weightKg']) : null;
        $height = isset($comp['heightCm']) ? floatval($comp['heightCm']) : null;

        if ($weight && $height) {
            $heightM = $height / 100;
            $comp['bmi'] = round($weight / ($heightM * $heightM), 1);
        }

        if ($weight && isset($comp['bodyFatPercent'])) {
            $fatPercent = floatval($comp['bodyFatPercent']);
            $fatMass = round($weight * ($fatPercent / 100), 1);
            $leanMass = round($weight - $fatMass, 1);
            $comp['fatMassKg'] = $fatMass;
            $comp['leanMassKg'] = $leanMass;
        }

        $assessment = PhysicalAssessment::create([
            'id' => 'assess-' . Str::random(10),
            'student_id' => $validated['studentId'],
            'trainer_id' => $trainer->id,
            'assessment_date' => $validated['assessmentDate'],
            'type' => $validated['type'] ?? 'periodica',
            'status' => 'concluida',
            'general_info' => $validated['generalInfo'] ?? null,
            'anamnesis' => $validated['anamnesis'] ?? null,
            'body_composition' => $comp,
            'perimeters' => $validated['perimeters'] ?? null,
            'skinfolds' => $validated['skinfolds'] ?? null,
            'cardio' => $validated['cardio'] ?? null,
            'functional' => $validated['functional'] ?? null,
            'postural' => $validated['postural'] ?? null,
            'conclusion' => $validated['conclusion'] ?? null,
        ]);

        return response()->json([
            'message' => 'Avaliação física salva com sucesso!',
            'assessment' => $assessment->load('student'),
        ], 201);
    }

    public function compare(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $firstId = $request->query('first');
        $secondId = $request->query('second');

        if (! $firstId || ! $secondId) {
            return response()->json(['message' => 'Parâmetros first e second são obrigatórios.'], 400);
        }

        $first = PhysicalAssessment::where('trainer_id', $trainer->id)->find($firstId);
        $second = PhysicalAssessment::where('trainer_id', $trainer->id)->find($secondId);

        if (! $first || ! $second) {
            return response()->json(['message' => 'Uma das avaliações não foi encontrada.'], 404);
        }

        // Calcular deltas
        $w1 = $first->body_composition['weightKg'] ?? 0;
        $w2 = $second->body_composition['weightKg'] ?? 0;
        $bf1 = $first->body_composition['bodyFatPercent'] ?? 0;
        $bf2 = $second->body_composition['bodyFatPercent'] ?? 0;
        $lm1 = $first->body_composition['leanMassKg'] ?? 0;
        $lm2 = $second->body_composition['leanMassKg'] ?? 0;

        return response()->json([
            'first' => $first,
            'second' => $second,
            'deltas' => [
                'weightKg' => round($second->body_composition['weightKg'] ?? 0 - ($first->body_composition['weightKg'] ?? 0), 1),
                'bodyFatPercent' => round($bf2 - $bf1, 1),
                'leanMassKg' => round($lm2 - $lm1, 1),
            ],
        ]);
    }
}
