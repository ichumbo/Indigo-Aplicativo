<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RevenueCatSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        config(['services.revenuecat.enabled' => true, 'services.revenuecat.secret_key' => 'sk_test',
            'services.revenuecat.webhook_authorization' => 'Bearer webhook-test',
            'services.revenuecat.app_id' => 'app_test', 'services.revenuecat.environment' => 'sandbox']);
        Http::preventStrayRequests();
    }

    private function customer(array $changes = [], bool $entitled = true): array
    {
        $purchase = array_replace([
            'store' => 'app_store', 'is_sandbox' => true, 'period_type' => 'normal',
            'purchase_date' => now()->subDay()->toIso8601String(),
            'expires_date' => now()->addMonth()->toIso8601String(),
            'store_transaction_id' => 'apple-123', 'unsubscribe_detected_at' => null,
            'billing_issues_detected_at' => null, 'grace_period_expires_date' => null, 'refunded_at' => null,
        ], $changes);

        return ['subscriber' => ['entitlements' => $entitled ? ['tier_pro' => [
            'product_identifier' => 'com.dragoncorp.pro.monthly', 'expires_date' => $purchase['expires_date'],
        ]] : [], 'subscriptions' => ['com.dragoncorp.pro.monthly' => $purchase]]];
    }

    private function fakeCustomer(array $changes = [], bool $entitled = true): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['api.revenuecat.com/*' => Http::response($this->customer($changes, $entitled))]);
    }

    private function sync(array $body = []): TestResponse
    {
        return $this->actingAs(User::findOrFail('trainer-secondary'), 'sanctum')->postJson('/api/v1/subscription/sync', $body);
    }

    private function event(string $id = 'evt-1', string $type = 'INITIAL_PURCHASE', array $changes = []): TestResponse
    {
        return $this->withHeader('Authorization', 'Bearer webhook-test')->postJson('/api/v1/webhooks/revenuecat', [
            'event' => array_replace(['id' => $id, 'type' => $type, 'app_id' => 'app_test',
                'app_user_id' => 'trainer-secondary', 'environment' => 'SANDBOX', 'store' => 'APP_STORE'], $changes),
        ]);
    }

    public function test_sync_requires_authentication(): void
    {
        $this->postJson('/api/v1/subscription/sync')->assertUnauthorized();
        Http::assertNothingSent();
    }

    public function test_student_cannot_sync(): void
    {
        $this->actingAs(User::findOrFail('student-joao'), 'sanctum')->postJson('/api/v1/subscription/sync')->assertForbidden();
        Http::assertNothingSent();
    }

    public function test_sync_uses_authenticated_identity_and_server_entitlement(): void
    {
        $this->fakeCustomer();
        $this->sync(['userId' => 'trainer-main', 'isPro' => true])->assertOk()->assertJsonPath('isPro', true)->assertJsonPath('provider', 'apple');
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/trainer-secondary') && $request->hasHeader('Authorization', 'Bearer sk_test'));
        $this->assertDatabaseHas('subscriptions', ['user_id' => 'trainer-secondary', 'billing_manager' => 'revenuecat', 'status' => 'active']);
    }

    public function test_no_entitlement_cannot_grant_pro(): void
    {
        $this->fakeCustomer([], false);
        $this->sync(['isPro' => true])->assertOk()->assertJsonPath('isPro', false)->assertJsonPath('studentLimit', 1);
    }

    public function test_trial_and_cancellation_keep_access_until_expiration(): void
    {
        $this->fakeCustomer(['period_type' => 'trial', 'unsubscribe_detected_at' => now()->toIso8601String()]);
        $this->sync()->assertOk()->assertJsonPath('status', 'trial')->assertJsonPath('isPro', true)->assertJsonPath('autoRenew', false);
    }

    public function test_grace_period_remains_active(): void
    {
        $this->fakeCustomer(['expires_date' => now()->subHour()->toIso8601String(),
            'grace_period_expires_date' => now()->addDay()->toIso8601String(), 'billing_issues_detected_at' => now()->toIso8601String()]);
        $this->sync()->assertOk()->assertJsonPath('status', 'grace_period')->assertJsonPath('isPro', true);
    }

    public function test_expiration_and_refund_remove_access(): void
    {
        $this->fakeCustomer(['expires_date' => now()->subHour()->toIso8601String()]);
        $this->sync()->assertOk()->assertJsonPath('isPro', false)->assertJsonPath('status', 'expired');
        $this->fakeCustomer(['refunded_at' => now()->toIso8601String()]);
        $this->sync()->assertOk()->assertJsonPath('isPro', false)->assertJsonPath('status', 'refunded');
    }

    public function test_wrong_environment_does_not_overwrite_confirmed_access(): void
    {
        $this->fakeCustomer();
        $this->sync()->assertOk();
        $this->fakeCustomer(['is_sandbox' => false]);
        $this->sync()->assertServiceUnavailable();
        $this->assertTrue(Subscription::where('user_id', 'trainer-secondary')->firstOrFail()->isPro());
    }

    public function test_outage_and_malformed_response_preserve_access(): void
    {
        $this->fakeCustomer();
        $this->sync()->assertOk();
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['api.revenuecat.com/*' => Http::response([], 503)]);
        $this->sync()->assertServiceUnavailable();
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['api.revenuecat.com/*' => Http::response(['subscriber' => []])]);
        $this->sync()->assertServiceUnavailable();
        $this->assertTrue(Subscription::where('user_id', 'trainer-secondary')->firstOrFail()->isPro());
    }

    public function test_webhook_authentication_and_app_validation(): void
    {
        $this->postJson('/api/v1/webhooks/revenuecat')->assertUnauthorized();
        $this->event(changes: ['app_id' => 'wrong'])->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_duplicate_event_is_processed_once_and_old_event_reads_current_state(): void
    {
        $this->fakeCustomer();
        $this->event()->assertOk();
        $this->event()->assertOk();
        Http::assertSentCount(1);
        $this->assertDatabaseCount('revenuecat_events', 1);
        $this->assertDatabaseCount('subscription_transactions', 1);
        $this->event('old-expired-event', 'EXPIRATION')->assertOk();
        $this->assertTrue(Subscription::where('user_id', 'trainer-secondary')->firstOrFail()->isPro());
    }

    public function test_failed_webhook_can_be_retried(): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake(['api.revenuecat.com/*' => Http::response([], 503)]);
        $this->event()->assertServiceUnavailable();
        $this->assertDatabaseCount('revenuecat_events', 0);
        $this->fakeCustomer();
        $this->event()->assertOk();
        $this->assertDatabaseCount('revenuecat_events', 1);
    }

    public function test_wrong_store_and_environment_are_ignored(): void
    {
        $this->event(changes: ['environment' => 'PRODUCTION'])->assertOk()->assertJsonPath('status', 'ignored');
        $this->event(changes: ['store' => 'PLAY_STORE'])->assertOk()->assertJsonPath('status', 'ignored');
        Http::assertNothingSent();
    }

    public function test_cancel_does_not_pretend_to_cancel_apple_billing(): void
    {
        $this->fakeCustomer();
        $this->sync()->assertOk();
        $this->postJson('/api/v1/subscription/cancel')->assertStatus(409)->assertJsonPath('managementUrl', 'https://apps.apple.com/account/subscriptions');
        $this->assertDatabaseHas('subscriptions', ['user_id' => 'trainer-secondary', 'auto_renew' => true]);
    }

    public function test_legacy_verification_cannot_overwrite_revenuecat(): void
    {
        $this->fakeCustomer();
        $this->sync()->assertOk();
        $this->postJson('/api/v1/subscription/verify', ['provider' => 'apple', 'productId' => 'com.dragoncorp.pro.monthly', 'transactionId' => 'fake'])->assertUnprocessable();
    }

    public function test_disabled_integration_does_not_call_revenuecat(): void
    {
        config(['services.revenuecat.enabled' => false]);
        $this->sync()->assertServiceUnavailable();
        Http::assertNothingSent();
    }

    public function test_google_purchase_flow_is_preserved(): void
    {
        $this->actingAs(User::findOrFail('trainer-secondary'), 'sanctum')
            ->postJson('/api/v1/subscription/verify', [
                'provider' => 'google', 'productId' => 'dragoncorp_pro_monthly',
                'transactionId' => 'google-transaction', 'purchaseToken' => 'google-token',
            ])->assertOk()->assertJsonPath('subscription.provider', 'google');
        Http::assertNothingSent();
    }

    public function test_wrong_store_and_product_from_api_do_not_grant_access(): void
    {
        $this->fakeCustomer(['store' => 'play_store']);
        $this->sync()->assertServiceUnavailable();
        $body = $this->customer();
        $body['subscriber']['entitlements']['tier_pro']['product_identifier'] = 'unrecognized';
        Http::swap(new Factory);
        Http::fake(['api.revenuecat.com/*' => Http::response($body)]);
        $this->sync()->assertServiceUnavailable();
        $this->assertDatabaseMissing('subscriptions', ['user_id' => 'trainer-secondary', 'plan_id' => 'pro']);
    }
}
