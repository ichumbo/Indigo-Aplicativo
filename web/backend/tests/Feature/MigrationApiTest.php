<?php

namespace Tests\Feature;

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

class MigrationApiTest extends TestCase
{
    use RefreshDatabase;

    private User $trainer;
    private User $otherTrainer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->trainer = User::create([
            'id' => 'trainer-api-1',
            'name' => 'Treinador Alfa',
            'email' => 'alfa@dragoncorp.app',
            'password' => '123456',
            'role' => 'TRAINER',
        ]);

        Subscription::create([
            'id' => 'sub-alfa',
            'user_id' => $this->trainer->id,
            'plan_id' => 'pro',
            'status' => 'active',
            'student_limit' => 9999,
        ]);

        $this->otherTrainer = User::create([
            'id' => 'trainer-api-2',
            'name' => 'Treinador Beta',
            'email' => 'beta@dragoncorp.app',
            'password' => '123456',
            'role' => 'TRAINER',
        ]);
    }

    public function test_can_download_official_csv_templates(): void
    {
        $response = $this->actingAs($this->trainer)
            ->get('/api/v1/migrations/templates/students');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('nome_completo', $response->streamedContent());
    }

    public function test_can_upload_student_spreadsheet_and_creates_staging_items(): void
    {
        $csvContent = "nome_completo;email;telefone;objetivo_principal\n" .
            "Bruno Magalhães;bruno@teste.com;11999998888;Hipertrofia\n" .
            "Camila Nogueira;camila@teste.com;21988887777;Emagrecimento\n";

        $file = UploadedFile::fake()->createWithContent('alunos.csv', $csvContent);

        $response = $this->actingAs($this->trainer)
            ->postJson('/api/v1/migrations/upload', [
                'source' => 'spreadsheet',
                'file' => $file,
            ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'batch' => ['id', 'status', 'total_items', 'source'],
        ]);

        $batchId = $response->json('batch.id');
        $this->assertDatabaseHas('migration_batches', [
            'id' => $batchId,
            'trainer_id' => $this->trainer->id,
            'total_items' => 2,
        ]);

        $this->assertDatabaseHas('migration_items', [
            'batch_id' => $batchId,
            'item_type' => 'student',
        ]);
    }

    public function test_prevents_idor_access_between_trainers(): void
    {
        $batch = MigrationBatch::create([
            'id' => 'batch-alfa-secret',
            'trainer_id' => $this->trainer->id,
            'source' => 'spreadsheet',
            'status' => MigrationBatch::STATUS_PARSED,
            'source_files' => [],
            'total_items' => 1,
        ]);

        // Outro treinador tenta visualizar o lote do Alfa
        $response = $this->actingAs($this->otherTrainer)
            ->getJson("/api/v1/migrations/{$batch->id}");

        $response->assertStatus(403);
    }

    public function test_confirms_migration_and_creates_real_students_and_draft_workouts(): void
    {
        $batch = MigrationBatch::create([
            'id' => 'batch-confirm-test',
            'trainer_id' => $this->trainer->id,
            'source' => 'spreadsheet',
            'status' => MigrationBatch::STATUS_AWAITING_REVIEW,
            'source_files' => [],
            'total_items' => 2,
        ]);

        // Item 1: Aluno
        MigrationItem::create([
            'id' => 'item-std-1',
            'batch_id' => $batch->id,
            'item_type' => 'student',
            'raw_data' => ['nome' => 'Felipe Miranda'],
            'normalized_data' => [
                'fullName' => 'Felipe Miranda',
                'email' => 'felipe.miranda@teste.com',
                'phone' => '11988880000',
                'mainGoal' => 'Hipertrofia',
            ],
            'match_status' => 'new',
            'review_decision' => 'create_new',
        ]);

        // Item 2: Treino
        MigrationItem::create([
            'id' => 'item-wrk-1',
            'batch_id' => $batch->id,
            'item_type' => 'workout',
            'raw_data' => ['exercicio' => 'Supino Reto'],
            'normalized_data' => [
                'studentName' => 'Felipe Miranda',
                'workoutName' => 'Fase 1 - Adaptação',
                'sessionName' => 'Peitoral e Braços',
                'sessionIdentifier' => 'Treino A',
                'exerciseName' => 'Supino Reto',
                'muscleGroup' => 'Peitoral',
                'order' => 1,
                'plannedSets' => 3,
                'plannedReps' => '10',
                'plannedLoad' => 20,
            ],
            'match_status' => 'new',
            'review_decision' => 'create_new',
        ]);

        $response = $this->actingAs($this->trainer)
            ->postJson("/api/v1/migrations/{$batch->id}/confirm");

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verifica que o aluno foi criado na tabela real com convite pendente
        $this->assertDatabaseHas('student_profiles', [
            'full_name' => 'Felipe Miranda',
            'status' => 'ativo',
        ]);

        $createdStudent = StudentProfile::where('full_name', 'Felipe Miranda')->first();
        $this->assertDatabaseHas('trainer_students', [
            'trainer_id' => $this->trainer->id,
            'student_id' => $createdStudent->id,
            'invite_status' => 'pending',
        ]);

        // Verifica que o treino foi criado como rascunho
        $this->assertDatabaseHas('training_plans', [
            'student_id' => $createdStudent->id,
            'trainer_id' => $this->trainer->id,
            'name' => 'Fase 1 - Adaptação',
            'status' => 'rascunho',
        ]);

        // Testa o Rollback seguro
        $rollbackResponse = $this->actingAs($this->trainer)
            ->postJson("/api/v1/migrations/{$batch->id}/rollback", [
                'reason' => 'Erro de digitação nos arquivos de teste',
            ]);

        $rollbackResponse->assertStatus(200);

        // Confirma que os registros criados pelo lote foram desfeitos
        $this->assertDatabaseMissing('student_profiles', [
            'id' => $createdStudent->id,
        ]);
        $this->assertDatabaseMissing('training_plans', [
            'student_id' => $createdStudent->id,
        ]);

        // Confirma que o status do lote foi atualizado para rolled_back
        $this->assertDatabaseHas('migration_batches', [
            'id' => $batch->id,
            'status' => MigrationBatch::STATUS_ROLLED_BACK,
        ]);
    }

    public function test_blocks_migration_when_freemium_limit_exceeded(): void
    {
        // Treinador no plano FREE
        $freeTrainer = User::create([
            'id' => 'trainer-free-user',
            'name' => 'Treinador Free',
            'email' => 'free@dragoncorp.app',
            'password' => '123456',
            'role' => 'TRAINER',
        ]);

        Subscription::create([
            'id' => 'sub-free',
            'user_id' => $freeTrainer->id,
            'plan_id' => 'free',
            'status' => 'active',
            'student_limit' => 1,
        ]);

        // Já possui 1 aluno ativo (limite do Free)
        $existing = StudentProfile::create([
            'id' => 'std-free-existing',
            'full_name' => 'Aluno Existente',
            'main_goal' => 'Geral',
        ]);
        TrainerStudent::create([
            'id' => 'ts-free-1',
            'trainer_id' => $freeTrainer->id,
            'student_id' => $existing->id,
            'status' => 'ACTIVE',
        ]);

        // Cria lote com mais 2 novos alunos
        $batch = MigrationBatch::create([
            'id' => 'batch-free-overflow',
            'trainer_id' => $freeTrainer->id,
            'source' => 'spreadsheet',
            'status' => MigrationBatch::STATUS_AWAITING_REVIEW,
            'source_files' => [],
            'total_items' => 2,
        ]);

        MigrationItem::create([
            'id' => 'item-f-1',
            'batch_id' => $batch->id,
            'item_type' => 'student',
            'raw_data' => ['nome' => 'Novo Aluno 1'],
            'normalized_data' => ['fullName' => 'Novo Aluno 1'],
            'match_status' => 'new',
            'review_decision' => 'create_new',
        ]);

        $response = $this->actingAs($freeTrainer)
            ->postJson("/api/v1/migrations/{$batch->id}/confirm");

        $response->assertStatus(403);
        $response->assertJson([
            'code' => 'LIMIT_EXCEEDED',
        ]);
    }
}

