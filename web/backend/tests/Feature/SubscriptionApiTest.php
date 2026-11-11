<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\SubscriptionTransaction;
use App\Models\TrainerStudent;
use App\Models\User;
use App\Services\AppleStoreVerifier;
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
        $this->mock(AppleStoreVerifier::class, function ($mock) {
            $mock->shouldReceive('verify')->andReturnUsing(fn ($id, $product) => [
                'transactionId' => $id, 'productId' => $product, 'environment' => 'Sandbox',
                'originalTransactionId' => match ($id) {
                    'txn-apple-1000000999' => 'orig-apple-1000000999',
                    'txn-apple-idem-1' => 'orig-apple-idem-1',
                    'txn-stolen-2' => 'apple-unique-account-token-777', default => $id,
                },
                'purchaseDate' => now()->subMinute()->getTimestampMs(),
                'expiresDate' => now()->addMinutes(4)->getTimestampMs(),
            ]);
            $mock->shouldReceive('decodeSignedPayload')->andReturnUsing(fn ($signed) => json_decode($signed, true, flags: JSON_THROW_ON_ERROR));
        });
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
            ->assertJsonPath('subscription.environment', 'sandbox')
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

        $expiration = Subscription::where('user_id', $trainer->id)->first()->current_period_end->toIso8601String();
        $this->travel(1)->minutes();

        // Segunda chamada idêntica (Replay / Repetição de rede)
        $second = $this->actingAs($trainer, 'sanctum')
            ->postJson('/api/v1/subscription/verify', $payload);
        $second->assertStatus(200)->assertJsonPath('isDuplicate', true);

        $this->assertSame($expiration, Subscription::where('user_id', $trainer->id)->first()->current_period_end->toIso8601String());

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

    public function test_store_unavailable_does_not_grant_pro(): void
    {
        $this->mock(AppleStoreVerifier::class, function ($mock) {
            $mock->shouldReceive('verify')->once()->andThrow(new \RuntimeException('Store unavailable'));
        });
        $trainer = User::find('trainer-secondary');
        $this->actingAs($trainer, 'sanctum')->postJson('/api/v1/subscription/verify', [
            'provider' => 'apple', 'productId' => 'com.dragoncorp.pro.monthly', 'transactionId' => '100000001',
        ])->assertStatus(503);
        $this->assertDatabaseMissing('subscriptions', ['user_id' => $trainer->id, 'plan_id' => 'pro']);
    }

    public function test_unlisted_product_is_rejected(): void
    {
        $trainer = User::find('trainer-secondary');
        $this->actingAs($trainer, 'sanctum')->postJson('/api/v1/subscription/verify', [
            'provider' => 'apple', 'productId' => 'fake.monthly', 'transactionId' => '100000001',
        ])->assertUnprocessable();
    }

    public function test_unsigned_apple_notification_is_rejected(): void
    {
        $this->postJson('/api/v1/webhooks/apple-iap', ['notificationType' => 'DID_RENEW'])->assertUnprocessable();
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
            'provider' => 'apple',
            'original_transaction_id' => 'webhook-orig-apple-123',
            'status' => 'active',
            'current_period_end' => now()->addDays(2),
        ]);

        $response = $this->postJson('/api/v1/webhooks/apple-iap', [
            'signedPayload' => json_encode(['notificationType' => 'DID_RENEW', 'data' => [
                'bundleId' => 'com.dragoncorp.app', 'environment' => 'Sandbox',
                'signedTransactionInfo' => json_encode([
                    'bundleId' => 'com.dragoncorp.app', 'environment' => 'Sandbox',
                    'productId' => 'com.dragoncorp.pro.monthly',
                    'originalTransactionId' => 'webhook-orig-apple-123',
                    'expiresDate' => now()->addDays(3)->getTimestampMs(),
                ]),
            ]]),
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
            'provider' => 'apple',
            'original_transaction_id' => 'webhook-orig-apple-expire-999',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/webhooks/apple-iap', [
            'signedPayload' => json_encode(['notificationType' => 'EXPIRED', 'data' => [
                'bundleId' => 'com.dragoncorp.app', 'environment' => 'Sandbox',
                'signedTransactionInfo' => json_encode([
                    'bundleId' => 'com.dragoncorp.app', 'environment' => 'Sandbox',
                    'productId' => 'com.dragoncorp.pro.monthly',
                    'originalTransactionId' => 'webhook-orig-apple-expire-999',
                    'expiresDate' => now()->addDays(3)->getTimestampMs(),
                ]),
            ]]),
        ]);

        $response->assertStatus(200);

        $freshSub = Subscription::where('user_id', $trainer->id)->first();
        $this->assertEquals('expired', $freshSub->status);
        $this->assertFalse($freshSub->auto_renew);
    }
}
