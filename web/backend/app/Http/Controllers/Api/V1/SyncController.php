<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\PhysicalAssessment;
use App\Models\StudentProfile;
use App\Models\TrainingExecutedSet;
use App\Models\TrainingFeedback;
use App\Models\TrainingPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    /**
     * Endpoint de PULL: o Mobile ou Web baixa os dados mais recentes do ecossistema.
     */
    public function pull(Request $request): JsonResponse
    {
        $studentId = $request->query('studentId');
        $trainerId = $request->query('trainerId');

        $workoutsQuery = TrainingPlan::with(['sessions.versions.exercises']);
        $assessmentsQuery = PhysicalAssessment::query();
        $executedSetsQuery = TrainingExecutedSet::query();
        $feedbacksQuery = TrainingFeedback::query();

        if ($studentId) {
            $workoutsQuery->where('student_id', $studentId);
            $assessmentsQuery->where('student_id', $studentId);
            $executedSetsQuery->where('student_id', $studentId);
            $feedbacksQuery->where('student_id', $studentId);
        } elseif ($trainerId) {
            $workoutsQuery->where('trainer_id', $trainerId);
            $assessmentsQuery->where('trainer_id', $trainerId);
            $executedSetsQuery->where('trainer_id', $trainerId);
            $feedbacksQuery->where('trainer_id', $trainerId);
        }

        return response()->json([
            'syncTimestamp' => now()->toIso8601String(),
            'workouts' => $workoutsQuery->get(),
            'assessments' => $assessmentsQuery->orderBy('assessment_date', 'desc')->get(),
            'executedSets' => $executedSetsQuery->orderBy('executed_at', 'desc')->take(100)->get(),
            'feedbacks' => $feedbacksQuery->orderBy('created_at', 'desc')->take(20)->get(),
        ]);
    }

    /**
     * Endpoint de PUSH: o Mobile envia séries executadas, cargas ou feedbacks para o backend central.
     */
    public function push(Request $request): JsonResponse
    {
        $data = $request->all();

        // 1. Inserir ou atualizar séries executadas (cargas do aluno)
        if (!empty($data['executedSets'])) {
            foreach ($data['executedSets'] as $setItem) {
                TrainingExecutedSet::updateOrCreate(
                    ['id' => $setItem['id'] ?? ('set-' . uniqid())],
                    [
                        'student_id' => $setItem['studentId'],
                        'trainer_id' => $setItem['trainerId'] ?? null,
                        'workout_id' => $setItem['workoutId'] ?? null,
                        'workout_name' => $setItem['workoutName'] ?? null,
                        'exercise_id' => $setItem['exerciseId'],
                        'exercise_name' => $setItem['exerciseName'],
                        'planned_set_index' => $setItem['plannedSetIndex'] ?? 1,
                        'planned_load' => $setItem['plannedLoad'] ?? null,
                        'executed_load' => $setItem['executedLoad'] ?? $setItem['plannedLoad'] ?? 0,
                        'load_unit' => $setItem['loadUnit'] ?? 'kg',
                        'planned_reps' => $setItem['plannedReps'] ?? 10,
                        'executed_reps' => $setItem['executedReps'] ?? 10,
                        'effort' => $setItem['effort'] ?? 8,
                        'completed' => $setItem['completed'] ?? true,
                        'valid_for_progression' => true,
                        'pain' => $setItem['pain'] ?? null,
                        'note' => $setItem['note'] ?? null,
                        'executed_at' => $setItem['executedAt'] ?? now(),
                    ]
                );
            }
        }

        // 2. Inserir feedback
        if (!empty($data['feedbacks'])) {
            foreach ($data['feedbacks'] as $fb) {
                TrainingFeedback::updateOrCreate(
                    ['id' => $fb['id'] ?? ('fb-' . uniqid())],
                    [
                        'student_id' => $fb['studentId'],
                        'student_name' => $fb['studentName'] ?? 'Aluno',
                        'trainer_id' => $fb['trainerId'] ?? 'trainer-main',
                        'workout_id' => $fb['workoutId'] ?? null,
                        'workout_name' => $fb['workoutName'] ?? 'Treino Realizado',
                        'duration_minutes' => $fb['durationMinutes'] ?? 50,
                        'rating' => $fb['rating'] ?? 5,
                        'comment' => $fb['comment'] ?? null,
                        'intensity' => $fb['intensity'] ?? 'Adequado',
                        'has_pain' => $fb['hasPain'] ?? false,
                        'pain_region' => $fb['painRegion'] ?? null,
                        'pain_level' => $fb['painLevel'] ?? null,
                        'status' => 'novo',
                    ]
                );
            }
        }

        return response()->json([
            'message' => 'Dados sincronizados com sucesso no backend central!',
            'syncedAt' => now()->toIso8601String(),
        ]);
    }
}
