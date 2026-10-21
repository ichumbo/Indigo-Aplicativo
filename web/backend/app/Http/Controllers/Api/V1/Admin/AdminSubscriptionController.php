<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminSubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status');
        $provider = $request->query('provider');
        $plan = $request->query('plan');
        $environment = $request->query('environment');
        $perPage = min(100, max(5, (int) $request->query('per_page', 20)));

        $query = Subscription::query()->with(['user' => fn($q) => $q->select('id', 'name', 'email', 'avatar', 'role')]);

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($provider && $provider !== 'all') {
            $query->where('provider', $provider);
        }

        if ($plan && $plan !== 'all') {
            $query->where('plan_id', $plan);
        }

        if ($environment && $environment !== 'all') {
            $query->where('environment', $environment);
        }

        $paginator = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function sync(Request $request, $id)
    {
        $sub = Subscription::with('user')->find($id);
        if (!$sub) {
            return response()->json(['success' => false, 'message' => 'Assinatura não encontrada.'], 404);
        }

        $request->validate(['reason' => 'required|string|min:3']);

        $oldVerified = $sub->last_verified_at;
        $sub->last_verified_at = now();
        $sub->save();

        AuditService::log(
            $request,
            'SUBSCRIPTION_SYNC_REQUESTED',
            $sub->id,
            $request->input('reason'),
            ['last_verified_at' => $oldVerified],
            ['last_verified_at' => $sub->last_verified_at],
            'SUCCESS',
            'info',
            "Sincronização de assinatura do usuário {$sub->user?->name} solicitada."
        );

        return response()->json([
            'success' => true,
            'message' => 'Status da assinatura sincronizado com sucesso.',
            'subscription' => $sub,
        ]);
    }

    public function grantPromo(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'plan_id' => 'required|string|in:pro,vip',
            'days' => 'required|integer|min:1|max:365',
            'reason' => 'required|string|min:5',
        ]);

        $user = User::find($validated['user_id']);
        $sub = Subscription::where('user_id', $user->id)->first();

        $startDate = now();
        $endDate = now()->addDays((int) $validated['days']);

        $oldValues = $sub ? $sub->only(['plan_id', 'status', 'provider', 'current_period_end']) : null;

        if (!$sub) {
            $sub = new Subscription(['id' => (string) Str::uuid(), 'user_id' => $user->id]);
        }

        $sub->plan_id = $validated['plan_id'];
        $sub->status = 'active';
        $sub->provider = 'admin';
        $sub->environment = 'production';
        $sub->current_period_start = $startDate;
        $sub->current_period_end = $endDate;
        $sub->student_limit = 9999;
        $sub->last_verified_at = now();
        $sub->save();

        // Registra transação de concessão administrativa
        SubscriptionTransaction::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'subscription_id' => $sub->id,
            'provider' => 'admin',
            'event_type' => 'PROMO_GRANT',
            'transaction_id' => 'admin_promo_' . Str::random(16),
            'status' => 'granted',
            'environment' => 'production',
            'payload' => ['days' => $validated['days'], 'reason' => $validated['reason']],
        ]);

        AuditService::log(
            $request,
            'PROMO_ACCESS_GRANTED',
            $sub->id,
            $validated['reason'],
            $oldValues,
            $sub->only(['plan_id', 'status', 'provider', 'current_period_end']),
            'SUCCESS',
            'warning',
            "Concessão administrativa de plano {$validated['plan_id']} por {$validated['days']} dias para {$user->name}."
        );

        return response()->json([
            'success' => true,
            'message' => "Plano promocional concedido até " . $endDate->format('d/m/Y') . " para {$user->name}.",
            'subscription' => $sub,
        ]);
    }

    public function revokePromo(Request $request, $id)
    {
        $sub = Subscription::with('user')->find($id);
        if (!$sub) {
            return response()->json(['success' => false, 'message' => 'Assinatura não encontrada.'], 404);
        }

        $request->validate(['reason' => 'required|string|min:4']);

        $oldValues = $sub->only(['plan_id', 'status', 'provider', 'current_period_end']);

        $sub->plan_id = 'free';
        $sub->status = 'active';
        $sub->provider = 'free';
        $sub->student_limit = 1;
        $sub->current_period_end = null;
        $sub->save();

        AuditService::log(
            $request,
            'PROMO_ACCESS_REVOKED',
            $sub->id,
            $request->input('reason'),
            $oldValues,
            $sub->only(['plan_id', 'status', 'provider']),
            'SUCCESS',
            'warning',
            "Concessão promocional revogada para o usuário {$sub->user?->name}."
        );

        return response()->json([
            'success' => true,
            'message' => 'Concessão administrativa revogada com sucesso.',
            'subscription' => $sub,
        ]);
    }
}
