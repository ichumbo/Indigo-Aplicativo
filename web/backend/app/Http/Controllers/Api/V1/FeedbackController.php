<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\AuditLog;
use App\Models\FeedbackResponse;
use App\Models\TrainingFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();
        $studentId = $request->query('student_id');
        $hasPain = $request->query('has_pain');
        $status = $request->query('status');

        $query = TrainingFeedback::where('trainer_id', $trainer->id)
            ->with(['student', 'responses']);

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        if ($hasPain !== null && $hasPain !== '') {
            $query->where('has_pain', filter_var($hasPain, FILTER_VALIDATE_BOOLEAN));
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $feedbacks = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($feedbacks);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();
        $feedback = TrainingFeedback::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->with(['student', 'responses'])
            ->first();

        if (! $feedback) {
            return response()->json(['message' => 'Feedback não encontrado.'], 404);
        }

        return response()->json(['feedback' => $feedback]);
    }

    public function respond(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();

        $feedback = TrainingFeedback::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->first();

        if (! $feedback) {
            return response()->json(['message' => 'Feedback não encontrado ou sem autorização.'], 404);
        }

        $validated = $request->validate([
            'message' => 'required|string|min:3',
            'status' => 'nullable|string|in:novo,respondido,resolvido,arquivado',
        ]);

        $response = FeedbackResponse::create([
            'id' => 'fbres-' . Str::random(12),
            'feedback_id' => $feedback->id,
            'author_id' => $trainer->id,
            'author_name' => $trainer->name,
            'author_role' => 'trainer',
            'message' => $validated['message'],
        ]);

        $feedback->status = $validated['status'] ?? 'respondido';
        $feedback->save();

        // Notificar o aluno sobre a orientação do personal
        AppNotification::create([
            'id' => 'notif-' . Str::random(12),
            'user_id' => $feedback->student_id,
            'audience' => 'student',
            'type' => 'feedback_reply',
            'title' => 'Orientação do Personal no seu Treino',
            'message' => "Seu personal respondeu ao feedback do treino '{$feedback->workout_name}': \"{$validated['message']}\"",
            'read' => false,
            'feedback_id' => $feedback->id,
        ]);

        AuditLog::create([
            'id' => 'audit-' . Str::random(12),
            'action' => 'feedback.responded',
            'actor_id' => $trainer->id,
            'actor_role' => 'trainer',
            'target_id' => $feedback->id,
            'details' => "Resposta enviada ao feedback do aluno {$feedback->student_name}.",
        ]);

        return response()->json([
            'message' => 'Resposta enviada com sucesso ao aluno!',
            'response' => $response,
            'feedback' => $feedback->load('responses'),
        ]);
    }
}
