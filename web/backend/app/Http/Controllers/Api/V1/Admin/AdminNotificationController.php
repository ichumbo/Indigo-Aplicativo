<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminNotificationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(100, max(5, (int) $request->query('per_page', 20)));

        $notifications = AppNotification::orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function broadcast(Request $request)
    {
        $validated = $request->validate([
            'audience' => 'required|string|in:all,trainer,student',
            'title' => 'required|string|max:120',
            'message' => 'required|string|max:500',
            'reason' => 'required|string|min:4',
        ]);

        $query = User::where('status', 'ACTIVE');
        if ($validated['audience'] === 'trainer') {
            $query->whereIn('role', ['TRAINER', 'trainer']);
        } elseif ($validated['audience'] === 'student') {
            $query->whereIn('role', ['STUDENT', 'student']);
        }

        $targetUsers = $query->pluck('id');
        $count = 0;

        foreach ($targetUsers as $userId) {
            AppNotification::create([
                'id' => (string) Str::uuid(),
                'user_id' => $userId,
                'audience' => $validated['audience'],
                'type' => 'operational_announcement',
                'title' => $validated['title'],
                'message' => $validated['message'],
                'read' => false,
            ]);
            $count++;
        }

        AuditService::log(
            $request,
            'ADMIN_BROADCAST_SENT',
            null,
            $validated['reason'],
            null,
            ['audience' => $validated['audience'], 'title' => $validated['title'], 'recipients_count' => $count],
            'SUCCESS',
            'info',
            "Aviso operacional emitido para {$count} usuários ({$validated['audience']})."
        );

        return response()->json([
            'success' => true,
            'message' => "Notificação operacional enviada com sucesso para {$count} usuários.",
            'recipients_count' => $count,
        ]);
    }
}
