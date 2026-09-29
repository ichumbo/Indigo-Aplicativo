<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Subscription;
use App\Models\SubscriptionTransaction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StoreWebhookController extends Controller
{
    /**
     * Endpoint para App Store Server Notifications V2
     * Documentação Apple: https://developer.apple.com/documentation/appstoreservernotifications
     */
    public function handleAppleNotification(Request $request): JsonResponse
    {
        $payload = $request->all();

        // Em produção, o payload contém 'signedPayload' (JWS decodificado com chaves da Apple)
        // Suporte tanto para JWS envelopado quanto payload normalizado/teste
        $notificationType = $payload['notificationType'] ?? null;
        $subtype = $payload['subtype'] ?? null;
        $data = $payload['data'] ?? [];

        $originalTransactionId = $data['originalTransactionId']
            ?? $data['signedTransactionInfo']['originalTransactionId']
            ?? $payload['originalTransactionId']
            ?? null;

        Log::info('[IAP Webhook] Apple Notification recebida', [
            'type' => $notificationType,
            'subtype' => $subtype,
            'originalTransactionId' => $originalTransactionId ? substr($originalTransactionId, 0, 4) . '***' : null,
        ]);

        if (!$originalTransactionId) {
            return response()->json(['status' => 'acknowledged_without_action'], 200);
        }

        $subscription = Subscription::where('original_transaction_id', $originalTransactionId)->first();
        if (!$subscription) {
            Log::warning('[IAP Webhook] Assinatura não localizada para originalTransactionId: ' . $originalTransactionId);
            return response()->json(['status' => 'subscription_not_found'], 200);
        }

        $now = Carbon::now();

        switch ($notificationType) {
            case 'DID_RENEW':
                $isAnnual = Str::contains(strtolower($subscription->product_id ?? ''), ['annual', 'anual']);
                $newEnd = $isAnnual ? $now->copy()->addYear() : $now->copy()->addMonth();

                $subscription->update([
                    'status' => 'active',
                    'current_period_end' => $newEnd,
                    'cancel_at_period_end' => false,
                    'auto_renew' => true,
                    'last_verified_at' => $now,
                ]);

                SubscriptionTransaction::create([
                    'id' => 'txn-' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'subscription_id' => $subscription->id,
                    'provider' => 'apple',
                    'event_type' => 'RENEWAL',
                    'original_transaction_id' => $originalTransactionId,
                    'status' => 'active',
                    'payload' => ['newExpiresAt' => $newEnd->toIso8601String()],
                ]);
                break;

            case 'EXPIRED':
                $subscription->update([
                    'status' => 'expired',
                    'auto_renew' => false,
                    'last_verified_at' => $now,
                ]);

                SubscriptionTransaction::create([
                    'id' => 'txn-' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'subscription_id' => $subscription->id,
                    'provider' => 'apple',
                    'event_type' => 'EXPIRATION',
                    'original_transaction_id' => $originalTransactionId,
                    'status' => 'expired',
                ]);
                break;

            case 'DID_FAIL_TO_RENEW':
                // Período de tolerância (Grace Period) ou tentativa de cobrança
                $newStatus = $subtype === 'GRACE_PERIOD' ? 'grace_period' : 'billing_retry';
                $subscription->update([
                    'status' => $newStatus,
                    'last_verified_at' => $now,
                ]);
                break;

            case 'REFUND':
                $subscription->update([
                    'status' => 'refunded',
                    'auto_renew' => false,
                    'last_verified_at' => $now,
                ]);

                SubscriptionTransaction::create([
                    'id' => 'txn-' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'subscription_id' => $subscription->id,
                    'provider' => 'apple',
                    'event_type' => 'REFUND',
                    'original_transaction_id' => $originalTransactionId,
                    'status' => 'refunded',
                ]);
                break;

            case 'REVOKE':
                $subscription->update([
                    'status' => 'revoked',
                    'auto_renew' => false,
                    'last_verified_at' => $now,
                ]);

                SubscriptionTransaction::create([
                    'id' => 'txn-' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'subscription_id' => $subscription->id,
                    'provider' => 'apple',
                    'event_type' => 'REVOCATION',
                    'original_transaction_id' => $originalTransactionId,
                    'status' => 'revoked',
                ]);
                break;
        }

        AuditLog::create([
            'id' => 'audit-' . Str::uuid(),
            'action' => 'APPLE_NOTIFICATION_PROCESSED',
            'actor_id' => 'apple-server',
            'actor_role' => 'SYSTEM',
            'target_id' => $subscription->id,
            'details' => json_encode([
                'notificationType' => $notificationType,
                'subtype' => $subtype,
            ]),
        ]);

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * Endpoint para Google Play Real-Time Developer Notifications (RTDN via Cloud Pub/Sub)
     */
    public function handleGoogleNotification(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('[IAP Webhook] Google Play RTDN recebida', [
            'hasMessage' => isset($payload['message']),
        ]);

        // Decodifica dados do Cloud Pub/Sub se envelopado em base64
        $dataStr = null;
        if (isset($payload['message']['data'])) {
            $dataStr = base64_decode($payload['message']['data']);
        }

        $rtdn = $dataStr ? json_decode($dataStr, true) : $payload;
        $subNotification = $rtdn['subscriptionNotification'] ?? null;

        if ($subNotification) {
            $purchaseToken = $subNotification['purchaseToken'] ?? null;
            $notificationType = (int) ($subNotification['notificationType'] ?? 0);

            if ($purchaseToken) {
                $sub = Subscription::where('purchase_token', $purchaseToken)->first();
                if ($sub) {
                    $now = Carbon::now();
                    // 2 = RENEWED, 3 = CANCELED, 12 = REVOKED, 13 = EXPIRED
                    if ($notificationType === 2) {
                        $isAnnual = Str::contains(strtolower($sub->product_id ?? ''), ['annual', 'anual']);
                        $sub->update([
                            'status' => 'active',
                            'current_period_end' => $isAnnual ? $now->copy()->addYear() : $now->copy()->addMonth(),
                            'auto_renew' => true,
                        ]);
                    } elseif ($notificationType === 13) {
                        $sub->update(['status' => 'expired', 'auto_renew' => false]);
                    } elseif ($notificationType === 12) {
                        $sub->update(['status' => 'revoked', 'auto_renew' => false]);
                    }
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }
}
