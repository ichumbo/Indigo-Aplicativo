<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSecurityController extends Controller
{
    public function admins(Request $request)
    {
        $admins = User::whereIn('role', ['SUPER_ADMIN', 'admin', 'SUPPORT_ADMIN', 'FINANCIAL_ADMIN', 'READONLY_ADMIN'])
            ->select('id', 'name', 'email', 'role', 'status', 'avatar', 'created_at', 'last_access_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $admins,
        ]);
    }

    public function createAdmin(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:SUPER_ADMIN,SUPPORT_ADMIN,FINANCIAL_ADMIN,READONLY_ADMIN',
            'reason' => 'required|string|min:4',
        ]);

        $admin = User::create([
            'id' => 'admin-' . Str::uuid(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'status' => 'ACTIVE',
            'is_email_verified' => true,
            'email_verified_at' => now(),
            'last_access_at' => now(),
        ]);

        AuditService::log(
            $request,
            'ADMIN_USER_CREATED',
            $admin->id,
            $validated['reason'],
            null,
            ['name' => $admin->name, 'email' => $admin->email, 'role' => $admin->role],
            'SUCCESS',
            'alert',
            "Novo administrador {$admin->name} ({$admin->role}) cadastrado pelo Super Admin."
        );

        return response()->json([
            'success' => true,
            'message' => "Administrador {$admin->name} criado com sucesso.",
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'status' => $admin->status,
                'created_at' => $admin->created_at,
            ],
        ], 201);
    }

    public function sessions(Request $request)
    {
        $sessions = DB::table('sessions')
            ->leftJoin('users', 'sessions.user_id', '=', 'users.id')
            ->select(
                'sessions.id',
                'sessions.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'users.role as user_role',
                'sessions.ip_address',
                'sessions.user_agent',
                'sessions.last_activity'
            )
            ->orderBy('sessions.last_activity', 'desc')
            ->limit(50)
            ->get();

        $formatted = $sessions->map(function ($s) {
            return [
                'id' => $s->id,
                'user_id' => $s->user_id,
                'user_name' => $s->user_name ?: 'Sessão Convidado',
                'user_email' => $s->user_email ?: '-',
                'user_role' => $s->user_role ?: 'GUEST',
                'ip_address' => $s->ip_address,
                'user_agent' => $s->user_agent,
                'last_activity_at' => date('Y-m-d H:i:s', $s->last_activity),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    public function revokeSession(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|min:3']);

        $session = DB::table('sessions')->where('id', $id)->first();
        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Sessão não encontrada.'], 404);
        }

        DB::table('sessions')->where('id', $id)->delete();

        AuditService::log(
            $request,
            'ADMIN_SESSION_TERMINATED',
            $session->user_id,
            $request->input('reason'),
            null,
            ['session_id' => $id, 'ip' => $session->ip_address],
            'SUCCESS',
            'warning',
            "Sessão ID {$id} encerrada administrativamente."
        );

        return response()->json([
            'success' => true,
            'message' => 'Sessão encerrada com sucesso.',
        ]);
    }
}
