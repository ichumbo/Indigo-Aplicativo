<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\PushDevice;
use App\Models\UserNotificationPreference;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NotificationController extends Controller
{
    /**
     * Lista notificações com suporte a filtros de categoria, lidas/não lidas e paginação.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $category = $request->query('category');
        $unreadOnly = $request->boolean('unread_only', false);
        $perPage = min((int) $request->query('per_page', 50), 100);

        $query = AppNotification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('recipient_id', $user->id);
        })
        ->where('status', '!=', 'dismissed');

        if ($category && $category !== 'all') {
            $query->where('category', $category);
        }

        if ($unreadOnly) {
            $query->where('read', false);
        }

        $notifications = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $unreadCount = AppNotification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('recipient_id', $user->id);
        })
        ->where('status', '!=', 'dismissed')
        ->where('read', false)
        ->count();

        return response()->json([
            'notifications' => $notifications->items(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
            ],
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * Marca uma notificação individual como lida.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $now = Carbon::now();

        $updated = AppNotification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('recipient_id', $user->id);
        })
        ->where('id', $id)
        ->update([
            'read' => true,
            'read_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'success' => $updated > 0,
            'message' => 'Notificação marcada como lida.',
        ]);
    }

    /**
     * Marca todas as notificações do usuário como lidas.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $now = Carbon::now();

        AppNotification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('recipient_id', $user->id);
        })
        ->where('read', false)
        ->update([
            'read' => true,
            'read_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Todas as notificações foram marcadas como lidas.',
        ]);
    }

    /**
     * Descarta ou oculta uma notificação (dismiss).
     */
    public function dismiss(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        AppNotification::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('recipient_id', $user->id);
        })
        ->where('id', $id)
        ->update([
            'status' => 'dismissed',
            'updated_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notificação dispensada com sucesso.',
        ]);
    }

    /**
     * Registra ou atualiza o Push Token do dispositivo.
     */
    public function registerDevice(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'platform' => 'required|in:ios,android,web',
            'provider' => 'nullable|in:expo,fcm,apns,web',
            'device_id' => 'nullable|string',
            'app_version' => 'nullable|string',
            'environment' => 'nullable|in:development,staging,production',
        ]);

        $user = $request->user();
        $now = Carbon::now();
        $deviceId = $request->input('device_id');
        $token = $request->input('token');

        // Desativa instâncias antigas com o mesmo token em outros usuários (evita vazamento em troca de conta)
        PushDevice::where('token', $token)
            ->where('user_id', '!=', $user->id)
            ->update([
                'active' => false,
                'invalidated_at' => $now,
            ]);

        $device = PushDevice::where('user_id', $user->id)
            ->where(function ($q) use ($deviceId, $token) {
                if ($deviceId) {
                    $q->where('device_id', $deviceId);
                } else {
                    $q->where('token', $token);
                }
            })
            ->first();

        if ($device) {
            $device->update([
                'token' => $token,
                'provider' => $request->input('provider', 'expo'),
                'platform' => $request->input('platform'),
                'app_version' => $request->input('app_version', $device->app_version),
                'environment' => $request->input('environment', 'production'),
                'active' => true,
                'last_seen_at' => $now,
                'invalidated_at' => null,
            ]);
        } else {
            $device = PushDevice::create([
                'id' => 'dev_' . Str::uuid(),
                'user_id' => $user->id,
                'tenant_id' => $user->tenant_id ?? null,
                'token' => $token,
                'provider' => $request->input('provider', 'expo'),
                'platform' => $request->input('platform'),
                'device_id' => $deviceId,
                'app_version' => $request->input('app_version', '1.0.0'),
                'environment' => $request->input('environment', 'production'),
                'active' => true,
                'last_seen_at' => $now,
            ]);
        }

        return response()->json([
            'success' => true,
            'device_id' => $device->id,
            'message' => 'Dispositivo registrado com sucesso para notificações push.',
        ]);
    }

    /**
     * Desassocia e desativa o token do dispositivo no logout do usuário.
     */
    public function deregisterDevice(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'nullable|string',
            'device_id' => 'nullable|string',
        ]);

        $user = $request->user();
        $token = $request->input('token');
        $deviceId = $request->input('device_id');

        $query = PushDevice::where('user_id', $user->id);
        if ($token) {
            $query->where('token', $token);
        } elseif ($deviceId) {
            $query->where('device_id', $deviceId);
        }

        $query->update([
            'active' => false,
            'invalidated_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Dispositivo desregistrado com sucesso.',
        ]);
    }

    /**
     * Obtém as preferências de notificação do usuário.
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();
        $record = UserNotificationPreference::where('user_id', $user->id)->first();

        $defaults = [
            'push_enabled' => true,
            'in_app_enabled' => true,
            'quiet_hours_enabled' => true,
            'quiet_hours_start' => '22:00',
            'quiet_hours_end' => '08:00',
            'timezone' => 'America/Sao_Paulo',
            'categories' => [
                'workout' => true,
                'assessment' => true,
                'anamnesis' => true,
                'protocol' => true,
                'checkin' => true,
                'feedback' => true,
                'pain_report' => true,
                'appointment' => true,
                'message' => true,
                'hydration' => false, // Opt-in estrito!
                'achievement' => true,
                'subscription' => true,
                'security' => true, // Obrigatório
            ],
        ];

        $preferences = $record ? array_merge($defaults, $record->preferences ?? []) : $defaults;

        return response()->json([
            'preferences' => $preferences,
        ]);
    }

    /**
     * Atualiza as preferências de notificação do usuário.
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $request->user();
        $updates = $request->input('preferences', []);

        // Segurança e conformidade: a categoria 'security' é inalienável
        if (isset($updates['categories'])) {
            $updates['categories']['security'] = true;
        }

        $record = UserNotificationPreference::where('user_id', $user->id)->first();

        if ($record) {
            $merged = array_merge($record->preferences ?? [], $updates);
            $record->update(['preferences' => $merged]);
        } else {
            $merged = $updates;
            $record = UserNotificationPreference::create([
                'id' => 'pref_' . Str::uuid(),
                'user_id' => $user->id,
                'preferences' => $merged,
            ]);
        }

        return response()->json([
            'success' => true,
            'preferences' => $record->preferences,
            'message' => 'Preferências de notificação salvas com sucesso.',
        ]);
    }
}
