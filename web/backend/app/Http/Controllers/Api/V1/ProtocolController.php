<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\AuditLog;
use App\Models\Protocol;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProtocolController extends Controller
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
        $studentId = $request->query('student_id');

        $query = Protocol::where('trainer_id', $trainer->id);

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        $protocols = $query->orderBy('protocol_date', 'desc')->get();

        return response()->json([
            'protocols' => $protocols,
            'total' => $protocols->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $validated = $request->validate([
            'student_id' => 'required|string',
            'title' => 'required|string|max:150',
            'type' => 'nullable|string|in:aerobio,forca,mobilidade,conconi',
            'protocol_date' => 'required|date',
            'warmup_text' => 'nullable|string',
            'conconi_test_result' => 'nullable|array',
            'days_prescription' => 'nullable|array',
            'general_notes' => 'nullable|string',
            'status' => 'nullable|string|in:ativo,rascunho,encerrado,arquivado',
        ]);

        if (! $this->ensureTrainerHasAccess($trainer->id, $validated['student_id'])) {
            return response()->json([
                'message' => 'Acesso negado. Aluno não pertence à sua consultoria.',
            ], 403);
        }

        $student = StudentProfile::find($validated['student_id']);
        $studentName = $student ? $student->full_name : 'Aluno';
        $studentAvatar = $student ? $student->avatar : null;

        $protocolId = 'proto-' . Str::random(12);

        $protocol = Protocol::create([
            'id' => $protocolId,
            'trainer_id' => $trainer->id,
            'student_id' => $validated['student_id'],
            'student_name' => $studentName,
            'student_avatar' => $studentAvatar,
            'type' => $validated['type'] ?? 'aerobio',
            'title' => $validated['title'],
            'protocol_date' => $validated['protocol_date'],
            'warmup_text' => $validated['warmup_text'] ?? '5 minutos de aquecimento na esteira - 4 a 6km/h (progressivo)',
            'conconi_test_result' => $validated['conconi_test_result'] ?? null,
            'days_prescription' => $validated['days_prescription'] ?? [],
            'general_notes' => $validated['general_notes'] ?? 'O protocolo será atualizado a cada duas semanas, desde que cada treino seja realizado duas vezes.',
            'status' => $validated['status'] ?? 'ativo',
        ]);

        // Notificar o aluno no mobile
        AppNotification::create([
            'id' => 'notif-' . Str::random(12),
            'user_id' => $student ? ($student->user_id ?? $student->id) : $validated['student_id'],
            'audience' => 'student',
            'type' => 'protocol_assigned',
            'title' => 'Novo Protocolo Prescrito',
            'message' => "Seu personal {$trainer->name} prescreveu um novo {$protocol->title}.",
            'read' => false,
        ]);

        AuditLog::create([
            'id' => 'audit-' . Str::random(12),
            'action' => 'protocol.created',
            'actor_id' => $trainer->id,
            'actor_role' => 'trainer',
            'target_id' => $protocol->id,
            'details' => "Protocolo {$protocol->title} atribuído a {$studentName}.",
        ]);

        return response()->json([
            'message' => 'Protocolo criado e atribuído ao aluno com sucesso!',
            'protocol' => $protocol,
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();
        $protocol = Protocol::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->first();

        if (! $protocol) {
            return response()->json(['message' => 'Protocolo não encontrado.'], 404);
        }

        return response()->json(['protocol' => $protocol]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();
        $protocol = Protocol::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->first();

        if (! $protocol) {
            return response()->json(['message' => 'Protocolo não encontrado ou sem autorização.'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:150',
            'type' => 'sometimes|string',
            'protocol_date' => 'sometimes|date',
            'warmup_text' => 'nullable|string',
            'conconi_test_result' => 'nullable|array',
            'days_prescription' => 'nullable|array',
            'general_notes' => 'nullable|string',
            'status' => 'sometimes|string',
        ]);

        $protocol->update($validated);

        return response()->json([
            'message' => 'Protocolo atualizado com sucesso.',
            'protocol' => $protocol,
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $trainer = $request->user();
        $protocol = Protocol::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->first();

        if (! $protocol) {
            return response()->json(['message' => 'Protocolo não encontrado.'], 404);
        }

        $protocol->delete();

        return response()->json(['message' => 'Protocolo excluído com sucesso.']);
    }
}
