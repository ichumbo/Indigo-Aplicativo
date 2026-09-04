<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PhysicalAssessment;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\TrainingExecutedSet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvolutionController extends Controller
{
    public function show(Request $request, string $studentId): JsonResponse
    {
        $trainer = $request->user();

        $hasAccess = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('student_id', $studentId)
            ->exists();

        if (! $hasAccess) {
            return response()->json(['message' => 'Aluno não autorizado.'], 403);
        }

        $student = StudentProfile::findOrFail($studentId);

        // 1. Histórico de cargas por exercício (agrupado)
        $executedSets = TrainingExecutedSet::where('student_id', $studentId)
            ->where('valid_for_progression', true)
            ->orderBy('executed_at', 'asc')
            ->get();

        $loadProgression = $executedSets->groupBy('exercise_name')->map(function ($sets) {
            return $sets->map(function ($set) {
                return [
                    'date' => $set->executed_at ? $set->executed_at->format('Y-m-d') : null,
                    'load' => $set->executed_load ?? $set->planned_load,
                    'reps' => $set->executed_reps ?? $set->planned_reps,
                    'unit' => $set->load_unit,
                    'effort' => $set->effort,
                ];
            });
        });

        // 2. Evolução de peso corporal e percentual de gordura (via avaliações físicas)
        $assessments = PhysicalAssessment::where('student_id', $studentId)
            ->orderBy('assessment_date', 'asc')
            ->get();

        $bodyEvolution = $assessments->map(function ($a) {
            $comp = $a->body_composition ?? [];
            return [
                'date' => $a->assessment_date->format('Y-m-d'),
                'weightKg' => $comp['weightKg'] ?? null,
                'bodyFatPercent' => $comp['bodyFatPercent'] ?? null,
                'leanMassKg' => $comp['leanMassKg'] ?? null,
                'bmi' => $comp['bmi'] ?? null,
            ];
        });

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->full_name,
                'mainGoal' => $student->main_goal,
            ],
            'loadProgression' => $loadProgression,
            'bodyEvolution' => $bodyEvolution,
        ]);
    }

    public function recordSet(Request $request): JsonResponse
    {
        // Endpoint que tanto o mobile quanto a web podem usar para registrar execuções
        $validated = $request->validate([
            'studentId' => 'required|string',
            'exerciseId' => 'required|string',
            'exerciseName' => 'required|string',
            'workoutId' => 'nullable|string',
            'workoutName' => 'nullable|string',
            'executedLoad' => 'required|numeric',
            'loadUnit' => 'nullable|string',
            'executedReps' => 'required|integer',
            'effort' => 'nullable|integer',
            'pain' => 'nullable|array',
            'note' => 'nullable|string',
        ]);

        $set = TrainingExecutedSet::create([
            'id' => 'set-' . uniqid(),
            'student_id' => $validated['studentId'],
            'exercise_id' => $validated['exerciseId'],
            'exercise_name' => $validated['exerciseName'],
            'workout_id' => $validated['workoutId'] ?? null,
            'workout_name' => $validated['workoutName'] ?? null,
            'executed_load' => $validated['executedLoad'],
            'load_unit' => $validated['loadUnit'] ?? 'kg',
            'executed_reps' => $validated['executedReps'],
            'effort' => $validated['effort'] ?? 8,
            'completed' => true,
            'valid_for_progression' => true,
            'pain' => $validated['pain'] ?? null,
            'note' => $validated['note'] ?? null,
            'executed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Série registrada com sucesso!',
            'set' => $set,
        ], 201);
    }
}
