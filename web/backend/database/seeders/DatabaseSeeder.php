<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\TrainerProfile;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\Exercise;
use App\Models\TrainingPlan;
use App\Models\TrainingSession;
use App\Models\TrainingSessionVersion;
use App\Models\TrainingExercisePrescription;
use App\Models\TrainingExecutedSet;
use App\Models\PhysicalAssessment;
use App\Models\TrainingFeedback;
use App\Models\FeedbackResponse;
use App\Models\ChatMessage;
use App\Models\AppNotification;
use App\Models\Subscription;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Treinador Principal (DEMO_TRAINER)
        $trainer = User::updateOrCreate(
            ['id' => 'trainer-main'],
            [
                'name' => 'Personal DragonCorp',
                'email' => 'treinador@dragoncorp.app',
                'password' => Hash::make('123456'),
                'cpf' => '00000000000',
                'phone' => '(11) 90000-0000',
                'role' => 'TRAINER',
                'status' => 'ACTIVE',
                'professional_id' => 'CREF 123456-G/SP',
                'trainer_code' => 'DRG-PRO-REV',
                'cref_verification_status' => 'verified_manual',
                'is_email_verified' => true,
                'email_verified_at' => now(),
                'last_access_at' => now(),
            ]
        );

        TrainerProfile::updateOrCreate(
            ['id' => 'profile-trainer-main'],
            [
                'user_id' => $trainer->id,
                'cref_number' => '123456-G',
                'cref_state' => 'SP',
                'cref_verification_status' => 'verified_manual',
                'bio' => 'Especialista em Fisiologia do Exercício, Hipertrofia e Reabilitação de Lesões. Atendimento de alta performance.',
                'specialties' => ['Hipertrofia', 'Emagrecimento', 'Força', 'Reabilitação'],
                'service_type' => 'both',
                'experience_years' => 8,
                'city' => 'São Paulo',
                'state' => 'SP',
                'address' => 'Av. Paulista, 1000',
                'instagram' => '@personaldragoncorp',
                'working_hours' => 'Segunda a Sexta das 06:00 às 21:00',
                'status' => 'active',
            ]
        );

        Subscription::updateOrCreate(
            ['id' => 'sub-trainer-main'],
            [
                'user_id' => $trainer->id,
                'plan_id' => 'pro',
                'status' => 'active',
                'current_period_start' => now()->subDays(15),
                'current_period_end' => now()->addDays(350),
                'student_limit' => 9999,
            ]
        );

        // Treinador Secundário para testes de Isolamento (IDOR)
        $trainerSecondary = User::updateOrCreate(
            ['id' => 'trainer-secondary'],
            [
                'name' => 'Treinador Concorrente',
                'email' => 'outro_treinador@dragoncorp.app',
                'password' => Hash::make('123456'),
                'cpf' => '88888888888',
                'phone' => '(21) 98888-8888',
                'role' => 'TRAINER',
                'status' => 'ACTIVE',
                'professional_id' => 'CREF 999999-G/RJ',
                'is_email_verified' => true,
            ]
        );

        // 2. Aluno Principal (DEMO_STUDENT - João Silva)
        $studentUser = User::updateOrCreate(
            ['id' => 'student-joao'],
            [
                'name' => 'Joao Silva',
                'email' => 'aluno@dragoncorp.app',
                'password' => Hash::make('123456'),
                'cpf' => '11111111111',
                'phone' => '(11) 98765-4321',
                'role' => 'STUDENT',
                'status' => 'ACTIVE',
                'is_email_verified' => true,
                'email_verified_at' => now(),
            ]
        );

        $studentProfile = StudentProfile::updateOrCreate(
            ['id' => 'student-joao'],
            [
                'user_id' => $studentUser->id,
                'full_name' => 'Joao Silva',
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                'birth_date' => '1995-06-15',
                'gender' => 'male',
                'main_goal' => 'Hipertrofia com foco em ombros e dorsais',
                'secondary_goals' => ['Condicionamento', 'Redução de gordura visceral'],
                'profession' => 'Engenheiro de Software',
                'address' => 'Rua Augusta, 500, Apto 42 - SP',
                'contact' => [
                    'phone' => '(11) 98765-4321',
                    'whatsapp' => '(11) 98765-4321',
                    'email' => 'aluno@dragoncorp.app',
                    'emergencyName' => 'Maria Silva',
                    'emergencyPhone' => '(11) 97777-6666',
                ],
                'status' => 'ativo',
                'administrative_notes' => 'Aluno dedicado, treina no horário da manhã. Cuidado com ombro direito acima de 90°.',
                'anamnesis' => [
                    'sleepQuality' => 'boa',
                    'stressLevel' => 'moderado',
                    'waterIntakeLiters' => 3.0,
                    'sportsHistory' => 'Futebol recreativo aos fins de semana',
                    'currentPain' => true,
                    'currentPainDetails' => 'Leve desconforto no manguito rotador direito em supino inclinado pesado',
                ],
                'follow_up_summary' => [
                    'startedAt' => now()->subMonths(4)->toIso8601String(),
                    'lastActivityAt' => now()->subDays(1)->toIso8601String(),
                    'lastTrainingAt' => now()->subDays(1)->toIso8601String(),
                    'plannedTrainingFrequency' => 4,
                    'completedTrainingFrequency' => 4,
                    'currentWorkoutName' => 'ELITE - Program',
                    'adherencePercent' => 92,
                ],
                'private_trainer_notes' => [
                    'Aquecimento prévio com elástico obrigatório para manguito rotador.',
                    'Subir carga no Deadlift apenas com barra limpa e técnica validada.',
                ],
            ]
        );

        TrainerStudent::updateOrCreate(
            ['id' => 'relationship-demo-trainer-student'],
            [
                'trainer_id' => $trainer->id,
                'student_id' => $studentProfile->id,
                'status' => 'ACTIVE',
                'started_at' => now()->subMonths(4),
            ]
        );

        // Aluno 2 - Mariana Souza (Aluna Ativa)
        $studentProfile2 = StudentProfile::updateOrCreate(
            ['id' => 'student-mariana'],
            [
                'full_name' => 'Mariana Souza',
                'avatar' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
                'birth_date' => '1998-11-20',
                'gender' => 'female',
                'main_goal' => 'Definição muscular e glúteos',
                'secondary_goals' => ['Ganho de massa magra em membros inferiores'],
                'profession' => 'Arquiteta',
                'contact' => [
                    'phone' => '(11) 91234-5678',
                    'whatsapp' => '(11) 91234-5678',
                    'email' => 'mariana.souza@gmail.com',
                ],
                'status' => 'ativo',
                'follow_up_summary' => [
                    'startedAt' => now()->subMonths(2)->toIso8601String(),
                    'lastActivityAt' => now()->subHours(5)->toIso8601String(),
                    'plannedTrainingFrequency' => 5,
                    'completedTrainingFrequency' => 5,
                    'adherencePercent' => 96,
                ],
            ]
        );

        TrainerStudent::updateOrCreate(
            ['id' => 'rel-trainer-mariana'],
            [
                'trainer_id' => $trainer->id,
                'student_id' => $studentProfile2->id,
                'status' => 'ACTIVE',
                'started_at' => now()->subMonths(2),
            ]
        );

        // Aluno do Treinador Secundário (para teste de isolamento)
        $studentIsolated = StudentProfile::updateOrCreate(
            ['id' => 'student-isolated'],
            [
                'full_name' => 'Aluno Exclusivo Outro Personal',
                'birth_date' => '2000-01-01',
                'main_goal' => 'Força Pura',
                'status' => 'ativo',
            ]
        );

        TrainerStudent::updateOrCreate(
            ['id' => 'rel-secondary-isolated'],
            [
                'trainer_id' => $trainerSecondary->id,
                'student_id' => $studentIsolated->id,
                'status' => 'ACTIVE',
            ]
        );

        // 3. Catálogo de Exercícios (Do ecossistema mobile)
        $exercises = [
            [
                'id' => 'sys-sup-1',
                'name' => 'Supino Reto com Barra',
                'category' => 'Peito',
                'muscle_groups' => ['Peito', 'Ombros', 'Braços'],
                'tags' => ['Barra', 'Força', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
                'description' => 'Exercício multiarticular básico para desenvolvimento de peitoral maior e tríceps.',
                'instructions' => 'Deite-se no banco reto com pés firmes no chão, pegada um pouco além da largura dos ombros, desça a barra até tocar levemente o peito e empurre com força.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-sup-2',
                'name' => 'Crucifixo Inclinado com Halteres',
                'category' => 'Peito',
                'muscle_groups' => ['Peito', 'Ombros'],
                'tags' => ['Halter', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=eozdVDA78K0',
                'description' => 'Isolamento de feixes claviculares do peitoral maior com ênfase no alongamento excêntrico.',
                'instructions' => 'Banco a 30-45 graus. Mantenha os cotovelos levemente flexionados durante todo o arco de movimento.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-back-1',
                'name' => 'Puxada Frontal na Polia',
                'category' => 'Costas',
                'muscle_groups' => ['Costas', 'Braços'],
                'tags' => ['Polia', 'Máquina', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
                'description' => 'Foco no latíssimo do dorso e adutores das escápulas.',
                'instructions' => 'Segure a barra com pegada pronada aberta, puxe em direção ao topo do peitoral com o tronco levemente inclinado para trás.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-back-2',
                'name' => 'Remada Curvada com Barra',
                'category' => 'Costas',
                'muscle_groups' => ['Costas', 'Braços'],
                'tags' => ['Barra', 'Força'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=FWJR5Ve8gkQ',
                'description' => 'Espessura de costas e fortalecimento da cadeia posterior.',
                'instructions' => 'Tronco flexionado a aproximadamente 45 graus, coluna neutra, puxe a barra em direção ao umbigo.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-leg-1',
                'name' => 'Agachamento Livre com Barra',
                'category' => 'Membros Inferiores',
                'muscle_groups' => ['Membros Inferiores', 'Glúteos', 'Abs & Core'],
                'tags' => ['Barra', 'Força', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=bEv6CCg2BC8',
                'description' => 'Padrão ouro de membros inferiores, quadríceps, glúteos e estabilização de core.',
                'instructions' => 'Pés na largura dos ombros, desça flexionando joelhos e quadril mantendo peito aberto até passar a linha paralela.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-leg-2',
                'name' => 'Leg Press 45°',
                'category' => 'Membros Inferiores',
                'muscle_groups' => ['Membros Inferiores', 'Glúteos'],
                'tags' => ['Máquina', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
                'description' => 'Sobrecarga de quadríceps com segurança lombar.',
                'instructions' => 'Apoie as costas completamente no encosto, desça a plataforma até 90 graus sem descolar o quadril.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-arm-1',
                'name' => 'Rosca Direta com Barra W',
                'category' => 'Braços',
                'muscle_groups' => ['Braços'],
                'tags' => ['Barra', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=kwG2ipFRgfo',
                'description' => 'Desenvolvimento dos flexores do cotovelo (bíceps braquial e braquial).',
                'instructions' => 'Cotovelos fixos ao lado do tronco, flexione os braços sem embalo lombar.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-arm-2',
                'name' => 'Tríceps Corda na Polia',
                'category' => 'Braços',
                'muscle_groups' => ['Braços'],
                'tags' => ['Polia', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=vB5OHsJ3EME',
                'description' => 'Extensão de cotovelos com abertura final para ativação de cabeça lateral.',
                'instructions' => 'Pressione a corda para baixo abrindo as mãos no final do movimento.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-abs-1',
                'name' => 'Abdominal na Rodinha',
                'category' => 'Abs & Core',
                'muscle_groups' => ['Abs & Core'],
                'tags' => ['Peso Corporal', 'Força'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=rqiTPD7jxkg',
                'description' => 'Anti-extensão do tronco de altíssima ativação do reto abdominal.',
                'instructions' => 'Ajoelhado, role a roda para a frente mantendo o abdômen contraído.',
                'is_system' => true,
            ],
            [
                'id' => 'sys-del-1',
                'name' => 'Elevação Lateral com Halteres',
                'category' => 'Ombros',
                'muscle_groups' => ['Ombros'],
                'tags' => ['Halter', 'Hipertrofia'],
                'thumbnail_url' => 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400',
                'video_url' => 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
                'description' => 'Isolamento da porção medial do deltoide para largura escapular.',
                'instructions' => 'Eleve os halteres até a linha dos ombros, mantendo o polegar ligeiramente apontado para baixo.',
                'is_system' => true,
            ]
        ];

        foreach ($exercises as $ex) {
            Exercise::updateOrCreate(['id' => $ex['id']], $ex);
        }

        // 4. Plano de Treino e Sessões (Treino A com Bi-set e Treino B)
        $plan = TrainingPlan::updateOrCreate(
            ['id' => 'plan-elite-joao'],
            [
                'student_id' => $studentProfile->id,
                'trainer_id' => $trainer->id,
                'name' => 'ELITE - Hipertrofia & Força',
                'objective' => 'Hipertrofia com recomposição corporal',
                'status' => 'ativo',
                'version' => 1,
                'start_at' => now()->subDays(10)->toDateString(),
                'valid_until' => now()->addDays(50)->toDateString(),
                'frequency_per_week' => 4,
                'session_ids' => ['session-elite-a', 'session-elite-b'],
                'weekly_schedule' => [
                    ['day' => 'Segunda', 'sessionId' => 'session-elite-a'],
                    ['day' => 'Terça', 'sessionId' => 'session-elite-b'],
                    ['day' => 'Quinta', 'sessionId' => 'session-elite-a'],
                    ['day' => 'Sexta', 'sessionId' => 'session-elite-b'],
                ],
                'notes' => 'Foco em progressão de carga dupla (peso e repetições). Descanso mínimo de 90 segundos nos multiarticulares.',
            ]
        );

        // Sessão A: Peito, Ombros e Tríceps
        $sessionA = TrainingSession::updateOrCreate(
            ['id' => 'session-elite-a'],
            [
                'plan_id' => $plan->id,
                'student_id' => $studentProfile->id,
                'trainer_id' => $trainer->id,
                'status' => 'liberado',
                'active_version_id' => 'version-elite-a-v1',
            ]
        );

        $versionA = TrainingSessionVersion::updateOrCreate(
            ['id' => 'version-elite-a-v1'],
            [
                'session_id' => $sessionA->id,
                'version' => 1,
                'status' => 'published',
                'name' => 'Treino A — Peito, Ombros e Tríceps',
                'identifier' => 'Treino A',
                'objective' => 'Força e Hipertrofia de Empurrar',
                'muscle_groups' => ['Peito', 'Ombros', 'Braços'],
                'level' => 'avancado',
                'estimated_duration_minutes' => 60,
                'order' => 1,
                'instructions' => 'Aquecimento com elástico para ombro. Supino com cadência 3-0-1-0.',
                'show_when_locked' => true,
            ]
        );

        // Prescrições de Treino A (com Supino, Crucifixo e Bi-set de Ombros/Tríceps)
        TrainingExercisePrescription::updateOrCreate(
            ['id' => 'presc-supino-1'],
            [
                'version_id' => $versionA->id,
                'exercise_catalog_id' => 'sys-sup-1',
                'name' => 'Supino Reto com Barra',
                'type' => 'main',
                'muscle_group' => 'Peito',
                'order' => 1,
                'planned_sets' => 4,
                'planned_reps' => 8,
                'planned_load' => 80.0,
                'load_unit' => 'kg',
                'rest_seconds' => 90,
                'observation' => '4 séries: 1 de aquecimento 50kg, 3 de trabalho 80kg.',
                'video_url' => 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
                'planned_set_details' => [
                    ['setNumber' => 1, 'reps' => '12', 'load' => '50', 'restSeconds' => 60, 'notes' => 'Aquecimento'],
                    ['setNumber' => 2, 'reps' => '8', 'load' => '80', 'restSeconds' => 90, 'notes' => 'Série de trabalho'],
                    ['setNumber' => 3, 'reps' => '8', 'load' => '80', 'restSeconds' => 90, 'notes' => 'Série de trabalho'],
                    ['setNumber' => 4, 'reps' => '6', 'load' => '85', 'restSeconds' => 120, 'notes' => 'Carga máxima'],
                ],
            ]
        );

        // Bi-set de Elevação Lateral + Tríceps Corda
        TrainingExercisePrescription::updateOrCreate(
            ['id' => 'presc-biset-1'],
            [
                'version_id' => $versionA->id,
                'exercise_catalog_id' => 'sys-del-1',
                'name' => 'Elevação Lateral com Halteres',
                'type' => 'accessory',
                'muscle_group' => 'Ombros',
                'order' => 2,
                'combination_id' => 'biset-ombro-triceps',
                'combination_label' => 'BI-SET A',
                'planned_sets' => 3,
                'planned_reps' => 12,
                'planned_load' => 12.0,
                'load_unit' => 'kg',
                'rest_seconds' => 0,
                'observation' => 'Sem descanso, ir direto para o Tríceps Corda.',
            ]
        );

        TrainingExercisePrescription::updateOrCreate(
            ['id' => 'presc-biset-2'],
            [
                'version_id' => $versionA->id,
                'exercise_catalog_id' => 'sys-arm-2',
                'name' => 'Tríceps Corda na Polia',
                'type' => 'accessory',
                'muscle_group' => 'Braços',
                'order' => 3,
                'combination_id' => 'biset-ombro-triceps',
                'combination_label' => 'BI-SET A',
                'planned_sets' => 3,
                'planned_reps' => 12,
                'planned_load' => 35.0,
                'load_unit' => 'kg',
                'rest_seconds' => 60,
                'observation' => 'Descansar 60s após completar os dois exercícios.',
            ]
        );

        // 5. Histórico de Cargas Executadas (Registradas pelo Aluno no Mobile)
        TrainingExecutedSet::updateOrCreate(
            ['id' => 'exec-set-1'],
            [
                'student_id' => $studentProfile->id,
                'trainer_id' => $trainer->id,
                'workout_id' => $sessionA->id,
                'workout_name' => 'Treino A — Peito, Ombros e Tríceps',
                'exercise_id' => 'sys-sup-1',
                'exercise_name' => 'Supino Reto com Barra',
                'planned_set_index' => 1,
                'planned_load' => 80.0,
                'executed_load' => 82.5,
                'load_unit' => 'kg',
                'planned_reps' => 8,
                'executed_reps' => 8,
                'effort' => 8,
                'completed' => true,
                'valid_for_progression' => true,
                'executed_at' => now()->subDays(2),
                'note' => 'Execução com técnica limpa e sem dor.',
            ]
        );

        TrainingExecutedSet::updateOrCreate(
            ['id' => 'exec-set-2'],
            [
                'student_id' => $studentProfile->id,
                'trainer_id' => $trainer->id,
                'workout_id' => $sessionA->id,
                'workout_name' => 'Treino A — Peito, Ombros e Tríceps',
                'exercise_id' => 'sys-sup-1',
                'exercise_name' => 'Supino Reto com Barra',
                'planned_set_index' => 2,
                'planned_load' => 80.0,
                'executed_load' => 85.0,
                'load_unit' => 'kg',
                'planned_reps' => 8,
                'executed_reps' => 7,
                'effort' => 9,
                'completed' => true,
                'valid_for_progression' => true,
                'executed_at' => now()->subDays(2),
                'note' => 'Falha técnica na repetição 7.',
            ]
        );

        // 6. Avaliação Física Completa (Para histórico e comparativo)
        PhysicalAssessment::updateOrCreate(
            ['id' => 'assessment-joao-1'],
            [
                'student_id' => $studentProfile->id,
                'trainer_id' => $trainer->id,
                'assessment_date' => now()->subMonths(3)->toDateString(),
                'type' => 'inicial',
                'status' => 'concluida',
                'general_info' => [
                    'mainGoal' => 'Hipertrofia e melhora postural',
                    'experienceLevel' => 'intermediario',
                    'weeklyTrainingFrequency' => 4,
                ],
                'body_composition' => [
                    'weightKg' => 82.4,
                    'heightCm' => 178,
                    'bmi' => 26.0,
                    'bodyFatPercent' => 19.8,
                    'fatMassKg' => 16.3,
                    'leanMassKg' => 66.1,
                    'method' => 'dobras',
                ],
                'perimeters' => [
                    'neck' => 39.0,
                    'shoulders' => 118.0,
                    'chest' => 101.0,
                    'waist' => 91.0,
                    'abdomen' => 93.0,
                    'hips' => 102.0,
                    'rightArmRelaxed' => 34.5,
                    'leftArmRelaxed' => 34.0,
                    'rightArmContracted' => 37.5,
                    'leftArmContracted' => 37.0,
                    'rightThighMedial' => 57.0,
                    'leftThighMedial' => 56.5,
                    'rightCalf' => 38.0,
                    'leftCalf' => 38.0,
                ],
                'skinfolds' => [
                    'subscapular' => 18.0,
                    'triceps' => 14.0,
                    'chest' => 12.0,
                    'midaxillary' => 16.0,
                    'suprailiac' => 21.0,
                    'abdominal' => 24.0,
                    'thigh' => 19.0,
                ],
                'conclusion' => 'Boa base muscular. Foco em redução da circunferência abdominal e hipertrofia de membros superiores.',
            ]
        );

        PhysicalAssessment::updateOrCreate(
            ['id' => 'assessment-joao-2'],
            [
                'student_id' => $studentProfile->id,
                'trainer_id' => $trainer->id,
                'assessment_date' => now()->subDays(10)->toDateString(),
                'type' => 'periodica',
                'status' => 'concluida',
                'general_info' => [
                    'mainGoal' => 'Hipertrofia e definição',
                    'experienceLevel' => 'avancado',
                    'weeklyTrainingFrequency' => 4,
                ],
                'body_composition' => [
                    'weightKg' => 80.6,
                    'heightCm' => 178,
                    'bmi' => 25.4,
                    'bodyFatPercent' => 17.2,
                    'fatMassKg' => 13.8,
                    'leanMassKg' => 66.8,
                    'method' => 'dobras',
                ],
                'perimeters' => [
                    'neck' => 39.0,
                    'shoulders' => 120.5,
                    'chest' => 103.0,
                    'waist' => 87.5,
                    'abdomen' => 89.0,
                    'hips' => 100.5,
                    'rightArmRelaxed' => 35.5,
                    'leftArmRelaxed' => 35.0,
                    'rightArmContracted' => 38.8,
                    'leftArmContracted' => 38.3,
                    'rightThighMedial' => 58.0,
                    'leftThighMedial' => 57.5,
                    'rightCalf' => 38.5,
                    'leftCalf' => 38.5,
                ],
                'skinfolds' => [
                    'subscapular' => 15.0,
                    'triceps' => 11.5,
                    'chest' => 10.0,
                    'midaxillary' => 13.0,
                    'suprailiac' => 17.0,
                    'abdominal' => 19.5,
                    'thigh' => 16.0,
                ],
                'conclusion' => 'Evolução fantástica: perda de 2.5kg de gordura e ganho de 700g de massa magra. Cintura reduziu 3.5cm.',
            ]
        );

        // 7. Feedbacks
        $feedback = TrainingFeedback::updateOrCreate(
            ['id' => 'feedback-joao-1'],
            [
                'student_id' => $studentProfile->id,
                'student_name' => 'Joao Silva',
                'trainer_id' => $trainer->id,
                'workout_id' => $sessionA->id,
                'workout_name' => 'Treino A — Peito, Ombros e Tríceps',
                'started_at' => now()->subDays(1)->setTime(7, 30),
                'finished_at' => now()->subDays(1)->setTime(8, 32),
                'duration_minutes' => 62,
                'rating' => 5,
                'comment' => 'Treino excelente! Consegui bater o peso no supino sem sentir o ombro.',
                'intensity' => 'Intenso',
                'has_pain' => false,
                'status' => 'respondido',
            ]
        );

        FeedbackResponse::updateOrCreate(
            ['id' => 'response-feedback-1'],
            [
                'feedback_id' => $feedback->id,
                'author_id' => $trainer->id,
                'author_name' => $trainer->name,
                'author_role' => 'trainer',
                'message' => 'Parabéns, João! O aquecimento com elástico fez toda a diferença. Vamos manter essa consistência!',
            ]
        );

        // 8. Mensagens do Chat
        ChatMessage::updateOrCreate(
            ['id' => 'msg-seed-1'],
            [
                'conversation_id' => "conv_{$trainer->id}_{$studentProfile->id}",
                'sender_id' => $trainer->id,
                'sender_name' => $trainer->name,
                'sender_role' => 'TRAINER',
                'receiver_id' => $studentProfile->id,
                'receiver_name' => $studentProfile->full_name,
                'receiver_role' => 'STUDENT',
                'text' => 'Olá, João! Seu novo programa de treinos já está ativo e sincronizado. Vamos focar nos ombros!',
                'tag' => 'treino',
                'read' => true,
                'created_at' => now()->subDays(3),
            ]
        );

        ChatMessage::updateOrCreate(
            ['id' => 'msg-seed-2'],
            [
                'conversation_id' => "conv_{$trainer->id}_{$studentProfile->id}",
                'sender_id' => $studentProfile->id,
                'sender_name' => $studentProfile->full_name,
                'sender_role' => 'STUDENT',
                'receiver_id' => $trainer->id,
                'receiver_name' => $trainer->name,
                'receiver_role' => 'TRAINER',
                'text' => 'Valeu, professor! Vi aqui no aplicativo, a estrutura do Bi-set ficou muito boa.',
                'tag' => 'geral',
                'read' => true,
                'created_at' => now()->subDays(2),
            ]
        );

        // 9. Notificações
        AppNotification::updateOrCreate(
            ['id' => 'notif-seed-1'],
            [
                'user_id' => $trainer->id,
                'audience' => 'trainer',
                'type' => 'feedback-received',
                'title' => 'Feedback Recebido',
                'message' => 'Joao Silva completou o Treino A e enviou uma avaliação 5 estrelas.',
                'read' => false,
                'feedback_id' => $feedback->id,
            ]
        );

        AppNotification::updateOrCreate(
            ['id' => 'notif-seed-2'],
            [
                'user_id' => $trainer->id,
                'audience' => 'trainer',
                'type' => 'reassessment',
                'title' => 'Reavaliação Próxima',
                'message' => 'Mariana Souza completa 60 dias desde a última avaliação.',
                'read' => false,
            ]
        );
    }
}
