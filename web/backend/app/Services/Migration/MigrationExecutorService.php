<?php

namespace App\Services\Migration;

use App\Models\AuditLog;
use App\Models\LegacyImportedFile;
use App\Models\MigrationBatch;
use App\Models\MigrationItem;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\TrainingExercisePrescription;
use App\Models\TrainingPlan;
use App\Models\TrainingSession;
use App\Models\TrainingSessionVersion;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class MigrationExecutorService
{
    private ExerciseMatcherService $exerciseMatcher;

    public function __construct()
    {
        $this->exerciseMatcher = new ExerciseMatcherService();
    }

    /**
     * Valida os limites do plano do treinador antes de importar.
     */
    public function checkPlanLimits(MigrationBatch $batch): void
    {
        $trainer = $batch->trainer;
        $sub = $trainer->subscription;
        $isPro = $sub && $sub->isPro();
        $studentLimit = $isPro ? 9999 : ($sub?->student_limit ?? 1);

        if ($isPro) {
            return;
        }

        $activeCount = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('status', 'ACTIVE')
            ->count();

        // Contar quantos novos alunos serão criados
        $newStudentsCount = MigrationItem::where('batch_id', $batch->id)
            ->where('item_type', MigrationItem::TYPE_STUDENT)
            ->where(function ($q) {
                $q->where('review_decision', MigrationItem::DECISION_CREATE_NEW)
                  ->orWhere(function ($subQ) {
                      $subQ->whereNull('review_decision')
                           ->where('match_status', 'new');
                  });
            })
            ->count();

        if (($activeCount + $newStudentsCount) > $studentLimit) {
            throw new RuntimeException("Limite do plano Free atingido (máx {$studentLimit} aluno ativo). Você possui {$activeCount} e tentou importar mais {$newStudentsCount}. Faça o upgrade para o Plano Pro para alunos ilimitados.", 403);
        }
    }

    /**
     * Executa a inserção definitiva dos dados aprovados no banco de dados.
     */
    public function execute(MigrationBatch $batch): array
    {
        $this->checkPlanLimits($batch);

        DB::beginTransaction();

        try {
            $batch->status = MigrationBatch::STATUS_IMPORTING;
            $batch->started_at = now();
            $batch->save();

            $trainerId = $batch->trainer_id;
            $items = MigrationItem::where('batch_id', $batch->id)->get();

            $studentMap = []; // [nome_normalizado => student_id] ou [external_id => student_id]
            $summary = [
                'students_created' => 0,
                'students_linked' => 0,
                'workouts_created' => 0,
                'legacy_files_created' => 0,
                'items_ignored' => 0,
            ];

            // 1. Processar Alunos
            $studentItems = $items->where('item_type', MigrationItem::TYPE_STUDENT);
            foreach ($studentItems as $item) {
                $decision = $item->review_decision ?? ($item->match_status === 'new' ? 'create_new' : 'link_existing');
                $norm = $item->normalized_data ?? [];

                if ($decision === MigrationItem::DECISION_IGNORE) {
                    $item->imported_at = now();
                    $item->save();
                    $summary['items_ignored']++;
                    continue;
                }

                if ($decision === MigrationItem::DECISION_LINK_EXISTING && $item->matched_entity_id) {
                    $studentId = $item->matched_entity_id;
                    $item->destination_id = $studentId;
                    $item->imported_at = now();
                    $item->save();
                    $summary['students_linked']++;
                } else {
                    // Criar novo aluno
                    $studentId = 'student-' . Str::random(10);

                    $student = StudentProfile::create([
                        'id' => $studentId,
                        'full_name' => $norm['fullName'] ?? 'Aluno Importado',
                        'birth_date' => $norm['birthDate'] ?? null,
                        'gender' => $norm['gender'] ?? 'not_informed',
                        'main_goal' => $norm['mainGoal'] ?? 'Hipertrofia e Condicionamento',
                        'secondary_goals' => $norm['secondaryGoals'] ?? [],
                        'profession' => $norm['profession'] ?? null,
                        'address' => $norm['address'] ?? null,
                        'contact' => [
                            'email' => $norm['email'] ?? null,
                            'phone' => $norm['phone'] ?? null,
                        ],
                        'status' => 'ativo',
                        'administrative_notes' => $norm['administrativeNotes'] ?? null,
                        'follow_up_summary' => [
                            'startedAt' => now()->toIso8601String(),
                            'adherencePercent' => 100,
                            'source' => "import_{$batch->source}",
                        ],
                    ]);

                    TrainerStudent::create([
                        'id' => 'ts-' . Str::random(10),
                        'trainer_id' => $trainerId,
                        'student_id' => $studentId,
                        'status' => 'ACTIVE',
                        'started_at' => now(),
                        'invite_status' => 'pending', // Convite pendente conforme regra inegociável
                        'code_used' => "MIG-{$batch->id}",
                    ]);

                    $item->destination_id = $studentId;
                    $item->imported_at = now();
                    $item->save();
                    $summary['students_created']++;
                }

                if (!empty($norm['fullName'])) {
                    $studentMap[mb_strtolower(trim($norm['fullName']))] = $studentId;
                }
                if (!empty($norm['externalId'])) {
                    $studentMap["ext_" . trim($norm['externalId'])] = $studentId;
                }
            }

            // 2. Processar Treinos (Agrupados por Plano e Sessão)
            $workoutItems = $items->where('item_type', MigrationItem::TYPE_WORKOUT);
            $plansGrouped = [];

            foreach ($workoutItems as $item) {
                $decision = $item->review_decision ?? 'create_new';
                if ($decision === MigrationItem::DECISION_IGNORE) {
                    $item->imported_at = now();
                    $item->save();
                    $summary['items_ignored']++;
                    continue;
                }

                $norm = $item->normalized_data ?? [];
                $studentName = mb_strtolower(trim($norm['studentName'] ?? ''));
                $studentExt = "ext_" . trim($norm['studentExternalId'] ?? '');

                $targetStudentId = $studentMap[$studentExt] ?? ($studentMap[$studentName] ?? null);

                // Fallback: se houver apenas 1 aluno no lote ou na carteira
                if (!$targetStudentId && count($studentMap) === 1) {
                    $targetStudentId = reset($studentMap);
                }

                if (!$targetStudentId) {
                    // Sem aluno associado: mantém item como pendente com warning
                    $item->warnings = array_merge($item->warnings ?? [], ['Treino não importado: aluno correspondente não encontrado.']);
                    $item->save();
                    continue;
                }

                $planName = $norm['workoutName'] ?? 'Treino Importado';
                $key = "{$targetStudentId}::{$planName}";

                if (!isset($plansGrouped[$key])) {
                    $plansGrouped[$key] = [
                        'student_id' => $targetStudentId,
                        'name' => $planName,
                        'items' => [],
                    ];
                }
                $plansGrouped[$key]['items'][] = $item;
            }

            foreach ($plansGrouped as $group) {
                $planId = 'plan-' . Str::random(10);
                $sessionId = 'session-' . Str::random(10);
                $versionId = 'ver-' . Str::random(10);

                // Treino entra como rascunho (Regra fundamental)
                $plan = TrainingPlan::create([
                    'id' => $planId,
                    'student_id' => $group['student_id'],
                    'trainer_id' => $trainerId,
                    'name' => $group['name'],
                    'objective' => 'Hipertrofia e Condicionamento',
                    'status' => 'rascunho',
                    'version' => 1,
                    'start_at' => now()->toDateString(),
                    'valid_until' => now()->addDays(60)->toDateString(),
                    'frequency_per_week' => 3,
                    'notes' => "Importado via Central de Migração (Lote: {$batch->id})",
                ]);

                $session = TrainingSession::create([
                    'id' => $sessionId,
                    'plan_id' => $planId,
                    'student_id' => $group['student_id'],
                    'trainer_id' => $trainerId,
                    'status' => 'rascunho',
                    'active_version_id' => $versionId,
                ]);

                $sessionVersion = TrainingSessionVersion::create([
                    'id' => $versionId,
                    'session_id' => $sessionId,
                    'version' => 1,
                    'status' => 'draft',
                    'name' => 'Treino A',
                    'identifier' => 'Treino A',
                    'level' => 'intermediario',
                    'estimated_duration_minutes' => 60,
                    'order' => 1,
                ]);

                $orderIdx = 1;
                foreach ($group['items'] as $wItem) {
                    $wNorm = $wItem->normalized_data ?? [];
                    $exerciseName = $wNorm['exerciseName'] ?? 'Exercício';
                    $matched = $this->exerciseMatcher->match($exerciseName, $trainerId);

                    TrainingExercisePrescription::create([
                        'id' => 'presc-' . Str::random(10),
                        'version_id' => $versionId,
                        'exercise_catalog_id' => $matched['catalog_id'],
                        'name' => $exerciseName,
                        'type' => 'main',
                        'muscle_group' => $wNorm['muscleGroup'] ?? 'Geral',
                        'order' => $wNorm['order'] ?? $orderIdx++,
                        'planned_sets' => $wNorm['plannedSets'] ?? 3,
                        'planned_reps' => is_numeric($wNorm['plannedReps'] ?? null) ? intval($wNorm['plannedReps']) : 10,
                        'planned_load' => $wNorm['plannedLoad'] ?? null,
                        'load_unit' => 'kg',
                        'rest_seconds' => $wNorm['restSeconds'] ?? 60,
                        'tempo' => $wNorm['tempo'] ?? null,
                        'observation' => $wNorm['observation'] ?? null,
                    ]);

                    $wItem->destination_id = $planId;
                    $wItem->imported_at = now();
                    $wItem->save();
                }

                $summary['workouts_created']++;
            }

            // 3. Processar Arquivos e Documentos Legados
            $fileItems = $items->whereIn('item_type', [MigrationItem::TYPE_DOCUMENT, MigrationItem::TYPE_PHOTO]);
            foreach ($fileItems as $fItem) {
                $fNorm = $fItem->normalized_data ?? [];
                $targetStudentId = $studentMap[mb_strtolower(trim($fNorm['studentName'] ?? ''))] ?? null;

                if ($targetStudentId) {
                    $legacyId = 'leg-' . Str::random(10);
                    LegacyImportedFile::create([
                        'id' => $legacyId,
                        'student_id' => $targetStudentId,
                        'trainer_id' => $trainerId,
                        'migration_batch_id' => $batch->id,
                        'category' => $fItem->item_type === MigrationItem::TYPE_PHOTO ? LegacyImportedFile::CATEGORY_PHOTO : LegacyImportedFile::CATEGORY_DOCUMENT,
                        'original_name' => $fNorm['fileName'] ?? 'documento_legado',
                        'stored_path' => $fNorm['storedPath'] ?? 'private/migrations/doc',
                        'file_size' => $fNorm['fileSize'] ?? 1024,
                        'mime_type' => $fNorm['mimeType'] ?? 'application/octet-stream',
                        'source_platform' => $batch->source,
                        'notes' => $fNorm['notes'] ?? null,
                    ]);

                    $fItem->destination_id = $legacyId;
                    $fItem->imported_at = now();
                    $fItem->save();
                    $summary['legacy_files_created']++;
                }
            }

            // 4. Finalizar Lote
            $batch->status = MigrationBatch::STATUS_COMPLETED;
            $batch->completed_at = now();
            $batch->rollback_until = now()->addDays(7);
            $batch->execution_summary = $summary;
            $batch->imported_items = $summary['students_created'] + $summary['students_linked'] + $summary['workouts_created'] + $summary['legacy_files_created'];
            $batch->save();

            AuditLog::create([
                'id' => 'audit-' . Str::random(10),
                'action' => 'migration_confirmed',
                'actor_id' => $trainerId,
                'actor_role' => 'TRAINER',
                'target_id' => $batch->id,
                'details' => json_encode($summary),
            ]);

            DB::commit();

            return $summary;
        } catch (Exception $e) {
            DB::rollBack();
            $batch->status = MigrationBatch::STATUS_FAILED;
            $batch->save();
            throw $e;
        }
    }

    /**
     * Reverte de forma cirúrgica todos os registros gerados pelo lote.
     */
    public function rollback(MigrationBatch $batch, ?string $reason = null): bool
    {
        if (!$batch->canRollback()) {
            throw new RuntimeException("Este lote não pode mais ser desfeito (prazo expirado ou status inválido).");
        }

        DB::beginTransaction();

        try {
            $items = MigrationItem::where('batch_id', $batch->id)
                ->whereNotNull('destination_id')
                ->get();

            $studentIdsToDelete = [];
            $planIdsToDelete = [];
            $legacyIdsToDelete = [];

            foreach ($items as $item) {
                if ($item->item_type === MigrationItem::TYPE_STUDENT && $item->review_decision !== MigrationItem::DECISION_LINK_EXISTING) {
                    $studentIdsToDelete[] = $item->destination_id;
                } elseif ($item->item_type === MigrationItem::TYPE_WORKOUT) {
                    $planIdsToDelete[] = $item->destination_id;
                } elseif (in_array($item->item_type, [MigrationItem::TYPE_DOCUMENT, MigrationItem::TYPE_PHOTO])) {
                    $legacyIdsToDelete[] = $item->destination_id;
                }
            }

            // Deletar planos de treino criados pelo lote
            if (!empty($planIdsToDelete)) {
                $sessionIds = TrainingSession::whereIn('plan_id', $planIdsToDelete)->pluck('id')->toArray();
                $versionIds = TrainingSessionVersion::whereIn('session_id', $sessionIds)->pluck('id')->toArray();

                TrainingExercisePrescription::whereIn('version_id', $versionIds)->delete();
                TrainingSessionVersion::whereIn('id', $versionIds)->delete();
                TrainingSession::whereIn('id', $sessionIds)->delete();
                TrainingPlan::whereIn('id', $planIdsToDelete)->delete();
            }

            // Deletar arquivos legados criados pelo lote
            if (!empty($legacyIdsToDelete)) {
                LegacyImportedFile::whereIn('id', $legacyIdsToDelete)->delete();
            }

            // Deletar alunos criados pelo lote
            if (!empty($studentIdsToDelete)) {
                TrainerStudent::where('trainer_id', $batch->trainer_id)
                    ->whereIn('student_id', $studentIdsToDelete)
                    ->delete();
                StudentProfile::whereIn('id', $studentIdsToDelete)->delete();
            }

            $batch->status = MigrationBatch::STATUS_ROLLED_BACK;
            $batch->rolled_back_at = now();
            $batch->rollback_reason = $reason ?: 'Reversão solicitada pelo personal trainer';
            $batch->save();

            AuditLog::create([
                'id' => 'audit-' . Str::random(10),
                'action' => 'migration_rolled_back',
                'actor_id' => $batch->trainer_id,
                'actor_role' => 'TRAINER',
                'target_id' => $batch->id,
                'details' => json_encode([
                    'reason' => $batch->rollback_reason,
                    'students_removed' => count($studentIdsToDelete),
                    'plans_removed' => count($planIdsToDelete),
                ]),
            ]);

            DB::commit();

            return true;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}

