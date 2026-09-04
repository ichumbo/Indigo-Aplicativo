<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();

        // Conversas ativas com os alunos
        $relationships = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('status', 'ACTIVE')
            ->get();
        $studentIds = $relationships->pluck('student_id')->toArray();

        $students = StudentProfile::whereIn('id', $studentIds)->get();

        $conversations = $students->map(function ($student) use ($trainer) {
            $convId = "conv_{$trainer->id}_{$student->id}";
            $lastMsg = ChatMessage::where('conversation_id', $convId)
                ->orderBy('created_at', 'desc')
                ->first();

            $unreadCount = ChatMessage::where('conversation_id', $convId)
                ->where('receiver_id', $trainer->id)
                ->where('read', false)
                ->count();

            return [
                'id' => $convId,
                'student' => [
                    'id' => $student->id,
                    'name' => $student->full_name,
                    'avatar' => $student->avatar,
                ],
                'lastMessage' => $lastMsg,
                'unreadCount' => $unreadCount,
            ];
        });

        return response()->json(['conversations' => $conversations]);
    }

    public function messages(Request $request, string $studentId): JsonResponse
    {
        $trainer = $request->user();
        $convId = "conv_{$trainer->id}_{$studentId}";

        $messages = ChatMessage::where('conversation_id', $convId)
            ->orderBy('created_at', 'asc')
            ->get();

        // Marcar como lidas
        ChatMessage::where('conversation_id', $convId)
            ->where('receiver_id', $trainer->id)
            ->where('read', false)
            ->update(['read' => true]);

        return response()->json(['messages' => $messages]);
    }

    public function send(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $validated = $request->validate([
            'studentId' => 'required|string',
            'text' => 'required|string|max:1000',
            'tag' => 'nullable|string',
        ]);

        $student = StudentProfile::findOrFail($validated['studentId']);
        $convId = "conv_{$trainer->id}_{$student->id}";

        $msg = ChatMessage::create([
            'id' => 'msg-' . Str::random(10),
            'conversation_id' => $convId,
            'sender_id' => $trainer->id,
            'sender_name' => $trainer->name,
            'sender_role' => 'TRAINER',
            'receiver_id' => $student->id,
            'receiver_name' => $student->full_name,
            'receiver_role' => 'STUDENT',
            'text' => $validated['text'],
            'tag' => $validated['tag'] ?? 'geral',
            'read' => false,
        ]);

        return response()->json([
            'message' => 'Mensagem enviada com sucesso.',
            'chatMessage' => $msg,
        ], 201);
    }
}
