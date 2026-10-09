<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
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

                AppNotification::create([
                    'id' => 'notif_' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'recipient_id' => $subscription->user_id,
                    'audience' => 'trainer',
                    'type' => 'subscription.renewed',
                    'category' => 'subscription',
                    'priority' => 'normal',
                    'title' => 'Assinatura Renovada com Sucesso!',
                    'message' => 'Sua assinatura PRO foi renovada pela App Store.',
                    'body' => 'Sua assinatura PRO foi renovada pela App Store com vigência até ' . $newEnd->format('d/m/Y') . '.',
                    'deep_link' => 'dragoncorp://subscription',
                    'dedupe_key' => 'sub_renew_' . $originalTransactionId . '_' . $now->format('Y-m'),
                    'status' => 'delivered',
                    'read' => false,
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

                AppNotification::create([
                    'id' => 'notif_' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'recipient_id' => $subscription->user_id,
                    'audience' => 'trainer',
                    'type' => 'subscription.expired',
                    'category' => 'subscription',
                    'priority' => 'critical',
                    'title' => 'Assinatura PRO Expirada',
                    'message' => 'Sua assinatura expirou. Renove para continuar com alunos ilimitados.',
                    'body' => 'Sua assinatura expirou. Escolha um plano para reativar seu acesso PRO completo.',
                    'deep_link' => 'dragoncorp://subscription',
                    'dedupe_key' => 'sub_expired_' . $originalTransactionId,
                    'status' => 'delivered',
                    'read' => false,
                ]);
                break;

            case 'DID_FAIL_TO_RENEW':
                // Período de tolerância (Grace Period) ou tentativa de cobrança
                $newStatus = $subtype === 'GRACE_PERIOD' ? 'grace_period' : 'billing_retry';
                $subscription->update([
                    'status' => $newStatus,
                    'last_verified_at' => $now,
                ]);

                AppNotification::create([
                    'id' => 'notif_' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'recipient_id' => $subscription->user_id,
                    'audience' => 'trainer',
                    'type' => 'subscription.renewal_failed',
                    'category' => 'subscription',
                    'priority' => 'critical',
                    'title' => 'Aviso de Cobrança da Assinatura',
                    'message' => 'Houve uma falha na renovação da sua assinatura pela App Store.',
                    'body' => 'A App Store não conseguiu processar a renovação. Atualize sua forma de pagamento para evitar bloqueio.',
                    'deep_link' => 'dragoncorp://subscription',
                    'dedupe_key' => 'sub_fail_' . $originalTransactionId . '_' . $now->format('Y-m-d'),
                    'status' => 'delivered',
                    'read' => false,
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

                AppNotification::create([
                    'id' => 'notif_' . Str::uuid(),
                    'user_id' => $subscription->user_id,
                    'recipient_id' => $subscription->user_id,
                    'audience' => 'trainer',
                    'type' => 'subscription.refunded',
                    'category' => 'subscription',
                    'priority' => 'high',
                    'title' => 'Reembolso Processado',
                    'message' => 'O reembolso da sua assinatura foi confirmado.',
                    'body' => 'O reembolso foi processado pela loja de aplicativos.',
                    'deep_link' => 'dragoncorp://subscription',
                    'status' => 'delivered',
                    'read' => false,
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
                        $newEnd = $isAnnual ? $now->copy()->addYear() : $now->copy()->addMonth();
                        $sub->update([
                            'status' => 'active',
                            'current_period_end' => $newEnd,
                            'auto_renew' => true,
                        ]);

                        AppNotification::create([
                            'id' => 'notif_' . Str::uuid(),
                            'user_id' => $sub->user_id,
                            'recipient_id' => $sub->user_id,
                            'audience' => 'trainer',
                            'type' => 'subscription.renewed',
                            'category' => 'subscription',
                            'priority' => 'normal',
                            'title' => 'Assinatura Renovada com Sucesso!',
                            'message' => 'Sua assinatura PRO foi renovada pelo Google Play.',
                            'body' => 'Sua assinatura PRO foi renovada pelo Google Play com vigência até ' . $newEnd->format('d/m/Y') . '.',
                            'deep_link' => 'dragoncorp://subscription',
                            'status' => 'delivered',
                            'read' => false,
                        ]);
                    } elseif ($notificationType === 13) {
                        $sub->update(['status' => 'expired', 'auto_renew' => false]);

                        AppNotification::create([
                            'id' => 'notif_' . Str::uuid(),
                            'user_id' => $sub->user_id,
                            'recipient_id' => $sub->user_id,
                            'audience' => 'trainer',
                            'type' => 'subscription.expired',
                            'category' => 'subscription',
                            'priority' => 'critical',
                            'title' => 'Assinatura PRO Expirada',
                            'message' => 'Sua assinatura expirou no Google Play.',
                            'body' => 'Sua assinatura expirou. Renove no Google Play para continuar gerenciando alunos ilimitados.',
                            'deep_link' => 'dragoncorp://subscription',
                            'status' => 'delivered',
                            'read' => false,
                        ]);
                    } elseif ($notificationType === 12) {
                        $sub->update(['status' => 'revoked', 'auto_renew' => false]);
                    }
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }
}
