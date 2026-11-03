<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\MigrationBatch;
use App\Models\MigrationItem;
use App\Models\StudentProfile;
use App\Models\Subscription;
use App\Models\TrainerStudent;
use App\Models\TrainingPlan;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class FullMigrationE2ETest extends TestCase
{
    use RefreshDatabase;

    private User $trainer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->trainer = User::create([
            'id' => 'trainer-e2e-super',
            'name' => 'Treinador E2E',
            'email' => 'trainer.e2e@dragoncorp.app',
            'password' => '123456',
            'role' => 'TRAINER',
        ]);

        Subscription::create([
            'id' => 'sub-e2e',
            'user_id' => $this->trainer->id,
            'plan_id' => 'pro',
            'status' => 'active',
            'student_limit' => 9999,
        ]);
    }

    public function test_complete_migration_lifecycle_from_upload_to_rollback(): void
    {
        // 1. Upload de planilha com 2 alunos
        $csvContent = "\xEF\xBB\xBF" . "nome_completo;email;telefone;objetivo_principal\n" .
            "Gabriel Siqueira;gabriel@teste.com;11977778888;Hipertrofia\n" .
            "Larissa Manoela;larissa@teste.com;21966665555;Condicionamento\n";

        $file = UploadedFile::fake()->createWithContent('alunos_e2e.csv', $csvContent);

        $uploadResponse = $this->actingAs($this->trainer)
            ->postJson('/api/v1/migrations/upload', [
                'source' => 'spreadsheet',
                'file' => $file,
            ]);

        $uploadResponse->assertStatus(201);
        $batchId = $uploadResponse->json('batch.id');

        // 2. Consulta itens de staging
        $itemsResponse = $this->actingAs($this->trainer)
            ->getJson("/api/v1/migrations/{$batchId}/items");

        $itemsResponse->assertStatus(200);
        $this->assertCount(2, $itemsResponse->json('data'));

        // 3. Simula adição de um item de treino para o Gabriel
        MigrationItem::create([
            'id' => 'item-wrk-e2e-1',
            'batch_id' => $batchId,
            'item_type' => 'workout',
            'raw_data' => ['exercicio' => 'Agachamento Livre'],
            'normalized_data' => [
                'studentName' => 'Gabriel Siqueira',
                'workoutName' => 'Treino de Força',
                'sessionName' => 'Membros Inferiores',
                'sessionIdentifier' => 'Treino A',
                'exerciseName' => 'Agachamento Livre',
                'muscleGroup' => 'Pernas',
                'order' => 1,
                'plannedSets' => 4,
                'plannedReps' => '8',
                'plannedLoad' => 80.0,
            ],
            'match_status' => 'new',
            'review_decision' => 'create_new',
        ]);

        // 4. Confirmação do Lote
        $confirmResponse = $this->actingAs($this->trainer)
            ->postJson("/api/v1/migrations/{$batchId}/confirm");

        $confirmResponse->assertStatus(200);
        $confirmResponse->assertJson(['success' => true]);

        // Verifica que os alunos foram criados com convite pendente
        $gabriel = StudentProfile::where('full_name', 'Gabriel Siqueira')->first();
        $this->assertNotNull($gabriel);
        $this->assertDatabaseHas('trainer_students', [
            'trainer_id' => $this->trainer->id,
            'student_id' => $gabriel->id,
            'invite_status' => 'pending',
        ]);

        // Verifica que o treino foi criado como rascunho
        $this->assertDatabaseHas('training_plans', [
            'student_id' => $gabriel->id,
            'name' => 'Treino de Força',
            'status' => 'rascunho',
        ]);

        // Verifica auditoria
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'migration_confirmed',
            'target_id' => $batchId,
        ]);

        // 5. Execução do Rollback
        $rollbackResponse = $this->actingAs($this->trainer)
            ->postJson("/api/v1/migrations/{$batchId}/rollback", [
                'reason' => 'Teste de auditoria e validação',
            ]);

        $rollbackResponse->assertStatus(200);
        $rollbackResponse->assertJson(['success' => true]);

        // Valida que os alunos e treinos foram removidos
        $this->assertDatabaseMissing('student_profiles', [
            'id' => $gabriel->id,
        ]);
        $this->assertDatabaseMissing('training_plans', [
            'student_id' => $gabriel->id,
        ]);

        // Valida que o lote foi marcado como desfeito
        $this->assertDatabaseHas('migration_batches', [
            'id' => $batchId,
            'status' => MigrationBatch::STATUS_ROLLED_BACK,
            'rollback_reason' => 'Teste de auditoria e validação',
        ]);
    }
}

