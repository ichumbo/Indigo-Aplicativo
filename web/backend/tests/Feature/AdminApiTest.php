<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Subscription;
use App\Models\TrainerProfile;
use App\Models\TrainerStudent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $supportAdmin;
    private User $trainer;
    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::updateOrCreate(
            ['email' => 'test_super_admin@dragoncorp.app'],
            [
                'id' => 'admin-test-' . Str::random(8),
                'name' => 'Test Super Admin',
                'password' => Hash::make('AdminSecret123!'),
                'role' => 'SUPER_ADMIN',
                'status' => 'ACTIVE',
                'is_email_verified' => true,
            ]
        );

        $this->supportAdmin = User::updateOrCreate(
            ['email' => 'test_support_admin@dragoncorp.app'],
            [
                'id' => 'support-test-' . Str::random(8),
                'name' => 'Test Support Admin',
                'password' => Hash::make('SupportSecret123!'),
                'role' => 'SUPPORT_ADMIN',
                'status' => 'ACTIVE',
                'is_email_verified' => true,
            ]
        );

        $this->trainer = User::updateOrCreate(
            ['email' => 'test_trainer_admin@dragoncorp.app'],
            [
                'id' => 'trainer-test-' . Str::random(8),
                'name' => 'Test Trainer',
                'password' => Hash::make('TrainerPass123!'),
                'role' => 'TRAINER',
                'status' => 'ACTIVE',
                'is_email_verified' => true,
            ]
        );

        $this->student = User::updateOrCreate(
            ['email' => 'test_student_admin@dragoncorp.app'],
            [
                'id' => 'student-test-' . Str::random(8),
                'name' => 'Test Student',
                'password' => Hash::make('StudentPass123!'),
                'role' => 'STUDENT',
                'status' => 'ACTIVE',
                'is_email_verified' => true,
            ]
        );
    }

    public function test_admin_login_rejects_non_admin_users(): void
    {
        $response = $this->postJson('/api/v1/admin/auth/login', [
            'email' => $this->trainer->email,
            'password' => 'TrainerPass123!',
        ]);

        $response->assertStatus(401);
        $this->assertFalse($response->json('success'));
    }

    public function test_admin_login_succeeds_for_super_admin(): void
    {
        $response = $this->postJson('/api/v1/admin/auth/login', [
            'email' => $this->superAdmin->email,
            'password' => 'AdminSecret123!',
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertNotEmpty($response->json('token'));
        $this->assertEquals('SUPER_ADMIN', $response->json('user.role'));
        $this->assertContains('*', $response->json('user.permissions'));
    }

    public function test_unauthenticated_requests_to_admin_routes_are_denied(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard');
        $response->assertStatus(401);
    }

    public function test_regular_trainer_token_cannot_access_admin_routes(): void
    {
        $token = $this->trainer->createToken('trainer-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/dashboard');

        $response->assertStatus(403);
    }

    public function test_super_admin_can_access_dashboard_metrics(): void
    {
        $token = $this->superAdmin->createToken('admin-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/dashboard?period=30d');

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertArrayHasKey('users', $response->json());
        $this->assertArrayHasKey('subscriptions', $response->json());
        $this->assertGreaterThanOrEqual(1, $response->json('users.total'));
    }

    public function test_admin_can_list_and_search_users(): void
    {
        $token = $this->superAdmin->createToken('admin-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/users?per_page=10');

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertIsArray($response->json('data'));
        $this->assertArrayHasKey('meta', $response->json());
    }

    public function test_admin_can_suspend_and_reactivate_user_with_reason(): void
    {
        $token = $this->superAdmin->createToken('admin-token')->plainTextToken;

        // Suspensão exige motivo e confirmação 'SUSPENDER'
        $suspendRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/users/{$this->student->id}/suspend", [
                'reason' => 'Violação de conduta e termos de uso',
                'confirm_text' => 'SUSPENDER',
            ]);

        $suspendRes->assertStatus(200);
        $this->assertEquals('SUSPENDED', $this->student->fresh()->status);

        // Reativação
        $reactivateRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/users/{$this->student->id}/reactivate", [
                'reason' => 'Termo assinado e situação regularizada',
            ]);

        $reactivateRes->assertStatus(200);
        $this->assertEquals('ACTIVE', $this->student->fresh()->status);
    }

    public function test_admin_can_transfer_student_between_trainers_atomically(): void
    {
        $token = $this->superAdmin->createToken('admin-token')->plainTextToken;

        $newTrainer = User::create([
            'id' => 'trainer-target-' . Str::random(8),
            'name' => 'Novo Treinador',
            'email' => 'novo_treinador@dragoncorp.app',
            'password' => Hash::make('Secret123!'),
            'role' => 'TRAINER',
            'status' => 'ACTIVE',
        ]);

        // Cria vínculo inicial
        TrainerStudent::create([
            'id' => 'link-seed-' . Str::random(8),
            'trainer_id' => $this->trainer->id,
            'student_id' => $this->student->id,
            'status' => 'active',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/links/transfer', [
                'student_id' => $this->student->id,
                'from_trainer_id' => $this->trainer->id,
                'to_trainer_id' => $newTrainer->id,
                'reason' => 'Aluno solicitou troca de consultoria presencial',
                'confirm_text' => 'TRANSFERIR',
            ]);

        $response->assertStatus(200);

        // Verifica que o vínculo anterior virou 'transferred'
        $this->assertDatabaseHas('trainer_students', [
            'student_id' => $this->student->id,
            'trainer_id' => $this->trainer->id,
            'status' => 'transferred',
        ]);

        // Verifica que o novo vínculo está ativo
        $this->assertDatabaseHas('trainer_students', [
            'student_id' => $this->student->id,
            'trainer_id' => $newTrainer->id,
            'status' => 'active',
        ]);
    }

    public function test_admin_can_grant_and_revoke_promotional_subscription(): void
    {
        $token = $this->superAdmin->createToken('admin-token')->plainTextToken;

        $grantRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/admin/subscriptions/grant-promo', [
                'user_id' => $this->trainer->id,
                'plan_id' => 'pro',
                'days' => 60,
                'reason' => 'Acesso promocional parceiro acadêmico',
            ]);

        $grantRes->assertStatus(200);
        $sub = Subscription::where('user_id', $this->trainer->id)->first();
        $this->assertNotNull($sub);
        $this->assertEquals('pro', $sub->plan_id);
        $this->assertEquals('admin', $sub->provider);

        // Revogação
        $revokeRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/subscriptions/{$sub->id}/revoke-promo", [
                'reason' => 'Fim da parceria acadêmica',
            ]);

        $revokeRes->assertStatus(200);
        $this->assertEquals('free', $sub->fresh()->plan_id);
    }

    public function test_audit_logs_are_recorded_with_sanitized_data(): void
    {
        $token = $this->superAdmin->createToken('admin-token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/v1/admin/users/{$this->student->id}/password-reset", [
                'reason' => 'Solicitação de suporte via ticket #1234',
            ]);

        $audit = AuditLog::where('action', 'PASSWORD_RESET_REQUESTED')
            ->where('target_id', $this->student->id)
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals('SUCCESS', $audit->result);
    }
}
