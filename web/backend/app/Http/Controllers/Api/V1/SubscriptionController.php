<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\TrainerStudent;
use App\Services\SubscriptionVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionVerificationService $verificationService
    ) {}

    /**
     * Consulta o estado atual da assinatura, limites e entitlements
     */
    public function show(Request $request): JsonResponse
    {
        $trainer = $request->user();
        $sub = $trainer->subscription;

        $activeStudentsCount = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('status', 'ACTIVE')
            ->count();

        // Se o usuário não possui assinatura gravada, inicializa explicitamente como plano FREE com limite 1
        if (!$sub) {
            return response()->json([
                'plan' => 'free',
                'provider' => 'free',
                'status' => 'free',
                'activeStudentsCount' => $activeStudentsCount,
                'studentLimit' => 1,
                'isPro' => false,
                'canAddStudents' => $activeStudentsCount < 1,
                'currentPeriodEnd' => null,
                'autoRenew' => false,
                'entitlements' => [
                    'canCreateWorkouts' => true,
                    'canCreateEvaluations' => true,
                    'canCreateProtocols' => true,
                    'canUseCustomBranding' => true,
                    'canAccessWebDashboard' => true,
                    'canUseAiAssistant' => true,
                    'canAccessAdvancedMetrics' => false,
                    'maxStudents' => 1,
                    'isPro' => false,
                ],
            ]);
        }

        $isPro = $sub->isPro();
        $limit = $isPro ? 9999 : $sub->student_limit;

        return response()->json([
            'id' => $sub->id,
            'plan' => $isPro ? 'pro' : 'free',
            'provider' => $sub->provider ?? 'apple',
            'productId' => $sub->product_id,
            'status' => $sub->status,
            'environment' => $sub->environment,
            'activeStudentsCount' => $activeStudentsCount,
            'studentLimit' => $limit,
            'isPro' => $isPro,
            'canAddStudents' => $isPro || ($activeStudentsCount < $limit),
            'currentPeriodStart' => $sub->current_period_start?->toIso8601String(),
            'currentPeriodEnd' => $sub->current_period_end?->toIso8601String(),
            'autoRenew' => (bool) $sub->auto_renew,
            'cancelAtPeriodEnd' => (bool) $sub->cancel_at_period_end,
            'entitlements' => $sub->getEntitlements(),
        ]);
    }

    /**
     * Valida uma compra oficial da App Store ou Google Play e ativa o plano Pro
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => 'required|string|in:apple,google',
            'productId' => 'required|string|max:150',
            'transactionId' => 'nullable|string|max:255',
            'originalTransactionId' => 'nullable|string|max:255',
            'purchaseToken' => 'nullable|string',
            'receiptData' => 'nullable|string',
            'environment' => 'nullable|string|in:sandbox,production,development',
            'isIntroductoryTrial' => 'nullable|boolean',
        ]);

        try {
            $result = $this->verificationService->verifyPurchase($request->user(), $validated);

            return response()->json([
                'success' => true,
                'isDuplicate' => $result['isDuplicate'],
                'message' => $result['message'],
                'subscription' => [
                    'id' => $result['subscription']->id,
                    'plan' => $result['subscription']->plan_id,
                    'status' => $result['subscription']->status,
                    'provider' => $result['subscription']->provider,
                    'productId' => $result['subscription']->product_id,
                    'expiresAt' => $result['subscription']->current_period_end?->toIso8601String(),
                    'autoRenew' => $result['subscription']->auto_renew,
                ],
                'entitlements' => $result['entitlements'],
            ], 200);
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro interno ao validar transação com a loja de aplicativos.',
            ], 500);
        }
    }

    /**
     * Restaura compras oficiais ativas da conta
     */
    public function restore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchases' => 'nullable|array',
            'purchases.*.provider' => 'required|string|in:apple,google',
            'purchases.*.productId' => 'required|string',
            'purchases.*.transactionId' => 'nullable|string',
            'purchases.*.originalTransactionId' => 'nullable|string',
            'purchases.*.purchaseToken' => 'nullable|string',
            'purchases.*.environment' => 'nullable|string',
        ]);

        try {
            $result = $this->verificationService->restorePurchases(
                $request->user(),
                $validated['purchases'] ?? []
            );

            return response()->json($result, $result['restored'] ? 200 : 404);
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (\Exception $e) {
            return response()->json([
                'restored' => false,
                'message' => 'Falha ao processar restauração de compras.',
            ], 500);
        }
    }

    /**
     * Cancela renovação automática da assinatura
     */
    public function cancel(Request $request): JsonResponse
    {
        try {
            $sub = $this->verificationService->cancelAutoRenew($request->user());

            return response()->json([
                'success' => true,
                'message' => 'Renovação automática cancelada com sucesso. O acesso permanecerá ativo até a data de expiração.',
                'expiresAt' => $sub->current_period_end?->toIso8601String(),
                'status' => $sub->status,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao cancelar renovação.'], 500);
        }
    }
}
