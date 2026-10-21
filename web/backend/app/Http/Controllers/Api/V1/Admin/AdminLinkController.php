<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\TrainerStudent;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminLinkController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search');
        $status = $request->query('status');
        $perPage = min(100, max(5, (int) $request->query('per_page', 20)));

        $query = TrainerStudent::query();

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $paginator = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Carrega dados dos usuários envolvidos
        $trainerIds = collect($paginator->items())->pluck('trainer_id')->unique();
        $studentIds = collect($paginator->items())->pluck('student_id')->unique();

        $trainers = User::whereIn('id', $trainerIds)->select('id', 'name', 'email', 'avatar', 'professional_id')->get()->keyBy('id');
        $students = User::whereIn('id', $studentIds)->select('id', 'name', 'email', 'avatar', 'status')->get()->keyBy('id');

        $data = collect($paginator->items())->map(function ($link) use ($trainers, $students) {
            $trainer = $trainers->get($link->trainer_id);
            $student = $students->get($link->student_id);

            return [
                'id' => $link->id,
                'trainer_id' => $link->trainer_id,
                'trainer_name' => $trainer ? $trainer->name : 'Treinador não encontrado',
                'trainer_email' => $trainer ? $trainer->email : '-',
                'student_id' => $link->student_id,
                'student_name' => $student ? $student->name : 'Aluno não encontrado',
                'student_email' => $student ? $student->email : '-',
                'status' => $link->status,
                'created_at' => $link->created_at ? $link->created_at->toIso8601String() : null,
            ];
        });

        if ($search) {
            $lowerSearch = strtolower($search);
            $data = $data->filter(function ($item) use ($lowerSearch) {
                return str_contains(strtolower($item['trainer_name']), $lowerSearch) ||
                       str_contains(strtolower($item['student_name']), $lowerSearch) ||
                       str_contains(strtolower($item['trainer_email']), $lowerSearch) ||
                       str_contains(strtolower($item['student_email']), $lowerSearch);
            })->values();
        }

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'trainer_id' => 'required|exists:users,id',
            'student_id' => 'required|exists:users,id',
            'reason' => 'required|string|min:3',
        ]);

        $trainer = User::find($validated['trainer_id']);
        $student = User::find($validated['student_id']);

        if (!$trainer->isTrainer()) {
            return response()->json(['success' => false, 'message' => 'O usuário selecionado não é um Personal Trainer.'], 422);
        }

        if (!$student->isStudent()) {
            return response()->json(['success' => false, 'message' => 'O usuário selecionado não é um Aluno.'], 422);
        }

        // Verifica se vínculo já existe ativo
        $existing = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Este vínculo já se encontra ativo.'], 422);
        }

        $link = TrainerStudent::create([
            'id' => (string) Str::uuid(),
            'trainer_id' => $trainer->id,
            'student_id' => $student->id,
            'status' => 'active',
        ]);

        AuditService::log(
            $request,
            'LINK_CREATED',
            $link->id,
            $validated['reason'],
            null,
            ['trainer_id' => $trainer->id, 'student_id' => $student->id],
            'SUCCESS',
            'info',
            "Vínculo criado entre Personal {$trainer->name} e Aluno {$student->name}."
        );

        return response()->json([
            'success' => true,
            'message' => "Vínculo criado com sucesso entre {$trainer->name} e {$student->name}.",
            'link' => $link,
        ]);
    }

    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:users,id',
            'from_trainer_id' => 'required|exists:users,id',
            'to_trainer_id' => 'required|exists:users,id|different:from_trainer_id',
            'reason' => 'required|string|min:5',
            'confirm_text' => 'required|string|in:TRANSFERIR',
        ]);

        $student = User::find($validated['student_id']);
        $fromTrainer = User::find($validated['from_trainer_id']);
        $toTrainer = User::find($validated['to_trainer_id']);

        if (!$toTrainer->isTrainer()) {
            return response()->json(['success' => false, 'message' => 'O novo responsável deve ser um Personal Trainer.'], 422);
        }

        DB::transaction(function () use ($student, $fromTrainer, $toTrainer, $validated, $request) {
            // Desvincula do treinador anterior
            TrainerStudent::where('student_id', $student->id)
                ->where('trainer_id', $fromTrainer->id)
                ->where('status', 'active')
                ->update(['status' => 'transferred', 'updated_at' => now()]);

            // Cria novo vínculo com o novo treinador
            $newLink = TrainerStudent::create([
                'id' => (string) Str::uuid(),
                'trainer_id' => $toTrainer->id,
                'student_id' => $student->id,
                'status' => 'active',
            ]);

            AuditService::log(
                $request,
                'LINK_TRANSFERRED',
                $newLink->id,
                $validated['reason'],
                ['from_trainer' => $fromTrainer->id, 'student_id' => $student->id],
                ['to_trainer' => $toTrainer->id, 'student_id' => $student->id],
                'SUCCESS',
                'alert',
                "Aluno {$student->name} transferido de {$fromTrainer->name} para {$toTrainer->name}."
            );
        });

        return response()->json([
            'success' => true,
            'message' => "Aluno {$student->name} transferido com sucesso para o Personal {$toTrainer->name}.",
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $link = TrainerStudent::find($id);
        if (!$link) {
            return response()->json(['success' => false, 'message' => 'Vínculo não encontrado.'], 404);
        }

        $request->validate(['reason' => 'required|string|min:3']);

        $oldStatus = $link->status;
        $link->status = 'ended';
        $link->save();

        AuditService::log(
            $request,
            'LINK_REMOVED',
            $link->id,
            $request->input('reason'),
            ['status' => $oldStatus],
            ['status' => 'ended'],
            'SUCCESS',
            'warning',
            "Vínculo ID {$link->id} encerrado administrativamente."
        );

        return response()->json([
            'success' => true,
            'message' => 'Vínculo encerrado com sucesso.',
        ]);
    }
}
