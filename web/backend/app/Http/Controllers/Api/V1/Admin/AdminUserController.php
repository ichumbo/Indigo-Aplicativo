<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Subscription;
use App\Models\TrainerStudent;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) return $email;
        $name = $parts[0];
        $domain = $parts[1];
        $maskedName = strlen($name) > 2 ? substr($name, 0, 2) . str_repeat('*', max(1, strlen($name) - 2)) : $name . '*';
        return $maskedName . '@' . $domain;
    }

    private function maskPhone(?string $phone): ?string
    {
        if (!$phone) return null;
        $clean = preg_replace('/\D/', '', $phone);
        if (strlen($clean) >= 10) {
            return substr($phone, 0, 4) . ' ****-' . substr($phone, -4);
        }
        return '****-' . substr($phone, -4);
    }

    public function index(Request $request)
    {
        $search = $request->query('search');
        $role = $request->query('role');
        $status = $request->query('status');
        $plan = $request->query('plan');
        $linked = $request->query('linked');
        $perPage = min(100, max(5, (int) $request->query('per_page', 15)));
        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = strtolower($request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = User::query()->with(['subscription', 'trainerProfile', 'studentProfile']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%")
                  ->orWhere('cpf', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($role && $role !== 'all') {
            if ($role === 'trainer') {
                $query->whereIn('role', ['TRAINER', 'trainer']);
            } elseif ($role === 'student') {
                $query->whereIn('role', ['STUDENT', 'student']);
            } elseif ($role === 'admin') {
                $query->whereIn('role', ['SUPER_ADMIN', 'admin', 'SUPPORT_ADMIN', 'FINANCIAL_ADMIN', 'READONLY_ADMIN']);
            } else {
                $query->where('role', strtoupper($role));
            }
        }

        if ($status && $status !== 'all') {
            $query->where('status', strtoupper($status));
        }

        if ($plan && $plan !== 'all') {
            $query->whereHas('subscription', function ($q) use ($plan) {
                $q->where('plan_id', $plan);
            });
        }

        if ($linked && $linked !== 'all') {
            if ($linked === 'yes') {
                $query->where(function ($q) {
                    $q->whereHas('trainerRelationships', fn($sq) => $sq->where('status', 'active'))
                      ->orWhereHas('studentRelationships', fn($sq) => $sq->where('status', 'active'));
                });
            } elseif ($linked === 'no') {
                $query->where(function ($q) {
                    $q->whereDoesntHave('trainerRelationships', fn($sq) => $sq->where('status', 'active'))
                      ->whereDoesntHave('studentRelationships', fn($sq) => $sq->where('status', 'active'));
                });
            }
        }

        $allowedSorts = ['name', 'email', 'created_at', 'last_access_at', 'status', 'role'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $paginator = $query->paginate($perPage);

        $currentUser = $request->user();
        $canViewUnmasked = $currentUser && $currentUser->isSuperAdmin();

        $items = collect($paginator->items())->map(function ($u) use ($canViewUnmasked) {
            $sub = $u->subscription;
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $canViewUnmasked ? $u->email : $this->maskEmail($u->email),
                'phone' => $canViewUnmasked ? $u->phone : $this->maskPhone($u->phone),
                'avatar' => $u->avatar,
                'role' => $u->role,
                'status' => $u->status,
                'plan_id' => $sub ? $sub->plan_id : 'free',
                'plan_status' => $sub ? $sub->status : 'none',
                'provider' => $sub ? $sub->provider : 'free',
                'created_at' => $u->created_at ? $u->created_at->toIso8601String() : null,
                'last_access_at' => $u->last_access_at ? $u->last_access_at->toIso8601String() : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = User::with(['trainerProfile', 'studentProfile', 'subscription'])->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado.',
            ], 404);
        }

        $currentUser = $request->user();
        $canViewUnmasked = $currentUser && $currentUser->isSuperAdmin();

        // Relacionamentos
        $trainerStudents = [];
        $studentTrainers = [];

        if ($user->isTrainer()) {
            $trainerStudents = TrainerStudent::where('trainer_id', $user->id)
                ->with(['student' => fn($q) => $q->select('id', 'name', 'email', 'avatar', 'status')])
                ->get();
        }

        if ($user->isStudent()) {
            $studentTrainers = TrainerStudent::where('student_id', $user->id)
                ->with(['trainer' => fn($q) => $q->select('id', 'name', 'email', 'avatar', 'professional_id')])
                ->get();
        }

        // Timeline de auditoria sobre este usuário
        $audits = AuditLog::where('target_id', $user->id)
            ->orWhere('actor_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(30)
            ->get();

        // Sessões ativas reais no banco de dados (se houver)
        $sessionsCount = DB::table('sessions')->where('user_id', $user->id)->count();

        // Assinatura formatada
        $sub = $user->subscription;
        $subscriptionData = $sub ? [
            'id' => $sub->id,
            'plan_id' => $sub->plan_id,
            'status' => $sub->status,
            'provider' => $sub->provider,
            'product_id' => $sub->product_id,
            'environment' => $sub->environment,
            'current_period_start' => $sub->current_period_start,
            'current_period_end' => $sub->current_period_end,
            'auto_renew' => $sub->auto_renew,
            'student_limit' => $sub->student_limit,
            'last_verified_at' => $sub->last_verified_at,
        ] : null;

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $canViewUnmasked ? $user->email : $this->maskEmail($user->email),
                'phone' => $canViewUnmasked ? $user->phone : $this->maskPhone($user->phone),
                'cpf' => $canViewUnmasked ? $user->cpf : '***.***.***-**',
                'avatar' => $user->avatar,
                'role' => $user->role,
                'status' => $user->status,
                'is_email_verified' => $user->is_email_verified,
                'email_verified_at' => $user->email_verified_at,
                'cref_verification_status' => $user->cref_verification_status,
                'professional_id' => $user->professional_id,
                'trainer_code' => $user->trainer_code,
                'created_at' => $user->created_at,
                'last_access_at' => $user->last_access_at,
                'sessions_count' => $sessionsCount,
            ],
            'trainer_profile' => $user->trainerProfile,
            'student_profile' => $user->studentProfile,
            'trainer_students' => $trainerStudents,
            'student_trainers' => $studentTrainers,
            'subscription' => $subscriptionData,
            'activity_timeline' => $audits,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:30',
            'status' => 'sometimes|string|in:ACTIVE,INACTIVE,PENDING_REVIEW,BLOCKED,SUSPENDED',
            'cref_verification_status' => 'sometimes|string|in:unverified,pending_review,verified_manual,rejected',
            'reason' => 'required|string|min:3',
        ]);

        $oldValues = $user->only(['name', 'phone', 'status', 'cref_verification_status']);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['phone'])) $user->phone = $validated['phone'];
        if (isset($validated['status'])) $user->status = $validated['status'];
        if (isset($validated['cref_verification_status'])) $user->cref_verification_status = $validated['cref_verification_status'];

        $user->save();

        AuditService::log(
            $request,
            'USER_UPDATED',
            $user->id,
            $validated['reason'],
            $oldValues,
            $user->only(['name', 'phone', 'status', 'cref_verification_status']),
            'SUCCESS',
            'info'
        );

        return response()->json([
            'success' => true,
            'message' => 'Usuário atualizado com sucesso.',
            'user' => $user,
        ]);
    }

    public function suspend(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:4',
            'confirm_text' => 'required|string|in:SUSPENDER',
        ]);

        $oldStatus = $user->status;
        $user->status = 'SUSPENDED';
        $user->save();

        // Revoga sessões
        $user->tokens()->delete();
        DB::table('sessions')->where('user_id', $user->id)->delete();

        AuditService::log(
            $request,
            'USER_SUSPENDED',
            $user->id,
            $validated['reason'],
            ['status' => $oldStatus],
            ['status' => 'SUSPENDED'],
            'SUCCESS',
            'alert',
            "Conta de {$user->name} suspensa com revogação imediata de sessões ativas."
        );

        return response()->json([
            'success' => true,
            'message' => "Usuário {$user->name} suspenso com sucesso. Todas as sessões foram encerradas.",
        ]);
    }

    public function reactivate(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:4',
        ]);

        $oldStatus = $user->status;
        $user->status = 'ACTIVE';
        $user->save();

        AuditService::log(
            $request,
            'USER_REACTIVATED',
            $user->id,
            $validated['reason'],
            ['status' => $oldStatus],
            ['status' => 'ACTIVE'],
            'SUCCESS',
            'info',
            "Conta de {$user->name} reativada."
        );

        return response()->json([
            'success' => true,
            'message' => "Usuário {$user->name} reativado com sucesso.",
        ]);
    }

    public function revokeSessions(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $request->validate(['reason' => 'required|string|min:3']);

        $tokenCount = $user->tokens()->count();
        $user->tokens()->delete();
        $sessionCount = DB::table('sessions')->where('user_id', $user->id)->delete();

        AuditService::log(
            $request,
            'SESSIONS_REVOKED',
            $user->id,
            $request->input('reason'),
            null,
            ['tokens_revoked' => $tokenCount, 'sessions_revoked' => $sessionCount],
            'SUCCESS',
            'warning',
            "Revogação forçada de todos os acessos do usuário {$user->name}."
        );

        return response()->json([
            'success' => true,
            'message' => "Todas as sessões e tokens de {$user->name} foram revogados.",
        ]);
    }

    public function passwordReset(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $request->validate(['reason' => 'required|string|min:3']);

        $resetToken = Str::random(40);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => hash('sha256', $resetToken), 'created_at' => now()]
        );

        AuditService::log(
            $request,
            'PASSWORD_RESET_REQUESTED',
            $user->id,
            $request->input('reason'),
            null,
            ['email' => $user->email],
            'SUCCESS',
            'info',
            "Solicitação de redefinição de senha gerada administrativamente para {$user->name}."
        );

        return response()->json([
            'success' => true,
            'message' => "Link/token seguro de recuperação de senha gerado para {$user->email}.",
            'reset_link' => "/esqueci-senha?token={$resetToken}&email=" . urlencode($user->email),
        ]);
    }

    public function anonymize(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:5',
            'confirm_text' => 'required|string|in:ANONIMIZAR',
        ]);

        $anonId = 'anon_' . Str::random(10);
        $oldSanitized = [
            'name' => $this->maskEmail($user->email),
            'role' => $user->role,
        ];

        DB::transaction(function () use ($user, $anonId) {
            $user->name = "Usuário Anonimizado ({$anonId})";
            $user->email = "{$anonId}@anon.dragoncorp.app";
            $user->phone = null;
            $user->cpf = null;
            $user->avatar = null;
            $user->status = 'ANONYMIZED';
            $user->save();

            // Revoga acessos
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
        });

        AuditService::log(
            $request,
            'ACCOUNT_ANONYMIZED',
            $user->id,
            $validated['reason'],
            $oldSanitized,
            ['status' => 'ANONYMIZED', 'anon_id' => $anonId],
            'SUCCESS',
            'alert',
            "Dados pessoais de identificação do usuário foram anonimizados permanentemente (LGPD)."
        );

        return response()->json([
            'success' => true,
            'message' => "Conta anonimizada com sucesso conforme diretrizes da LGPD.",
        ]);
    }

    public function export(Request $request, $id)
    {
        $user = User::with(['trainerProfile', 'studentProfile', 'subscription'])->find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuário não encontrado.'], 404);
        }

        $request->validate(['reason' => 'required|string|min:3']);

        AuditService::log(
            $request,
            'DATA_EXPORT_REQUESTED',
            $user->id,
            $request->input('reason'),
            null,
            null,
            'SUCCESS',
            'info',
            "Exportação LGPD dos dados do usuário {$user->name} solicitada."
        );

        $exportData = [
            'profile' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ],
            'subscription' => $user->subscription ? [
                'plan_id' => $user->subscription->plan_id,
                'status' => $user->subscription->status,
                'provider' => $user->subscription->provider,
            ] : null,
            'exported_at' => now()->toIso8601String(),
            'export_disclaimer' => 'Relatório oficial DragonCorp de portabilidade e transparência de dados (LGPD Art. 18).',
        ];

        return response()->json([
            'success' => true,
            'export' => $exportData,
        ]);
    }
}
