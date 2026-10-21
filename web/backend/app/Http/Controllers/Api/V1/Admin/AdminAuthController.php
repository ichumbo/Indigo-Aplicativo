<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $throttleKey = 'admin_login:' . Strtolower($validated['email']) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            AuditService::log(
                $request,
                'ADMIN_LOGIN_LOCKED',
                null,
                "Tentativas excessivas de login administrativo. Bloqueado por {$seconds} segundos.",
                null,
                ['email' => $validated['email']],
                'BLOCKED',
                'alert'
            );
            return response()->json([
                'success' => false,
                'message' => "Muitas tentativas inválidas. Tente novamente em {$seconds} segundos.",
            ], 429);
        }

        $user = User::where('email', $validated['email'])->first();

        // Segurança: verificação genérica sem revelar se o e-mail existe
        if (!$user || !Hash::check($validated['password'], $user->password) || !$user->isAdmin()) {
            RateLimiter::hit($throttleKey, 300); // 5 minutos de retenção
            AuditService::log(
                $request,
                'ADMIN_LOGIN_FAILED',
                $user ? $user->id : null,
                'Tentativa de login administrativo com credenciais inválidas ou sem perfil admin.',
                null,
                ['email' => $validated['email']],
                'FAILED',
                'warning'
            );
            return response()->json([
                'success' => false,
                'message' => 'Credenciais administrativas inválidas ou sem permissão de acesso.',
            ], 401);
        }

        if ($user->status === 'SUSPENDED' || $user->status === 'BLOCKED') {
            AuditService::log(
                $request,
                'ADMIN_LOGIN_BLOCKED_STATUS',
                $user->id,
                'Tentativa de login de administrador com status bloqueado ou suspenso.',
                null,
                ['status' => $user->status],
                'DENIED',
                'alert'
            );
            return response()->json([
                'success' => false,
                'message' => 'Conta administrativa inativa ou suspensa. Contate o Super Administrador.',
            ], 403);
        }

        RateLimiter::clear($throttleKey);

        $user->last_access_at = now();
        $user->save();

        $token = $user->createToken('admin-session', ['admin', ...$user->getAdminPermissions()])->plainTextToken;

        AuditService::log(
            $request,
            'ADMIN_LOGIN_SUCCESS',
            $user->id,
            'Login administrativo bem-sucedido.',
            null,
            ['role' => $user->role],
            'SUCCESS',
            'info'
        );

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'avatar' => $user->avatar,
                'permissions' => $user->getAdminPermissions(),
                'last_access_at' => $user->last_access_at,
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'avatar' => $user->avatar,
                'permissions' => $user->getAdminPermissions(),
                'last_access_at' => $user->last_access_at,
            ],
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken()) {
            AuditService::log(
                $request,
                'ADMIN_LOGOUT',
                $user->id,
                'Logout administrativo realizado com sucesso.',
                null,
                null,
                'SUCCESS',
                'info'
            );
            $user->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Sessão administrativa encerrada com sucesso.',
        ]);
    }
}
