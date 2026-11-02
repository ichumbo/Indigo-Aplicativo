<?php

namespace Tests\Unit;

use App\Models\LegacyImportedFile;
use App\Models\MigrationBatch;
use App\Models\MigrationItem;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MigrationModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_batch_has_fillable_and_casts_and_relationships(): void
    {
        $trainer = User::create([
            'id' => 'user-trainer-test',
            'name' => 'Treinador Teste',
            'email' => 'treinador.teste@dragoncorp.app',
            'password' => 'secret',
            'role' => 'TRAINER',
        ]);

        $batch = MigrationBatch::create([
            'id' => 'mig-batch-12345',
            'trainer_id' => $trainer->id,
            'source' => 'spreadsheet',
            'status' => MigrationBatch::STATUS_UPLOADED,
            'source_files' => [
                [
                    'name' => 'alunos.xlsx',
                    'size' => 1024,
                    'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ],
            ],
            'column_mapping' => ['Nome' => 'fullName'],
            'total_items' => 10,
            'rollback_until' => now()->addDays(7),
        ]);

        $this->assertEquals($trainer->id, $batch->trainer->id);
        $this->assertIsArray($batch->source_files);
        $this->assertEquals('alunos.xlsx', $batch->source_files[0]['name']);
        $this->assertFalse($batch->canRollback()); // status is uploaded, cannot rollback yet

        $batch->status = MigrationBatch::STATUS_COMPLETED;
        $batch->save();
        $this->assertTrue($batch->canRollback());
    }

    public function test_migration_item_belongs_to_batch_and_has_json_casts(): void
    {
        $batch = MigrationBatch::create([
            'id' => 'mig-batch-999',
            'trainer_id' => 'user-trainer-test',
            'source' => 'mfit',
            'status' => MigrationBatch::STATUS_PARSED,
            'source_files' => [],
            'total_items' => 1,
        ]);

        $item = MigrationItem::create([
            'id' => 'mig-item-001',
            'batch_id' => $batch->id,
            'item_type' => 'student',
            'external_id' => 'ext-42',
            'raw_data' => ['nome' => 'Carlos Silva', 'telefone' => '11999998888'],
            'normalized_data' => ['fullName' => 'Carlos Silva', 'phone' => '11999998888'],
            'match_status' => MigrationItem::MATCH_NEW,
            'match_confidence' => 100,
            'warnings' => ['Observação teste'],
        ]);

        $this->assertEquals($batch->id, $item->batch->id);
        $this->assertIsArray($item->raw_data);
        $this->assertEquals('Carlos Silva', $item->raw_data['nome']);
        $this->assertIsArray($item->normalized_data);
        $this->assertIsArray($item->warnings);
    }

    public function test_legacy_imported_file_belongs_to_student_and_trainer(): void
    {
        $student = StudentProfile::create([
            'id' => 'std-100',
            'full_name' => 'Ana Beatriz',
            'main_goal' => 'Condicionamento',
        ]);

        $legacy = LegacyImportedFile::create([
            'id' => 'leg-001',
            'student_id' => $student->id,
            'trainer_id' => 'user-trainer-test',
            'category' => LegacyImportedFile::CATEGORY_WORKOUT_SHEET,
            'original_name' => 'ficha_antiga_mfit.pdf',
            'stored_path' => 'private/migrations/ficha.pdf',
            'file_size' => 204800,
            'mime_type' => 'application/pdf',
            'source_platform' => 'mfit',
            'conversion_status' => LegacyImportedFile::STATUS_RAW_PRESERVED,
        ]);

        $this->assertEquals($student->id, $legacy->student->id);
        $this->assertEquals('ficha_antiga_mfit.pdf', $legacy->original_name);
    }
}
