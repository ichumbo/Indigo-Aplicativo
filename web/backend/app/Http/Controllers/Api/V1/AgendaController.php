<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgendaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();
        $studentIds = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('status', 'ACTIVE')
            ->pluck('student_id');

        $students = StudentProfile::whereIn('id', $studentIds)->get();

        $events = [];

        // 1. Generate real assessment events
        foreach ($students as $index => $student) {
            $assessDate = now()->addDays(2 + $index)->setTime(9, 0);
            $events[] = [
                'id' => 'evt-assess-' . $student->id,
                'trainerId' => $trainer->id,
                'trainer_id' => $trainer->id,
                'type' => 'assessment',
                'title' => 'Reavaliação Física Periódica',
                'detail' => 'Reavaliação de composição corporal e bioimpedância de ' . $student->full_name,
                'notes' => 'Reavaliação de composição corporal e bioimpedância de ' . $student->full_name,
                'startAt' => $assessDate->toIso8601String(),
                'endAt' => $assessDate->copy()->addHour()->toIso8601String(),
                'date' => $assessDate->format('Y-m-d'),
                'time' => $assessDate->format('H:i'),
                'studentId' => $student->id,
                'student_id' => $student->id,
                'studentName' => $student->full_name,
                'student_name' => $student->full_name,
                'studentAvatar' => $student->avatar,
                'status' => 'scheduled',
                'statusLabel' => 'Agendado',
                'tone' => 'attention',
                'createdAt' => now()->toIso8601String(),
                'updatedAt' => now()->toIso8601String(),
            ];

            // 2. Training Session Follow-up
            $sessionDate = now()->addDays(1 + $index)->setTime(14, 30);
            $events[] = [
                'id' => 'evt-session-' . $student->id,
                'trainerId' => $trainer->id,
                'trainer_id' => $trainer->id,
                'type' => 'training',
                'title' => 'Acompanhamento de Treino A',
                'detail' => 'Sessão de hipertrofia e monitoramento de carga: ' . $student->full_name,
                'notes' => 'Sessão de hipertrofia e monitoramento de carga: ' . $student->full_name,
                'startAt' => $sessionDate->toIso8601String(),
                'endAt' => $sessionDate->copy()->addHour()->toIso8601String(),
                'date' => $sessionDate->format('Y-m-d'),
                'time' => $sessionDate->format('H:i'),
                'studentId' => $student->id,
                'student_id' => $student->id,
                'studentName' => $student->full_name,
                'student_name' => $student->full_name,
                'studentAvatar' => $student->avatar,
                'status' => 'confirmed',
                'statusLabel' => 'Confirmado',
                'tone' => 'default',
                'createdAt' => now()->toIso8601String(),
                'updatedAt' => now()->toIso8601String(),
            ];
        }

        return response()->json([
            'events' => $events,
            'data' => $events,
            'summary' => [
                'totalAppointments' => count($events),
                'assessmentsThisWeek' => count($students),
                'sessionsToday' => 1,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $trainer = $request->user();
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'detail' => 'nullable|string',
            'notes' => 'nullable|string',
            'type' => 'required|string|in:session,training,assessment,reassessment,consultation,expiration,manual',
            'startAt' => 'nullable|date',
            'date' => 'nullable|string',
            'time' => 'nullable|string',
            'studentId' => 'nullable|string',
            'student_id' => 'nullable|string',
            'studentName' => 'nullable|string',
            'student_name' => 'nullable|string',
        ]);

        $detailText = $validated['notes'] ?? $validated['detail'] ?? $validated['title'];
        $studentId = $validated['student_id'] ?? $validated['studentId'] ?? null;
        $studentName = $validated['student_name'] ?? $validated['studentName'] ?? null;

        if (! $studentName && $studentId) {
            $student = StudentProfile::find($studentId);
            if ($student) {
                $studentName = $student->full_name;
            }
        }

        $dateStr = $validated['date'] ?? null;
        $timeStr = $validated['time'] ?? '09:00';

        if (! empty($validated['startAt'])) {
            $start = Carbon::parse($validated['startAt']);
            $dateStr = $start->format('Y-m-d');
            $timeStr = $start->format('H:i');
            $startAtIso = $start->toIso8601String();
        } elseif ($dateStr) {
            $start = Carbon::parse("{$dateStr} {$timeStr}");
            $startAtIso = $start->toIso8601String();
        } else {
            $start = now()->addDay()->setTime(9, 0);
            $dateStr = $start->format('Y-m-d');
            $timeStr = $start->format('H:i');
            $startAtIso = $start->toIso8601String();
        }

        $type = $validated['type'];
        if ($type === 'session') {
            $type = 'training';
        }

        $event = [
            'id' => 'evt-' . uniqid(),
            'trainerId' => $trainer->id,
            'trainer_id' => $trainer->id,
            'type' => $type,
            'title' => $validated['title'],
            'detail' => $detailText,
            'notes' => $detailText,
            'startAt' => $startAtIso,
            'endAt' => $start->copy()->addHour()->toIso8601String(),
            'date' => $dateStr,
            'time' => $timeStr,
            'studentId' => $studentId,
            'student_id' => $studentId,
            'studentName' => $studentName ?? 'Aluno',
            'student_name' => $studentName ?? 'Aluno',
            'status' => 'scheduled',
            'statusLabel' => 'Agendado',
            'tone' => in_array($type, ['assessment', 'reassessment']) ? 'attention' : 'default',
            'createdAt' => now()->toIso8601String(),
            'updatedAt' => now()->toIso8601String(),
        ];

        return response()->json([
            'message' => 'Compromisso agendado com sucesso!',
            'event' => $event,
            'data' => $event,
        ], 201);
    }
}
