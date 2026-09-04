<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', strtolower(trim($validated['email'])))->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Credenciais inválidas. Verifique seu e-mail e senha.',
            ], 401);
        }

        if ($user->status === 'BLOCKED' || $user->status === 'INACTIVE') {
            return response()->json([
                'message' => 'Sua conta está inativa ou bloqueada. Entre em contato com o suporte.',
            ], 403);
        }

        // Criar token Bearer via Sanctum
        $token = $user->createToken('dragoncorp-web-session')->plainTextToken;

        $user->last_access_at = now();
        $user->save();

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'cpf' => $user->cpf,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'professionalId' => $user->professional_id,
                'trainerCode' => $user->trainer_code,
                'crefVerificationStatus' => $user->cref_verification_status,
                'isEmailVerified' => $user->is_email_verified,
            ],
            'trainerProfile' => $user->trainerProfile,
            'subscription' => $user->subscription,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'cpf' => $user->cpf,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'professionalId' => $user->professional_id,
                'trainerCode' => $user->trainer_code,
                'crefVerificationStatus' => $user->cref_verification_status,
                'isEmailVerified' => $user->is_email_verified,
            ],
            'trainerProfile' => $user->trainerProfile,
            'subscription' => $user->subscription,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sessão encerrada com sucesso.',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        return response()->json([
            'message' => 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        return response()->json([
            'message' => 'Senha redefinida com sucesso. Faça login com a nova senha.',
        ]);
    }
}
