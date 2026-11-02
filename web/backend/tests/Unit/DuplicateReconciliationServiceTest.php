<?php

namespace Tests\Unit;

use App\Models\Exercise;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\User;
use App\Services\Migration\DuplicateReconciliationService;
use App\Services\Migration\ExerciseMatcherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DuplicateReconciliationServiceTest extends TestCase
{
    use RefreshDatabase;

    private DuplicateReconciliationService $reconciliationService;
    private ExerciseMatcherService $exerciseMatcher;
    private User $trainer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->reconciliationService = new DuplicateReconciliationService();
        $this->exerciseMatcher = new ExerciseMatcherService();

        $this->trainer = User::create([
            'id' => 'trainer-rec-1',
            'name' => 'Treinador Teste',
            'email' => 'trainer.rec@dragoncorp.app',
            'password' => 'secret',
            'role' => 'TRAINER',
        ]);
    }

    public function test_identifies_exact_match_by_email(): void
    {
        // Aluno já existente do personal
        $student = StudentProfile::create([
            'id' => 'std-existente-1',
            'full_name' => 'Ana Clara Santos',
            'contact' => ['email' => 'ana.clara@teste.com', 'phone' => '11988887777'],
            'main_goal' => 'Emagrecimento',
        ]);
        TrainerStudent::create([
            'id' => 'ts-1',
            'trainer_id' => $this->trainer->id,
            'student_id' => $student->id,
            'status' => 'ACTIVE',
        ]);

        $incoming = [
            'fullName' => 'Ana C. Santos',
            'email' => 'ANA.CLARA@TESTE.COM',
        ];

        $result = $this->reconciliationService->reconcileStudent($incoming, $this->trainer->id);

        $this->assertEquals('exact_match', $result['match_status']);
        $this->assertEquals(100, $result['match_confidence']);
        $this->assertEquals($student->id, $result['matched_entity_id']);
    }

    public function test_identifies_homonym_as_conflict_and_does_not_auto_merge(): void
    {
        // Aluno existente com mesmo nome mas outro e-mail
        $student = StudentProfile::create([
            'id' => 'std-homonimo',
            'full_name' => 'Roberto Carlos',
            'contact' => ['email' => 'roberto.cantor@teste.com', 'phone' => '11999990000'],
            'main_goal' => 'Hipertrofia',
        ]);
        TrainerStudent::create([
            'id' => 'ts-2',
            'trainer_id' => $this->trainer->id,
            'student_id' => $student->id,
            'status' => 'ACTIVE',
        ]);

        $incoming = [
            'fullName' => 'Roberto Carlos',
            'email' => 'roberto.jogador@teste.com',
            'phone' => '21988881111',
        ];

        $result = $this->reconciliationService->reconcileStudent($incoming, $this->trainer->id);

        $this->assertEquals('conflict', $result['match_status']);
        $this->assertLessThanOrEqual(60, $result['match_confidence']);
        $this->assertEquals('create_new', $result['suggested_decision']);
        $this->assertStringContainsString('Homônimo detectado', $result['warnings'][0]);
    }

    public function test_exercise_matcher_matches_exact_or_alias(): void
    {
        Exercise::create([
            'id' => 'ex-supino-reto',
            'name' => 'Supino Reto',
            'category' => 'Peitoral',
            'muscle_groups' => ['Peitoral', 'Tríceps', 'Deltóide'],
            'is_system' => true,
        ]);

        // Teste com alias popular
        $match = $this->exerciseMatcher->match('supino reto barra', $this->trainer->id);
        $this->assertEquals('ex-supino-reto', $match['catalog_id']);
        $this->assertGreaterThanOrEqual(85, $match['confidence']);
    }

    public function test_exercise_matcher_handles_unknown_exercise_as_custom(): void
    {
        $match = $this->exerciseMatcher->match('Alongamento Específico de Psoas com Elástico', $this->trainer->id);

        $this->assertNull($match['catalog_id']);
        $this->assertTrue($match['is_custom']);
        $this->assertLessThan(60, $match['confidence']);
    }
}
