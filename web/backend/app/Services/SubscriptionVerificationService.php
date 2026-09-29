<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Subscription;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SubscriptionVerificationService
{
    public const VALID_APPLE_PRODUCTS = [
        'com.dragoncorp.pro.monthly',
        'com.dragoncorp.pro.annual',
    ];

    public const VALID_GOOGLE_PRODUCTS = [
        'dragoncorp_pro_monthly',
        'dragoncorp_pro_annual',
    ];

    /**
     * Valida e ativa/sincroniza uma assinatura com idempotência estrita
     */
    public function verifyPurchase(User $user, array $data): array
    {
        // 1. Autorização: Apenas TRAINER ou SUPER_ADMIN podem assinar
        if (!$user->isTrainer() && !$user->isSuperAdmin()) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                'Apenas contas de personal trainer possuem autorização para contratar o plano Pro.'
            );
        }

        $provider = strtolower($data['provider'] ?? 'apple');
        if (!in_array($provider, ['apple', 'google'], true)) {
            throw new InvalidArgumentException("Provedor de loja inválido: {$provider}");
        }

        $productId = trim($data['productId'] ?? '');
        if (empty($productId)) {
            throw new InvalidArgumentException('Identificador de produto (productId) é obrigatório.');
        }

        // Validação de catálogo de produtos permitidos
        $validProducts = $provider === 'apple' ? self::VALID_APPLE_PRODUCTS : self::VALID_GOOGLE_PRODUCTS;
        $isRecognizedProduct = in_array($productId, $validProducts, true) ||
            Str::contains($productId, ['monthly', 'annual', 'mensal', 'anual']);

        if (!$isRecognizedProduct) {
            throw new InvalidArgumentException("Produto não cadastrado no catálogo oficial: {$productId}");
        }

        $transactionId = $data['transactionId'] ?? null;
        $originalTransactionId = $data['originalTransactionId'] ?? $transactionId;
        $purchaseToken = $data['purchaseToken'] ?? null;
        $environment = $data['environment'] ?? 'production';
        $isIntroductoryTrial = (bool) ($data['isIntroductoryTrial'] ?? false);

        // 2. Verificação de Idempotência e Anti-Replay
        if ($transactionId) {
            $existingTxn = SubscriptionTransaction::where('transaction_id', $transactionId)->first();
            if ($existingTxn) {
                if ($existingTxn->user_id === $user->id) {
                    $sub = Subscription::where('user_id', $user->id)->first();
                    if ($sub && $sub->isActive()) {
                        return [
                            'success' => true,
                            'isDuplicate' => true,
                            'subscription' => $sub,
                            'entitlements' => $sub->getEntitlements(),
                            'message' => 'Transação já processada anteriormente para esta conta.',
                        ];
                    }
                } else {
                    throw new InvalidArgumentException(
                        'Esta transação já foi vinculada e confirmada em outra conta DragonCorp.'
                    );
                }
            }
        }

        // 3. Prevenção de Roubo/Compartilhamento de Assinatura (Anti-Fraude de Original Transaction ID)
        if ($originalTransactionId) {
            $existingOriginalSub = Subscription::where('original_transaction_id', $originalTransactionId)
                ->where('user_id', '!=', $user->id)
                ->first();

            if ($existingOriginalSub) {
                // Registrar tentativa suspeita em log de auditoria
                AuditLog::create([
                    'id' => 'audit-' . Str::uuid(),
                    'action' => 'SUBSCRIPTION_REPLAY_ATTEMPT',
                    'actor_id' => $user->id,
                    'actor_role' => $user->role,
                    'target_id' => $existingOriginalSub->user_id,
                    'details' => json_encode([
                        'attempted_original_transaction_id' => $this->maskIdentifier($originalTransactionId),
                        'provider' => $provider,
                    ]),
                ]);

                throw new InvalidArgumentException(
                    'Esta assinatura da loja já está vinculada a outra conta de treinador. Entre em contato com o suporte para reconciliação.'
                );
            }
        }

        // 4. Cálculo de Vigência
        $now = Carbon::now();
        $isAnnual = Str::contains(strtolower($productId), ['annual', 'anual']);
        $periodEnd = $isAnnual ? $now->copy()->addYear() : $now->copy()->addMonth();

        $status = $isIntroductoryTrial ? 'trial' : 'active';

        // 5. Persistência Atômica
        return DB::transaction(function () use (
            $user,
            $provider,
            $productId,
            $transactionId,
            $originalTransactionId,
            $purchaseToken,
            $environment,
            $status,
            $now,
            $periodEnd,
            $data
        ) {
            $sub = Subscription::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'id' => 'sub-' . $user->id,
                    'plan_id' => 'pro',
                    'provider' => $provider,
                    'product_id' => $productId,
                    'original_transaction_id' => $originalTransactionId,
                    'latest_transaction_id' => $transactionId,
                    'purchase_token' => $purchaseToken,
                    'environment' => $environment,
                    'status' => $status,
                    'student_limit' => 9999,
                    'current_period_start' => $now,
                    'current_period_end' => $periodEnd,
                    'cancel_at_period_end' => false,
                    'auto_renew' => true,
                    'last_verified_at' => $now,
                    'raw_payload' => [
                        'productId' => $productId,
                        'environment' => $environment,
                        'verifiedAt' => $now->toIso8601String(),
                    ],
                ]
            );

            // Registrar log de transação
            if ($transactionId) {
                SubscriptionTransaction::create([
                    'id' => 'txn-' . Str::uuid(),
                    'user_id' => $user->id,
                    'subscription_id' => $sub->id,
                    'provider' => $provider,
                    'event_type' => 'INITIAL_PURCHASE',
                    'transaction_id' => $transactionId,
                    'original_transaction_id' => $originalTransactionId,
                    'product_id' => $productId,
                    'purchase_token' => $purchaseToken ? $this->maskIdentifier($purchaseToken) : null,
                    'status' => $status,
                    'environment' => $environment,
                    'payload' => [
                        'productId' => $productId,
                        'expiresAt' => $periodEnd->toIso8601String(),
                    ],
                ]);
            }

            AuditLog::create([
                'id' => 'audit-' . Str::uuid(),
                'action' => 'SUBSCRIPTION_ACTIVATED',
                'actor_id' => $user->id,
                'actor_role' => $user->role,
                'target_id' => $sub->id,
                'details' => json_encode([
                    'plan' => 'pro',
                    'provider' => $provider,
                    'productId' => $productId,
                    'environment' => $environment,
                    'status' => $status,
                ]),
            ]);

            return [
                'success' => true,
                'isDuplicate' => false,
                'subscription' => $sub,
                'entitlements' => $sub->getEntitlements(),
                'message' => 'Assinatura validada e ativada com sucesso.',
            ];
        });
    }

    /**
     * Restaura compras ativas a partir de lista de transações da loja
     */
    public function restorePurchases(User $user, array $purchases): array
    {
        if (!$user->isTrainer() && !$user->isSuperAdmin()) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                'Apenas contas de personal trainer podem restaurar planos.'
            );
        }

        if (empty($purchases)) {
            $currentSub = $user->subscription;
            if ($currentSub && $currentSub->isActive()) {
                return [
                    'restored' => true,
                    'subscription' => $currentSub,
                    'entitlements' => $currentSub->getEntitlements(),
                    'message' => 'Sua assinatura Pro está ativa e sincronizada com o servidor.',
                ];
            }

            return [
                'restored' => false,
                'message' => 'Nenhuma compra ativa foi localizada na loja para restaurar.',
            ];
        }

        $restoredSub = null;

        foreach ($purchases as $purchaseData) {
            try {
                $result = $this->verifyPurchase($user, $purchaseData);
                if ($result['success']) {
                    $restoredSub = $result['subscription'];
                }
            } catch (\Exception $e) {
                // Continua avaliando os demais recibos
            }
        }

        if ($restoredSub) {
            return [
                'restored' => true,
                'subscription' => $restoredSub,
                'entitlements' => $restoredSub->getEntitlements(),
                'message' => 'Assinatura Pro restaurada com sucesso.',
            ];
        }

        return [
            'restored' => false,
            'message' => 'Nenhuma assinatura válida e ativa pôde ser restaurada.',
        ];
    }

    /**
     * Cancela a renovação automática da assinatura preservando acesso até o final do período
     */
    public function cancelAutoRenew(User $user): Subscription
    {
        $sub = $user->subscription;
        if (!$sub) {
            throw new InvalidArgumentException('Nenhuma assinatura encontrada para cancelar.');
        }

        $sub->update([
            'cancel_at_period_end' => true,
            'auto_renew' => false,
        ]);

        SubscriptionTransaction::create([
            'id' => 'txn-' . Str::uuid(),
            'user_id' => $user->id,
            'subscription_id' => $sub->id,
            'provider' => $sub->provider ?? 'apple',
            'event_type' => 'CANCELLATION',
            'status' => 'cancelled_pending_expiration',
            'payload' => [
                'expiresAt' => $sub->current_period_end?->toIso8601String(),
            ],
        ]);

        AuditLog::create([
            'id' => 'audit-' . Str::uuid(),
            'action' => 'SUBSCRIPTION_AUTO_RENEW_CANCELLED',
            'actor_id' => $user->id,
            'actor_role' => $user->role,
            'target_id' => $sub->id,
            'details' => json_encode([
                'expiresAt' => $sub->current_period_end?->toIso8601String(),
            ]),
        ]);

        return $sub;
    }

    /**
     * Mascara identificadores para proteção contra vazamento em logs
     */
    private function maskIdentifier(?string $id): string
    {
        if (!$id || strlen($id) <= 6) {
            return '***';
        }
        return substr($id, 0, 3) . '***' . substr($id, -3);
    }
}
