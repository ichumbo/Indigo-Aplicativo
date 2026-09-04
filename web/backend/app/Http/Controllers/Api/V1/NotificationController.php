<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = AppNotification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        $unreadCount = AppNotification::where('user_id', $user->id)
            ->where('read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
        ]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        AppNotification::where('user_id', $user->id)
            ->where('id', $id)
            ->update(['read' => true]);

        return response()->json(['message' => 'Notificação marcada como lida.']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();

        AppNotification::where('user_id', $user->id)
            ->update(['read' => true]);

        return response()->json(['message' => 'Todas as notificações foram marcadas como lidas.']);
    }
}
