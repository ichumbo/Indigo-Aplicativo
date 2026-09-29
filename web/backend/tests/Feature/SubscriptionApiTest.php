<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\SubscriptionTransaction;
use App\Models\TrainerStudent;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_trainer_with_no_subscription_gets_canonical_free_plan(): void
    {
        // 'trainer-secondary' não possui assinatura no seeder
        $trainer = User::find('trainer-secondary');

        $response = $this->actingAs($trainer, 'sanctum')
            ->getJson('/api/v1/subscription');

        $response->assertStatus(200)
            ->assertJsonPath('plan', 'free')
            ->assertJsonPath('isPro', false)
            ->assertJsonPath('studentLimit', 1);
    }

    public function test_trainer_can_verify_apple_storekit_purchase(): void
    {
        $trainer = User::find('trainer-secondary');

        $payload = [
            'provider' => 'apple',
            'productId' => 'com.dragoncorp.pro.monthly',
            'transactionId' => 'txn-apple-1000000999',
            'originalTransactionId' => 'orig-apple-1000000999',
            'environment' => 'sandbox',
            'isIntroductoryTrial' => false,
        ];

        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/subscription/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('isDuplicate', false)
            ->assertJsonPath('subscription.plan', 'pro')
            ->assertJsonPath('subscription.status', 'active')
            ->assertJsonPath('entitlements.isPro', true);

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $trainer->id,
            'plan_id' => 'pro',
            'status' => 'active',
            'original_transaction_id' => 'orig-apple-1000000999',
        ]);

        $this->assertDatabaseHas('subscription_transactions', [
            'user_id' => $trainer->id,
            'transaction_id' => 'txn-apple-1000000999',
            'event_type' => 'INITIAL_PURCHASE',
        ]);
    }

    public function test_idempotent_purchase_verification_does_not_duplicate(): void
    {
        $trainer = User::find('trainer-secondary');

        $payload = [
            'provider' => 'apple',
            'productId' => 'com.dragoncorp.pro.monthly',
            'transactionId' => 'txn-apple-idem-1',
            'originalTransactionId' => 'orig-apple-idem-1',
            'environment' => 'sandbox',
        ];

        // Primeira chamada
        $first = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/subscription/verify', $payload);
        $first->assertStatus(200)->assertJsonPath('isDuplicate', false);

        // Segunda chamada idêntica (Replay / Repetição de rede)
        $second = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/subscription/verify', $payload);
        $second->assertStatus(200)->assertJsonPath('isDuplicate', true);

        // Confirma que não duplicou transações
        $this->assertEquals(1, SubscriptionTransaction::where('transaction_id', 'txn-apple-idem-1')->count());
    }

    public function test_student_role_cannot_purchase_or_verify_subscription(): void
    {
        $student = User::find('student-joao');

        $response = $this->actingAs($student, 'sanctum')
            ->postJson('/api/v1/subscription/verify', [
                'provider' => 'apple',
                'productId' => 'com.dragoncorp.pro.monthly',
                'transactionId' => 'txn-student-try',
            ]);

        // Proibido para role STUDENT
        $response->assertStatus(403);
    }

    public function test_anti_fraud_cannot_bind_same_original_transaction_to_another_account(): void
    {
        $trainerA = User::find('trainer-main');
        $trainerB = User::find('trainer-secondary');

        // trainerA ativa com originalTransactionId
        $trainerA->subscription()->update([
            'original_transaction_id' => 'apple-unique-account-token-777',
        ]);

        // trainerB tenta submeter a mesma compra
        $response = $this->actingAs($trainerB, 'sanctum')
            ->postJson('/api/v1/subscription/verify', [
                'provider' => 'apple',
                'productId' => 'com.dragoncorp.pro.monthly',
                'transactionId' => 'txn-stolen-2',
                'originalTransactionId' => 'apple-unique-account-token-777',
            ]);

        // Rejeitado com erro 422
        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Esta assinatura da loja já está vinculada a outra conta de treinador. Entre em contato com o suporte para reconciliação.',
            ]);
    }

    public function test_free_trainer_is_strictly_blocked_from_adding_second_student(): void
    {
        $trainer = User::find('trainer-secondary');

        // Cria primeiro aluno vinculado (limite free = 1)
        TrainerStudent::create([
            'id' => 'rel-sec-1',
            'trainer_id' => $trainer->id,
            'student_id' => 'student-joao',
            'status' => 'ACTIVE',
        ]);

        // Tenta cadastrar um segundo aluno
        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/students', [
                'fullName' => 'Segundo Aluno Bloqueado',
                'mainGoal' => 'Hipertrofia',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('code', 'UPGRADE_REQUIRED');
    }

    public function test_trainer_can_cancel_auto_renew(): void
    {
        $trainer = User::find('trainer-main');

        $response = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/subscription/cancel');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $trainer->id,
            'cancel_at_period_end' => true,
            'auto_renew' => false,
        ]);
    }

    public function test_apple_webhook_renews_subscription(): void
    {
        $trainer = User::find('trainer-main');
        $trainer->subscription()->update([
            'original_transaction_id' => 'webhook-orig-apple-123',
            'status' => 'active',
            'current_period_end' => now()->addDays(2),
        ]);

        $response = $this->postJson('/api/v1/webhooks/apple-iap', [
            'notificationType' => 'DID_RENEW',
            'originalTransactionId' => 'webhook-orig-apple-123',
        ]);

        $response->assertStatus(200);

        $freshSub = Subscription::where('user_id', $trainer->id)->first();
        $this->assertEquals('active', $freshSub->status);
        $this->assertTrue($freshSub->current_period_end->isFuture());
    }

    public function test_apple_webhook_expires_subscription(): void
    {
        $trainer = User::find('trainer-main');
        $trainer->subscription()->update([
            'original_transaction_id' => 'webhook-orig-apple-expire-999',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/webhooks/apple-iap', [
            'notificationType' => 'EXPIRED',
            'originalTransactionId' => 'webhook-orig-apple-expire-999',
        ]);

        $response->assertStatus(200);

        $freshSub = Subscription::where('user_id', $trainer->id)->first();
        $this->assertEquals('expired', $freshSub->status);
        $this->assertFalse($freshSub->auto_renew);
    }
}
