<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();
        if (! $user && str_ends_with($email, '@dragoncorp.com')) {
            $user = User::where('email', str_replace('@dragoncorp.com', '@dragoncorp.app', $email))->first();
        }

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

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:6',
            'cref' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
        ]);

        $email = strtolower(trim($validated['email']));
        if (User::where('email', $email)->exists()) {
            return response()->json(['message' => 'Este e-mail já está em uso por outro usuário.'], 422);
        }

        $userId = 'trainer-' . uniqid();
        $user = User::create([
            'id' => $userId,
            'name' => $validated['name'],
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'cpf' => '00000000000',
            'phone' => $validated['phone'] ?? '(11) 90000-0000',
            'role' => 'TRAINER',
            'status' => 'ACTIVE',
            'professional_id' => $validated['cref'] ?? 'CREF Pendente',
            'trainer_code' => 'DRG-' . strtoupper(substr(uniqid(), -6)),
            'cref_verification_status' => 'pending',
            'is_email_verified' => false,
        ]);

        \App\Models\TrainerProfile::create([
            'id' => 'profile-' . $userId,
            'user_id' => $userId,
            'cref_number' => $validated['cref'] ?? 'Pendente',
            'cref_state' => 'SP',
            'cref_verification_status' => 'pending',
            'bio' => 'Personal Trainer DragonCorp',
            'specialties' => ['Musculação', 'Hipertrofia'],
            'service_type' => 'both',
            'experience_years' => 1,
            'status' => 'active',
        ]);

        \App\Models\Subscription::create([
            'id' => 'sub-' . $userId,
            'user_id' => $userId,
            'plan_id' => 'free',
            'status' => 'active',
            'current_period_start' => now(),
            'current_period_end' => now()->addDays(30),
            'student_limit' => 1,
        ]);

        $token = $user->createToken('dragoncorp-web-session')->plainTextToken;

        return response()->json([
            'message' => 'Conta criada com sucesso!',
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
        ], 201);
    }

    public function confirmAccount(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|min:4|max:8',
        ]);

        $email = strtolower(trim($request->input('email')));
        $user = User::where('email', $email)->first();
        if ($user) {
            $user->is_email_verified = true;
            $user->email_verified_at = now();
            $user->save();
        }

        return response()->json([
            'message' => 'Conta confirmada com sucesso!',
            'verified' => true,
        ]);
    }
}

