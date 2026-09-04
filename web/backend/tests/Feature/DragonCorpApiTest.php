<?php

namespace Tests\Feature;

use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DragonCorpApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_personal_trainer_can_login_with_mobile_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'treinador@dragoncorp.app',
            'password' => '123456',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']])
            ->assertJsonPath('user.email', 'treinador@dragoncorp.app')
            ->assertJsonPath('user.role', 'TRAINER');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'treinador@dragoncorp.app',
            'password' => 'senha_errada',
        ]);

        $response->assertStatus(401);
    }

    public function test_personal_can_list_their_students(): void
    {
        $trainer = User::find('trainer-main');

        $response = $this->actingAs($trainer, 'sanctum')
            ->getJson('/api/v1/students');

        $response->assertStatus(200)
            ->assertJsonStructure(['students', 'total'])
            ->assertJsonFragment(['full_name' => 'Joao Silva']);
    }

    public function test_idor_protection_trainer_cannot_access_other_trainers_student(): void
    {
        $trainer = User::find('trainer-main');
        // 'student-isolated' pertence ao 'trainer-secondary'
        $response = $this->actingAs($trainer, 'sanctum')
            ->getJson('/api/v1/students/student-isolated');

        // Obrigatório: HTTP 403 Forbidden
        $response->assertStatus(403);
    }

    public function test_personal_can_create_workout_transactionally_with_bi_set(): void
    {
        $trainer = User::find('trainer-main');

        $payload = [
            'studentId' => 'student-joao',
            'name' => 'Treino C - Pernas e Glúteos',
            'objective' => 'Hipertrofia de Quadríceps e Posteriores',
            'frequencyPerWeek' => 4,
            'sessions' => [
                [
                    'name' => 'Sessão Inferiores Foco Anterior',
                    'identifier' => 'Treino C',
                    'muscleGroups' => ['Membros Inferiores', 'Glúteos'],
                    'exercises' => [
                        [
                            'name' => 'Agachamento Livre com Barra',
                            'muscleGroup' => 'Membros Inferiores',
                            'plannedSets' => 4,
                            'plannedReps' => 8,
                            'plannedLoad' => 100.0,
                            'restSeconds' => 120,
                        ],
                        [
                            'name' => 'Cadeira Extensora',
                            'muscleGroup' => 'Membros Inferiores',
                            'combinationId' => 'biset-pernas',
                            'combinationLabel' => 'BI-SET C',
                            'plannedSets' => 3,
                            'plannedReps' => 12,
                            'plannedLoad' => 60.0,
                            'restSeconds' => 0,
                        ],
                        [
                            'name' => 'Agachamento Búlgaro',
                            'muscleGroup' => 'Membros Inferiores',
                            'combinationId' => 'biset-pernas',
                            'combinationLabel' => 'BI-SET C',
                            'plannedSets' => 3,
                            'plannedReps' => 10,
                            'plannedLoad' => 20.0,
                            'restSeconds' => 90,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/workouts', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('workout.name', 'Treino C - Pernas e Glúteos');

        $this->assertDatabaseHas('training_plans', [
            'student_id' => 'student-joao',
            'name' => 'Treino C - Pernas e Glúteos',
        ]);

        $this->assertDatabaseHas('training_exercise_prescriptions', [
            'name' => 'Agachamento Livre com Barra',
            'planned_load' => 100.0,
        ]);
    }

    public function test_sync_push_from_mobile_records_executed_load(): void
    {
        $response = $this->postJson('/api/v1/sync/push', [
            'executedSets' => [
                [
                    'id' => 'test-exec-mobile-1',
                    'studentId' => 'student-joao',
                    'exerciseId' => 'sys-sup-1',
                    'exerciseName' => 'Supino Reto com Barra',
                    'executedLoad' => 90.0,
                    'executedReps' => 8,
                    'loadUnit' => 'kg',
                ],
            ],
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('training_executed_sets', [
            'id' => 'test-exec-mobile-1',
            'student_id' => 'student-joao',
            'executed_load' => 90.0,
        ]);
    }
}
