<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Subscription;
use App\Models\TrainerStudent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->query('period', '30d');

        $now = now();
        $startDate = match ($period) {
            'today' => $now->copy()->startOfDay(),
            '7d' => $now->copy()->subDays(7),
            '90d' => $now->copy()->subDays(90),
            'all' => Carbon::createFromTimestamp(0),
            default => $now->copy()->subDays(30), // 30d
        };

        // Contagens reais de Usuários
        $totalUsers = User::count();
        $totalTrainers = User::whereIn('role', ['TRAINER', 'trainer'])->count();
        $totalStudents = User::whereIn('role', ['STUDENT', 'student'])->count();

        $activeUsers = User::where('status', 'ACTIVE')->count();
        $suspendedUsers = User::whereIn('status', ['SUSPENDED', 'BLOCKED'])->count();
        $pendingUsers = User::whereIn('status', ['PENDING_REVIEW', 'pending_email', 'pending_review'])->count();

        // Alunos com e sem vínculo
        $linkedStudentIds = TrainerStudent::where('status', 'active')->pluck('student_id')->unique();
        $linkedStudentsCount = User::whereIn('role', ['STUDENT', 'student'])
            ->whereIn('id', $linkedStudentIds)
            ->count();
        $unlinkedStudentsCount = max(0, $totalStudents - $linkedStudentsCount);

        // Novos cadastros no período
        $newUsersInPeriod = User::where('created_at', '>=', $startDate)->count();
        $newTrainersInPeriod = User::whereIn('role', ['TRAINER', 'trainer'])->where('created_at', '>=', $startDate)->count();
        $newStudentsInPeriod = User::whereIn('role', ['STUDENT', 'student'])->where('created_at', '>=', $startDate)->count();

        // Comparação com período anterior (se não for 'all')
        $previousNewUsers = null;
        if ($period !== 'all') {
            $diffDays = $now->diffInDays($startDate) ?: 1;
            $prevStartDate = $startDate->copy()->subDays($diffDays);
            $previousNewUsers = User::whereBetween('created_at', [$prevStartDate, $startDate])->count();
        }

        // Métricas reais de Assinaturas
        $totalSubscriptions = Subscription::count();
        $activeSubscriptions = Subscription::where('status', 'active')->count();
        $trialSubscriptions = Subscription::where('status', 'trial')->count();
        $gracePeriodSubscriptions = Subscription::where('status', 'grace_period')->count();
        $cancelledSubscriptions = Subscription::where('status', 'cancelled')->count();
        $expiredSubscriptions = Subscription::where('status', 'expired')->count();
        $pendingSubscriptions = Subscription::where('status', 'pending')->count();

        // Distribuição por Plano
        $planDistribution = Subscription::selectRaw('plan_id, count(*) as count')
            ->groupBy('plan_id')
            ->pluck('count', 'plan_id')
            ->toArray();

        // Distribuição por Provedor (Apple, Google, Free, Admin)
        $providerDistribution = Subscription::selectRaw('provider, count(*) as count')
            ->groupBy('provider')
            ->pluck('count', 'provider')
            ->toArray();

        // Alertas operacionais e logs recentes
        $recentAlerts = AuditLog::whereIn('level', ['warning', 'alert'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $recentAudits = AuditLog::orderBy('created_at', 'desc')
            ->limit(15)
            ->get();

        return response()->json([
            'success' => true,
            'period' => $period,
            'last_updated_at' => $now->toIso8601String(),
            'users' => [
                'total' => $totalUsers,
                'trainers' => $totalTrainers,
                'students' => $totalStudents,
                'linked_students' => $linkedStudentsCount,
                'unlinked_students' => $unlinkedStudentsCount,
                'active' => $activeUsers,
                'suspended' => $suspendedUsers,
                'pending' => $pendingUsers,
                'new_in_period' => $newUsersInPeriod,
                'new_trainers_in_period' => $newTrainersInPeriod,
                'new_students_in_period' => $newStudentsInPeriod,
                'previous_new_users' => $previousNewUsers,
            ],
            'subscriptions' => [
                'total' => $totalSubscriptions,
                'active' => $activeSubscriptions,
                'trial' => $trialSubscriptions,
                'grace_period' => $gracePeriodSubscriptions,
                'cancelled' => $cancelledSubscriptions,
                'expired' => $expiredSubscriptions,
                'pending' => $pendingSubscriptions,
                'plan_distribution' => $planDistribution,
                'provider_distribution' => $providerDistribution,
            ],
            'alerts' => $recentAlerts,
            'recent_activity' => $recentAudits,
        ]);
    }
}
