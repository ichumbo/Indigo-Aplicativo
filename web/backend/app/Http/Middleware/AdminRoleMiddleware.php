<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminRoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string|null  $permission
     */
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Acesso administrativo não autorizado. Esta área é restrita a administradores do DragonCorp.',
            ], 403);
        }

        // Se uma permissão específica foi requerida
        if ($permission && !$user->hasAdminPermission($permission)) {
            return response()->json([
                'success' => false,
                'message' => "Permissão insuficiente ({$permission}) para executar esta ação administrativa.",
            ], 403);
        }

        return $next($request);
    }
}
