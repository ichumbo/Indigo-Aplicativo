<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LegacyImportedFile;
use App\Models\TrainerStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LegacyFileController extends Controller
{
    private function checkStudentAccess(string $trainerId, string $studentId): bool
    {
        return TrainerStudent::where('trainer_id', $trainerId)
            ->where('student_id', $studentId)
            ->exists();
    }

    public function indexForStudent(Request $request, string $studentId): JsonResponse
    {
        $trainer = $request->user();

        if (!$this->checkStudentAccess($trainer->id, $studentId)) {
            return response()->json(['message' => 'Aluno não encontrado ou acesso não autorizado.'], 403);
        }

        $files = LegacyImportedFile::where('student_id', $studentId)
            ->where('trainer_id', $trainer->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'files' => $files,
            'total' => $files->count(),
        ]);
    }

    public function storeForStudent(Request $request, string $studentId): JsonResponse
    {
        $trainer = $request->user();

        if (!$this->checkStudentAccess($trainer->id, $studentId)) {
            return response()->json(['message' => 'Aluno não encontrado ou acesso não autorizado.'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:51200',
            'category' => 'nullable|string',
            'sourcePlatform' => 'nullable|string',
            'originalDate' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $uploaded = $request->file('file');
        $id = 'leg-' . Str::random(10);
        $originalName = $uploaded->getClientOriginalName();
        $storedPath = $uploaded->storeAs("private/legacy/{$studentId}", "{$id}_{$originalName}");

        $legacy = LegacyImportedFile::create([
            'id' => $id,
            'student_id' => $studentId,
            'trainer_id' => $trainer->id,
            'category' => $request->input('category', LegacyImportedFile::CATEGORY_DOCUMENT),
            'original_name' => $originalName,
            'stored_path' => $storedPath,
            'file_size' => $uploaded->getSize(),
            'mime_type' => $uploaded->getMimeType(),
            'source_platform' => $request->input('sourcePlatform', 'upload_manual'),
            'original_date' => $request->input('originalDate'),
            'notes' => $request->input('notes'),
            'conversion_status' => LegacyImportedFile::STATUS_RAW_PRESERVED,
        ]);

        return response()->json([
            'file' => $legacy,
            'message' => 'Arquivo legado anexado ao histórico do aluno com sucesso.',
        ], 201);
    }

    public function download(Request $request, string $id): BinaryFileResponse|JsonResponse
    {
        $trainer = $request->user();

        $legacy = LegacyImportedFile::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->first();

        if (!$legacy) {
            return response()->json(['message' => 'Arquivo não encontrado ou acesso negado.'], 403);
        }

        $fullPath = Storage::path($legacy->stored_path);
        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'O arquivo físico não foi encontrado no armazenamento.'], 404);
        }

        return response()->download($fullPath, $legacy->original_name);
    }
}
