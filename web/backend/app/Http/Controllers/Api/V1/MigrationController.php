<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\MigrationBatch;
use App\Models\MigrationItem;
use App\Services\Migration\CanonicalNormalizerService;
use App\Services\Migration\DuplicateReconciliationService;
use App\Services\Migration\MigrationExecutorService;
use App\Services\Migration\SpreadsheetParserService;
use App\Services\Migration\TemplateGeneratorService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MigrationController extends Controller
{
    public function __construct(
        private TemplateGeneratorService $templateService,
        private SpreadsheetParserService $parserService,
        private CanonicalNormalizerService $normalizerService,
        private DuplicateReconciliationService $reconciliationService,
        private MigrationExecutorService $executorService
    ) {
    }

    private function getAuthorizedBatch(Request $request, string $id): ?MigrationBatch
    {
        $trainer = $request->user();
        return MigrationBatch::where('id', $id)
            ->where('trainer_id', $trainer->id)
            ->first();
    }

    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();
        $query = MigrationBatch::where('trainer_id', $trainer->id)->orderBy('created_at', 'desc');

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        $batches = $query->get();

        return response()->json([
            'batches' => $batches,
            'total' => $batches->count(),
            'guides' => $this->templateService->getLegalExportGuides(),
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $batch = $this->getAuthorizedBatch($request, $id);
        if (!$batch) {
            return response()->json(['message' => 'Lote de migração não encontrado ou acesso não autorizado.'], 403);
        }

        return response()->json([
            'batch' => $batch,
            'can_rollback' => $batch->canRollback(),
        ]);
    }

    public function items(Request $request, string $id): JsonResponse
    {
        $batch = $this->getAuthorizedBatch($request, $id);
        if (!$batch) {
            return response()->json(['message' => 'Lote de migração não encontrado ou acesso não autorizado.'], 403);
        }

        $query = MigrationItem::where('batch_id', $batch->id);

        if ($type = $request->query('type')) {
            $query->where('item_type', $type);
        }

        if ($request->boolean('needs_review')) {
            $query->whereIn('match_status', [MigrationItem::MATCH_CONFLICT, MigrationItem::MATCH_PROBABLE, MigrationItem::MATCH_INVALID]);
        }

        $items = $query->paginate(50);

        return response()->json($items);
    }

    public function downloadTemplate(string $type): StreamedResponse|JsonResponse
    {
        try {
            $csv = $this->templateService->generateCsv($type);
            $filename = "modelo_{$type}.csv";

            return response()->streamDownload(function () use ($csv) {
                echo $csv;
            }, $filename, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function upload(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $request->validate([
            'source' => 'required|string',
            'file' => 'required|file|max:51200', // 50MB max
        ]);

        $uploadedFile = $request->file('file');
        $originalName = $uploadedFile->getClientOriginalName();
        $mime = $uploadedFile->getMimeType();
        $size = $uploadedFile->getSize();
        $extension = strtolower($uploadedFile->getClientOriginalExtension());

        // Validação de extensões permitidas
        $allowedExtensions = ['csv', 'xlsx', 'txt', 'pdf', 'zip', 'jpg', 'jpeg', 'png'];
        if (!in_array($extension, $allowedExtensions)) {
            return response()->json([
                'message' => "Extensão de arquivo '.{$extension}' não é permitida.",
            ], 422);
        }

        $batchId = 'mig-batch-' . Str::random(10);
        $storedPath = $uploadedFile->storeAs("private/migrations/{$batchId}", $originalName);

        $sha256 = hash_file('sha256', $uploadedFile->getRealPath());

        $fileMeta = [
            'original_name' => $originalName,
            'stored_path' => $storedPath,
            'mime_type' => $mime,
            'size_bytes' => $size,
            'sha256' => $sha256,
        ];

        $batch = MigrationBatch::create([
            'id' => $batchId,
            'trainer_id' => $trainer->id,
            'source' => $request->input('source'),
            'status' => MigrationBatch::STATUS_PARSED,
            'source_files' => [$fileMeta],
            'total_items' => 0,
        ]);

        // Se for planilha (CSV/XLSX), processar linhas para staging imediatamente
        if (in_array($extension, ['csv', 'xlsx', 'txt'])) {
            try {
                $fullPath = Storage::path($storedPath);
                $parsed = $this->parserService->parseFile($fullPath, $originalName);

                $itemsCreated = 0;
                $warningsCount = 0;
                $failedCount = 0;

                foreach ($parsed['rows'] as $row) {
                    $isWorkout = isset($row['exercicio']) || isset($row['nome_exercicio']) || isset($row['series']) || isset($row['workoutname']);

                    if ($isWorkout) {
                        $normalized = $this->normalizerService->normalizeWorkout($row);
                        $itemType = MigrationItem::TYPE_WORKOUT;
                        $matchStatus = MigrationItem::MATCH_NEW;
                        $confidence = 100;
                        $matchedEntityId = null;
                        $suggestedDecision = MigrationItem::DECISION_CREATE_NEW;
                        $itemWarnings = $normalized['warnings'];
                    } else {
                        $normalized = $this->normalizerService->normalizeStudent($row);
                        $itemType = MigrationItem::TYPE_STUDENT;

                        // Detecção e reconciliação de duplicidades
                        $rec = $this->reconciliationService->reconcileStudent($normalized['data'], $trainer->id);
                        $matchStatus = $rec['match_status'];
                        $confidence = $rec['match_confidence'];
                        $matchedEntityId = $rec['matched_entity_id'];
                        $suggestedDecision = $rec['suggested_decision'];
                        $itemWarnings = array_merge($normalized['warnings'], $rec['warnings']);
                    }

                    if (!empty($itemWarnings)) {
                        $warningsCount++;
                    }
                    if (!empty($normalized['errors'])) {
                        $failedCount++;
                        $matchStatus = MigrationItem::MATCH_INVALID;
                    }

                    MigrationItem::create([
                        'id' => 'mig-item-' . Str::random(10),
                        'batch_id' => $batch->id,
                        'item_type' => $itemType,
                        'external_id' => $row['id_externo'] ?? ($row['id_aluno_externo'] ?? null),
                        'raw_data' => $row,
                        'normalized_data' => $normalized['data'],
                        'match_status' => $matchStatus,
                        'match_confidence' => $confidence,
                        'matched_entity_id' => $matchedEntityId,
                        'review_decision' => $suggestedDecision,
                        'warnings' => $itemWarnings,
                        'errors' => $normalized['errors'],
                    ]);

                    $itemsCreated++;
                }

                $batch->total_items = $itemsCreated;
                $batch->warning_items = $warningsCount;
                $batch->failed_items = $failedCount;
                $batch->status = ($warningsCount > 0 || $failedCount > 0)
                    ? MigrationBatch::STATUS_AWAITING_REVIEW
                    : MigrationBatch::STATUS_READY;
                $batch->save();
            } catch (Exception $e) {
                $batch->status = MigrationBatch::STATUS_FAILED;
                $batch->save();
                return response()->json(['message' => 'Erro ao processar conteúdo da planilha: ' . $e->getMessage()], 422);
            }
        }

        return response()->json([
            'batch' => $batch,
            'message' => 'Arquivo recebido com sucesso na área de quarentena e analisado.',
        ], 201);
    }

    public function mapColumns(Request $request, string $id): JsonResponse
    {
        $batch = $this->getAuthorizedBatch($request, $id);
        if (!$batch) {
            return response()->json(['message' => 'Lote não encontrado.'], 403);
        }

        $validated = $request->validate([
            'mapping' => 'required|array',
        ]);

        $batch->column_mapping = $validated['mapping'];
        $batch->save();

        // Re-normalizar itens do lote com o novo mapeamento
        $items = MigrationItem::where('batch_id', $batch->id)->get();
        foreach ($items as $item) {
            if ($item->item_type === MigrationItem::TYPE_STUDENT) {
                $normalized = $this->normalizerService->normalizeStudent($item->raw_data, $validated['mapping']);
                $rec = $this->reconciliationService->reconcileStudent($normalized['data'], $batch->trainer_id);

                $item->normalized_data = $normalized['data'];
                $item->match_status = $rec['match_status'];
                $item->match_confidence = $rec['match_confidence'];
                $item->matched_entity_id = $rec['matched_entity_id'];
                $item->review_decision = $rec['suggested_decision'];
                $item->warnings = array_merge($normalized['warnings'], $rec['warnings']);
                $item->errors = $normalized['errors'];
                $item->save();
            } elseif ($item->item_type === MigrationItem::TYPE_WORKOUT) {
                $normalized = $this->normalizerService->normalizeWorkout($item->raw_data, $validated['mapping']);
                $item->normalized_data = $normalized['data'];
                $item->warnings = $normalized['warnings'];
                $item->errors = $normalized['errors'];
                $item->save();
            }
        }

        return response()->json([
            'message' => 'Mapeamento de colunas atualizado e dados reprocessados com sucesso.',
            'batch' => $batch->fresh(),
        ]);
    }

    public function resolveConflicts(Request $request, string $id): JsonResponse
    {
        $batch = $this->getAuthorizedBatch($request, $id);
        if (!$batch) {
            return response()->json(['message' => 'Lote não encontrado.'], 403);
        }

        $validated = $request->validate([
            'resolutions' => 'required|array', // ['item_id' => 'create_new'|'link_existing'|'ignore', ...]
        ]);

        foreach ($validated['resolutions'] as $itemId => $decision) {
            MigrationItem::where('batch_id', $batch->id)
                ->where('id', $itemId)
                ->update(['review_decision' => $decision]);
        }

        $batch->conflict_resolutions = array_merge($batch->conflict_resolutions ?? [], $validated['resolutions']);
        $batch->status = MigrationBatch::STATUS_READY;
        $batch->save();

        return response()->json([
            'message' => 'Decisões de revisão salvas com sucesso.',
            'batch' => $batch->fresh(),
        ]);
    }

    public function confirm(Request $request, string $id): JsonResponse
    {
        $batch = $this->getAuthorizedBatch($request, $id);
        if (!$batch) {
            return response()->json(['message' => 'Lote não encontrado.'], 403);
        }

        try {
            $summary = $this->executorService->execute($batch);

            return response()->json([
                'success' => true,
                'message' => 'Migração concluída com sucesso! Os alunos foram cadastrados com convite pendente e os treinos foram salvos como rascunho.',
                'summary' => $summary,
                'batch' => $batch->fresh(),
            ]);
        } catch (Exception $e) {
            if ($e->getCode() === 403) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'LIMIT_EXCEEDED',
                ], 403);
            }

            return response()->json([
                'message' => 'Falha durante a gravação dos dados: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function rollback(Request $request, string $id): JsonResponse
    {
        $batch = $this->getAuthorizedBatch($request, $id);
        if (!$batch) {
            return response()->json(['message' => 'Lote não encontrado.'], 403);
        }

        $reason = $request->input('reason', 'Reversão solicitada pelo personal trainer');

        try {
            $this->executorService->rollback($batch, $reason);

            return response()->json([
                'success' => true,
                'message' => 'Lote de migração desfeito com sucesso. Todos os registros criados por este lote foram removidos.',
                'batch' => $batch->fresh(),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Não foi possível reverter a migração: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function assistedRequest(Request $request): JsonResponse
    {
        $trainer = $request->user();

        $validated = $request->validate([
            'source' => 'required|string',
            'estimatedStudents' => 'required|integer',
            'notes' => 'nullable|string',
            'contactPhone' => 'nullable|string',
        ]);

        $ticketId = 'TICK-MIG-' . strtoupper(Str::random(6));

        AuditLog::create([
            'id' => 'audit-' . Str::random(10),
            'action' => 'assisted_migration_requested',
            'actor_id' => $trainer->id,
            'actor_role' => 'TRAINER',
            'target_id' => $ticketId,
            'details' => json_encode($validated),
        ]);

        return response()->json([
            'ticket_id' => $ticketId,
            'message' => 'Protocolo de migração assistida aberto com sucesso! Nosso time entrará em contato em até 24 horas úteis.',
        ], 201);
    }
}

