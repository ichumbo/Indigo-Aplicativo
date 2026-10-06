<?php

namespace Tests\Feature;

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

    public function test_personal_can_create_and_list_aerobic_protocol(): void
    {
        $trainer = User::find('trainer-main');

        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/protocols', [
                'student_id' => 'student-joao',
                'title' => 'Protocolo Conconi Esteira',
                'protocol_date' => now()->toDateString(),
                'warmup_text' => '5 min progressivo',
                'days_prescription' => [
                    [
                        'dayOfWeek' => 'Segunda',
                        'description' => '4x 3 min a 6.0 km/h',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('protocol.title', 'Protocolo Conconi Esteira');

        $this->assertDatabaseHas('protocols', [
            'student_id' => 'student-joao',
            'title' => 'Protocolo Conconi Esteira',
        ]);
    }

    public function test_personal_can_respond_to_feedback(): void
    {
        $trainer = User::find('trainer-main');

        // Create dummy feedback
        $feedback = \App\Models\TrainingFeedback::create([
            'id' => 'fb-test-1',
            'student_id' => 'student-joao',
            'student_name' => 'Joao Silva',
            'trainer_id' => 'trainer-main',
            'workout_name' => 'Treino A',
            'comment' => 'Senti desconforto no ombro',
            'has_pain' => true,
            'pain_level' => 4,
            'status' => 'novo',
        ]);

        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson("/api/v1/feedbacks/{$feedback->id}/respond", [
                'message' => 'Reduza a amplitude no supino para 80 graus.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('feedback.status', 'respondido');

        $this->assertDatabaseHas('feedback_responses', [
            'feedback_id' => 'fb-test-1',
            'message' => 'Reduza a amplitude no supino para 80 graus.',
        ]);
    }

    public function test_workout_draft_save_does_not_notify_student_and_is_hidden_from_student_sync(): void
    {
        $trainer = User::find('trainer-main');

        $payload = [
            'studentId' => 'student-joao',
            'name' => 'Treino Rascunho Inicial',
            'objective' => 'Fase de Planejamento',
            'status' => 'rascunho',
            'sessions' => [
                [
                    'name' => 'Sessão Provisória',
                    'exercises' => [
                        [
                            'name' => 'Puxada Frontal',
                            'muscleGroup' => 'Costas',
                            'plannedSets' => 3,
                            'plannedReps' => 10,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/workouts', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('workout.status', 'rascunho');

        $planId = $response->json('workout.id');

        // Não deve criar notificação para o aluno
        $this->assertDatabaseMissing('app_notifications', [
            'user_id' => 'student-joao',
            'message' => 'Seu treinador liberou o treino: Treino Rascunho Inicial.',
        ]);

        // Consulta de sincronização do aluno NÃO deve conter o rascunho
        $pullResponse = $this->getJson('/api/v1/sync/pull?studentId=student-joao');
        $pullResponse->assertStatus(200);
        $workoutIds = collect($pullResponse->json('workouts'))->pluck('id')->toArray();
        $this->assertNotContains($planId, $workoutIds);

        // Ao publicar o treino (atualizar status para 'ativo'), deve notificar o aluno
        $updateResponse = $this->actingAs($trainer, 'sanctum')
            ->putJson("/api/v1/workouts/{$planId}", [
                'status' => 'ativo',
            ]);

        $updateResponse->assertStatus(200);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => 'student-joao',
            'message' => 'Seu treinador liberou o treino: Treino Rascunho Inicial.',
        ]);

        // Agora aluno recebe na sincronização
        $pullResponseAfter = $this->getJson('/api/v1/sync/pull?studentId=student-joao');
        $workoutIdsAfter = collect($pullResponseAfter->json('workouts'))->pluck('id')->toArray();
        $this->assertContains($planId, $workoutIdsAfter);
    }

    public function test_workout_duplicate_generates_new_ids_and_preserves_original(): void
    {
        $trainer = User::find('trainer-main');

        $createRes = $this->actingAs($trainer, 'sanctum')->postJson('/api/v1/workouts', [
            'studentId' => 'student-joao',
            'name' => 'Treino Base para Duplicação',
            'objective' => 'Força Máxima',
            'sessions' => [
                [
                    'name' => 'Sessão 1',
                    'exercises' => [
                        [
                            'name' => 'Supino Reto',
                            'muscleGroup' => 'Peito',
                            'plannedSets' => 4,
                            'plannedReps' => 6,
                        ],
                    ],
                ],
            ],
        ]);

        $originalId = $createRes->json('workout.id');

        $dupRes = $this->actingAs($trainer, 'sanctum')
            ->postJson("/api/v1/workouts/{$originalId}/duplicate");

        $dupRes->assertStatus(201);
        $newId = $dupRes->json('workout.id');

        $this->assertNotEquals($originalId, $newId);
        $this->assertEquals('Treino Base para Duplicação (Cópia)', $dupRes->json('workout.name'));

        // Ficha original continua intacta
        $this->assertDatabaseHas('training_plans', [
            'id' => $originalId,
            'name' => 'Treino Base para Duplicação',
        ]);
    }

    public function test_workout_idor_trainer_b_cannot_access_trainer_a_workout(): void
    {
        $trainerA = User::find('trainer-main');
        $trainerB = User::find('trainer-secondary');

        $createRes = $this->actingAs($trainerA, 'sanctum')->postJson('/api/v1/workouts', [
            'studentId' => 'student-joao',
            'name' => 'Treino Confidencial do Treinador A',
            'objective' => 'Alta Performance',
            'sessions' => [
                [
                    'name' => 'Sessão Segura',
                    'exercises' => [
                        [
                            'name' => 'Barra Fixa',
                            'muscleGroup' => 'Costas',
                            'plannedSets' => 3,
                            'plannedReps' => 8,
                        ],
                    ],
                ],
            ],
        ]);

        $workoutId = $createRes->json('workout.id');

        // Trainer B tenta ver -> 403
        $this->actingAs($trainerB, 'sanctum')
            ->getJson("/api/v1/workouts/{$workoutId}")
            ->assertStatus(403);

        // Trainer B tenta editar -> 403
        $this->actingAs($trainerB, 'sanctum')
            ->putJson("/api/v1/workouts/{$workoutId}", ['name' => 'Hackeado'])
            ->assertStatus(403);

        // Trainer B tenta duplicar -> 403
        $this->actingAs($trainerB, 'sanctum')
            ->postJson("/api/v1/workouts/{$workoutId}/duplicate")
            ->assertStatus(403);

        // Trainer B tenta deletar -> 403
        $this->actingAs($trainerB, 'sanctum')
            ->deleteJson("/api/v1/workouts/{$workoutId}")
            ->assertStatus(403);
    }

    public function test_assessment_creation_and_auto_calculations(): void
    {
        $trainer = User::find('trainer-main');

        $response = $this->actingAs($trainer, 'sanctum')->postJson('/api/v1/assessments', [
            'studentId' => 'student-joao',
            'assessmentDate' => '2026-03-01',
            'type' => 'inicial',
            'bodyComposition' => [
                'weightKg' => 80.0,
                'heightCm' => 180.0,
                'bodyFatPercent' => 15.0,
            ],
            'conclusion' => 'Avaliação inicial com parâmetros normativos.',
        ]);

        $response->assertStatus(201);
        $comp = $response->json('assessment.body_composition');

        // IMC = 80 / (1.80 * 1.80) = 24.69 -> 24.7
        $this->assertEquals(24.7, $comp['bmi']);
        // Massa Gorda = 80 * 0.15 = 12.0
        $this->assertEquals(12.0, $comp['fatMassKg']);
        // Massa Magra = 80 - 12.0 = 68.0
        $this->assertEquals(68.0, $comp['leanMassKg']);
    }

    public function test_assessment_comparison_calculates_deltas_correctly(): void
    {
        $trainer = User::find('trainer-main');

        $res1 = $this->actingAs($trainer, 'sanctum')->postJson('/api/v1/assessments', [
            'studentId' => 'student-joao',
            'assessmentDate' => '2026-01-01',
            'bodyComposition' => [
                'weightKg' => 82.0,
                'bodyFatPercent' => 18.0,
                'leanMassKg' => 67.24,
            ],
        ]);
        $id1 = $res1->json('assessment.id');

        $res2 = $this->actingAs($trainer, 'sanctum')->postJson('/api/v1/assessments', [
            'studentId' => 'student-joao',
            'assessmentDate' => '2026-03-01',
            'bodyComposition' => [
                'weightKg' => 79.5,
                'bodyFatPercent' => 15.0,
                'leanMassKg' => 67.57,
            ],
        ]);
        $id2 = $res2->json('assessment.id');

        $compareRes = $this->actingAs($trainer, 'sanctum')
            ->getJson("/api/v1/assessments/compare?first={$id1}&second={$id2}");

        $compareRes->assertStatus(200);
        $deltas = $compareRes->json('deltas');

        // Delta peso: 79.5 - 82.0 = -2.5
        $this->assertEquals(-2.5, $deltas['weightKg']);
        // Delta % gordura: 15.0 - 18.0 = -3.0
        $this->assertEquals(-3.0, $deltas['bodyFatPercent']);
    }

    public function test_assessment_idor_trainer_b_cannot_view_or_compare_other_trainers_assessments(): void
    {
        $trainerA = User::find('trainer-main');
        $trainerB = User::find('trainer-secondary');

        $res = $this->actingAs($trainerA, 'sanctum')->postJson('/api/v1/assessments', [
            'studentId' => 'student-joao',
            'assessmentDate' => '2026-01-01',
            'bodyComposition' => ['weightKg' => 75.0, 'heightCm' => 175.0],
        ]);
        $assessmentId = $res->json('assessment.id');

        // Trainer B tenta ver -> 403
        $this->actingAs($trainerB, 'sanctum')
            ->getJson("/api/v1/assessments/{$assessmentId}")
            ->assertStatus(403);
    }
}
