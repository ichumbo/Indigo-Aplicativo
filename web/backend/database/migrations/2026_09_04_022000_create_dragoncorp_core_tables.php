<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Trainer Profiles
        Schema::create('trainer_profiles', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->index();
            $table->string('cref_number')->nullable();
            $table->string('cref_state', 2)->nullable();
            $table->string('cref_verification_status')->default('unverified');
            $table->text('bio')->nullable();
            $table->json('specialties')->nullable();
            $table->string('service_type')->default('both');
            $table->integer('experience_years')->default(0);
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->string('address')->nullable();
            $table->string('instagram')->nullable();
            $table->string('portfolio_url')->nullable();
            $table->string('working_hours')->nullable();
            $table->json('certifications')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // 2. Student Profiles
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->nullable()->index();
            $table->string('full_name');
            $table->string('avatar')->nullable();
            $table->string('birth_date')->nullable();
            $table->string('gender')->default('not_informed');
            $table->string('main_goal')->default('Hipertrofia e Condicionamento');
            $table->json('secondary_goals')->nullable();
            $table->string('profession')->nullable();
            $table->string('address')->nullable();
            $table->json('contact')->nullable();
            $table->string('status')->default('ativo');
            $table->text('administrative_notes')->nullable();
            $table->json('anamnesis')->nullable();
            $table->json('follow_up_summary')->nullable();
            $table->json('private_trainer_notes')->nullable();
            $table->timestamps();
        });

        // 3. Trainer - Student Relationships
        Schema::create('trainer_students', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('trainer_id')->index();
            $table->string('student_id')->index();
            $table->string('status')->default('ACTIVE');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->string('invite_id')->nullable();
            $table->string('invite_status')->nullable();
            $table->string('code_used')->nullable();
            $table->timestamps();
        });

        // 4. Exercise Catalog (System + Custom)
        Schema::create('exercises', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('trainer_id')->nullable()->index(); // null = sistema, string = customizado do personal
            $table->string('name');
            $table->string('category');
            $table->json('muscle_groups');
            $table->json('tags')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->string('video_url')->nullable();
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();
            $table->json('common_errors')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        // 5. Training Plans (Planos gerais do aluno)
        Schema::create('training_plans', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id')->index();
            $table->string('trainer_id')->index();
            $table->string('name');
            $table->string('objective');
            $table->string('status')->default('ativo');
            $table->integer('version')->default(1);
            $table->date('start_at')->nullable();
            $table->date('valid_until')->nullable();
            $table->integer('frequency_per_week')->default(3);
            $table->json('session_ids')->nullable();
            $table->json('weekly_schedule')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 6. Training Sessions (Treino A, Treino B, etc.)
        Schema::create('training_sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('plan_id')->index();
            $table->string('student_id')->index();
            $table->string('trainer_id')->index();
            $table->string('status')->default('liberado');
            $table->string('active_version_id')->nullable();
            $table->json('release_config')->nullable();
            $table->timestamps();
        });

        // 7. Training Session Versions (Versão atual e histórico de edições da sessão)
        Schema::create('training_session_versions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('session_id')->index();
            $table->integer('version')->default(1);
            $table->string('status')->default('published');
            $table->string('name');
            $table->string('identifier')->nullable();
            $table->string('objective')->nullable();
            $table->text('description')->nullable();
            $table->json('muscle_groups')->nullable();
            $table->string('level')->default('intermediario');
            $table->integer('estimated_duration_minutes')->default(60);
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->json('recommended_days')->nullable();
            $table->integer('order')->default(1);
            $table->text('instructions')->nullable();
            $table->boolean('show_when_locked')->default(true);
            $table->boolean('requires_supervision')->default(false);
            $table->text('private_trainer_notes')->nullable();
            $table->json('sections')->nullable();
            $table->timestamps();
        });

        // 8. Training Exercise Prescriptions (Exercícios dentro do treino com Bi-set/Tri-set)
        Schema::create('training_exercise_prescriptions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('version_id')->index();
            $table->string('exercise_catalog_id')->nullable()->index();
            $table->string('name');
            $table->string('type')->default('main');
            $table->string('muscle_group');
            $table->integer('order')->default(1);
            $table->string('section_id')->nullable();
            $table->string('combination_id')->nullable(); // bi-set / tri-set
            $table->string('combination_label')->nullable();
            $table->integer('planned_sets')->default(3);
            $table->json('planned_set_details')->nullable();
            $table->integer('planned_reps')->nullable();
            $table->decimal('planned_load', 8, 2)->nullable();
            $table->string('load_unit')->default('kg');
            $table->integer('duration_seconds')->nullable();
            $table->integer('rest_seconds')->default(60);
            $table->string('tempo')->nullable();
            $table->string('side')->default('bilateral');
            $table->text('observation')->nullable();
            $table->string('video_url')->nullable();
            $table->boolean('unilateral')->default(false);
            $table->boolean('warmup_set')->default(false);
            $table->boolean('valid_set')->default(true);
            $table->timestamps();
        });

        // 9. Executed Sets (Cargas e execuções registradas pelo aluno no mobile)
        Schema::create('training_executed_sets', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id')->index();
            $table->string('trainer_id')->nullable()->index();
            $table->string('workout_id')->nullable()->index();
            $table->string('workout_name')->nullable();
            $table->string('exercise_id')->index();
            $table->string('exercise_name');
            $table->string('execution_id')->nullable();
            $table->integer('planned_set_index')->default(1);
            $table->decimal('planned_load', 8, 2)->nullable();
            $table->decimal('executed_load', 8, 2)->nullable();
            $table->string('load_unit')->default('kg');
            $table->integer('planned_reps')->nullable();
            $table->integer('executed_reps')->nullable();
            $table->integer('effort')->nullable();
            $table->boolean('completed')->default(true);
            $table->boolean('valid_for_progression')->default(true);
            $table->json('pain')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
        });

        // 10. Physical Assessments (Avaliações físicas completas)
        Schema::create('physical_assessments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id')->index();
            $table->string('trainer_id')->index();
            $table->date('assessment_date');
            $table->string('type')->default('periodica');
            $table->string('status')->default('concluida');
            $table->json('general_info')->nullable();
            $table->json('anamnesis')->nullable();
            $table->json('body_composition')->nullable();
            $table->json('perimeters')->nullable();
            $table->json('skinfolds')->nullable();
            $table->json('cardio')->nullable();
            $table->json('functional')->nullable();
            $table->json('postural')->nullable();
            $table->json('photos')->nullable();
            $table->text('conclusion')->nullable();
            $table->timestamps();
        });

        // 11. Feedbacks pós-treino
        Schema::create('feedbacks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('student_id')->index();
            $table->string('student_name');
            $table->string('trainer_id')->index();
            $table->string('workout_id')->nullable();
            $table->string('workout_name');
            $table->string('execution_id')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->json('exercises')->nullable();
            $table->integer('rating')->default(5);
            $table->text('comment')->nullable();
            $table->string('intensity')->default('Adequado');
            $table->boolean('has_pain')->default(false);
            $table->string('pain_region')->nullable();
            $table->integer('pain_level')->nullable();
            $table->string('status')->default('novo');
            $table->timestamps();
        });

        // 12. Respostas aos Feedbacks
        Schema::create('feedback_responses', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('feedback_id')->index();
            $table->string('author_id');
            $table->string('author_name');
            $table->string('author_role')->default('trainer');
            $table->text('message');
            $table->timestamps();
        });

        // 13. Mensagens do Chat Treinador <-> Aluno
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('conversation_id')->index();
            $table->string('sender_id')->index();
            $table->string('sender_name');
            $table->string('sender_role');
            $table->string('receiver_id')->index();
            $table->string('receiver_name');
            $table->string('receiver_role');
            $table->text('text');
            $table->string('tag')->nullable();
            $table->boolean('read')->default(false);
            $table->timestamps();
        });

        // 14. Notificações do Sistema
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->index();
            $table->string('audience')->default('trainer');
            $table->string('type');
            $table->string('title');
            $table->text('message');
            $table->boolean('read')->default(false);
            $table->string('feedback_id')->nullable();
            $table->boolean('highlight_pain')->default(false);
            $table->timestamps();
        });

        // 15. Assinaturas e Limites (Freemium / Pro)
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id')->index();
            $table->string('plan_id')->default('pro');
            $table->string('status')->default('active');
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->boolean('cancel_at_period_end')->default(false);
            $table->integer('student_limit')->default(9999);
            $table->timestamps();
        });

        // 16. Logs de Auditoria
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('action');
            $table->string('actor_id')->nullable();
            $table->string('actor_role')->nullable();
            $table->string('target_id')->nullable();
            $table->text('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('app_notifications');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('feedback_responses');
        Schema::dropIfExists('feedbacks');
        Schema::dropIfExists('physical_assessments');
        Schema::dropIfExists('training_executed_sets');
        Schema::dropIfExists('training_exercise_prescriptions');
        Schema::dropIfExists('training_session_versions');
        Schema::dropIfExists('training_sessions');
        Schema::dropIfExists('training_plans');
        Schema::dropIfExists('exercises');
        Schema::dropIfExists('trainer_students');
        Schema::dropIfExists('student_profiles');
        Schema::dropIfExists('trainer_profiles');
    }
};
