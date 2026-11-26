<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class RevenueCatService
{
    public function sync(User $user, ?array $event = null): Subscription
    {
        if (! $user->isTrainer() && ! $user->isSuperAdmin()) {
            throw new AuthorizationException('Apenas treinadores podem contratar planos.');
        }
        if (! config('services.revenuecat.enabled') || ! config('services.revenuecat.secret_key')) {
            throw new RuntimeException('RevenueCat não configurado.');
        }

        return DB::transaction(function () use ($user, $event): Subscription {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $current = Subscription::where('user_id', $user->id)->first();
            if ($event && DB::table('revenuecat_events')->where('id', $event['id'])->exists()) {
                return $current ?? throw new RuntimeException('Evento sem assinatura.');
            }

            $response = Http::withToken(config('services.revenuecat.secret_key'))
                ->acceptJson()->connectTimeout(5)->timeout(15)
                ->get('https://api.revenuecat.com/v1/subscribers/'.rawurlencode($user->id));
            $response->throw();
            $subscriber = $response->json('subscriber');
            if (! is_array($subscriber) || ! is_array($subscriber['entitlements'] ?? null)
                || ! is_array($subscriber['subscriptions'] ?? null)) {
                throw new RuntimeException('Resposta RevenueCat incompleta.');
            }

            $entitlement = $subscriber['entitlements'][config('services.revenuecat.entitlement')] ?? null;
            $productId = $entitlement['product_identifier'] ?? null;
            $purchase = $productId ? ($subscriber['subscriptions'][$productId] ?? null) : null;
            $environment = config('services.revenuecat.environment');
            if (! in_array($environment, ['sandbox', 'production'], true)) {
                throw new RuntimeException('Ambiente RevenueCat inválido.');
            }
            if ($purchase && (! in_array($productId, SubscriptionVerificationService::VALID_APPLE_PRODUCTS, true)
                || ($purchase['store'] ?? null) !== 'app_store'
                || ! is_bool($purchase['is_sandbox'] ?? null)
                || ($purchase['is_sandbox'] ? 'sandbox' : 'production') !== $environment)) {
                throw new RuntimeException('Produto, loja ou ambiente RevenueCat incompatível.');
            }
            if ($entitlement && (! $purchase || empty($entitlement['expires_date']) || empty($purchase['purchase_date']))) {
                throw new RuntimeException('Assinatura RevenueCat incompleta.');
            }

            $expires = $entitlement ? Carbon::parse($entitlement['expires_date']) : null;
            $grace = ! empty($purchase['grace_period_expires_date']) ? Carbon::parse($purchase['grace_period_expires_date']) : null;
            $effectiveEnd = $grace && $expires && $grace->greaterThan($expires) ? $grace : $expires;
            $refunded = ! empty($purchase['refunded_at']);
            $active = $effectiveEnd?->isFuture() && ! $refunded;
            $status = $refunded ? 'refunded' : ($active
                ? ($expires->isPast() && $grace?->isFuture() ? 'grace_period' : (($purchase['period_type'] ?? '') === 'trial' ? 'trial' : 'active'))
                : ($purchase ? 'expired' : 'free'));
            $autoRenew = $active && empty($purchase['unsubscribe_detected_at']) && empty($purchase['billing_issues_detected_at']);

            // Other stores and administrator grants retain their existing authority.
            if ($current && $current->provider !== 'apple' && $current->isPro()) {
                $sub = $current;
            } else {
                $sub = Subscription::updateOrCreate(['user_id' => $user->id], [
                    'id' => $current?->id ?? 'sub-'.$user->id,
                    'plan_id' => $active ? 'pro' : 'free',
                    'provider' => 'apple',
                    'billing_manager' => 'revenuecat',
                    'product_id' => $productId,
                    'environment' => $environment,
                    'status' => $status,
                    'current_period_start' => $purchase ? Carbon::parse($purchase['purchase_date']) : null,
                    'current_period_end' => $effectiveEnd,
                    'student_limit' => $active ? 9999 : 1,
                    'auto_renew' => $autoRenew,
                    'cancel_at_period_end' => $active && ! empty($purchase['unsubscribe_detected_at']),
                    'last_verified_at' => now(),
                    'latest_transaction_id' => isset($purchase['store_transaction_id']) ? (string) $purchase['store_transaction_id'] : null,
                    'raw_payload' => ['source' => 'revenuecat', 'entitlement' => config('services.revenuecat.entitlement')],
                ]);
            }

            if ($event) {
                DB::table('revenuecat_events')->insert([
                    'id' => $event['id'], 'user_id' => $user->id, 'type' => $event['type'], 'processed_at' => now(),
                ]);
                SubscriptionTransaction::create([
                    'id' => 'txn-'.Str::uuid(), 'user_id' => $user->id, 'subscription_id' => $sub->id,
                    'provider' => 'apple', 'event_type' => $event['type'], 'status' => $sub->status,
                    'product_id' => $productId, 'environment' => $environment,
                    'payload' => ['source' => 'revenuecat', 'eventId' => $event['id']],
                ]);
            }

            return $sub;
        }, 3);
    }
}
