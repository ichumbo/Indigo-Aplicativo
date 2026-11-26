<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RevenueCatService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class RevenueCatController extends Controller
{
    public function sync(Request $request, RevenueCatService $service): JsonResponse
    {
        try {
            $service->sync($request->user());
            $request->user()->unsetRelation('subscription');

            return app(SubscriptionController::class)->show($request);
        } catch (AuthorizationException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Confirmação da assinatura pendente. Tente sincronizar novamente em instantes.'], 503);
        }
    }

    public function webhook(Request $request, RevenueCatService $service): JsonResponse
    {
        $secret = config('services.revenuecat.webhook_authorization');
        if (! is_string($secret) || $secret === '' || ! hash_equals($secret, (string) $request->header('Authorization'))) {
            return response()->json(['message' => 'Não autorizado.'], 401);
        }
        $validated = $request->validate([
            'event' => 'required|array',
            'event.id' => 'required|string|max:255',
            'event.type' => 'required|string|max:100',
            'event.app_id' => 'required|string|max:255',
            'event.app_user_id' => 'required_unless:event.type,TEST|string|max:255',
            'event.environment' => 'required_unless:event.type,TEST|in:SANDBOX,PRODUCTION',
            'event.store' => 'nullable|string',
        ]);
        $event = $validated['event'];
        if (! config('services.revenuecat.app_id') || $event['app_id'] !== config('services.revenuecat.app_id')) {
            return response()->json(['message' => 'App RevenueCat inválido.'], 422);
        }
        if ($event['type'] === 'TEST') {
            return response()->json(['status' => 'ok']);
        }
        if (strtolower($event['environment']) !== config('services.revenuecat.environment')
            || ($event['store'] ?? null) !== 'APP_STORE') {
            return response()->json(['status' => 'ignored']);
        }
        $user = User::find($event['app_user_id']);
        if (! $user || (! $user->isTrainer() && ! $user->isSuperAdmin())) {
            return response()->json(['status' => 'unknown_user']);
        }
        try {
            $service->sync($user, $event);

            return response()->json(['status' => 'ok']);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Falha temporária na sincronização.'], 503);
        }
    }
}
