<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\PhysicalAssessment;
use App\Models\StudentProfile;
use App\Models\TrainerStudent;
use App\Models\TrainingFeedback;
use App\Models\TrainingPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $trainer = $request->user();

        // 1. Alunos vinculados
        $relationships = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('status', 'ACTIVE')
            ->get();
        $studentIds = $relationships->pluck('student_id')->toArray();

        $activeStudentsCount = count($studentIds);

        // 2. Treinos ativos
        $activePlansCount = TrainingPlan::where('trainer_id', $trainer->id)
            ->where('status', 'ativo')
            ->count();

        // 3. Treinos vencendo nos próximos 15 dias
        $expiringPlansCount = TrainingPlan::where('trainer_id', $trainer->id)
            ->where('status', 'ativo')
            ->whereNotNull('valid_until')
            ->whereBetween('valid_until', [now()->toDateString(), now()->addDays(15)->toDateString()])
            ->count();

        // 4. Avaliações pendentes ou recentes
        $recentAssessmentsCount = PhysicalAssessment::where('trainer_id', $trainer->id)
            ->where('assessment_date', '>=', now()->subDays(30)->toDateString())
            ->count();

        // 5. Feedbacks recentes e alertas de dor
        $recentFeedbacks = TrainingFeedback::where('trainer_id', $trainer->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $painAlertsCount = TrainingFeedback::where('trainer_id', $trainer->id)
            ->where('has_pain', true)
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        // 6. Notificações não lidas
        $unreadNotificationsCount = AppNotification::where('user_id', $trainer->id)
            ->where('read', false)
            ->count();

        // 7. Lista de alunos prioritários com dados de acompanhamento
        $students = StudentProfile::whereIn('id', $studentIds)
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->full_name,
                    'avatar' => $student->avatar,
                    'goal' => $student->main_goal,
                    'status' => $student->status,
                    'followUp' => $student->follow_up_summary,
                ];
            });

        return response()->json([
            'stats' => [
                'activeStudents' => $activeStudentsCount,
                'activePlans' => $activePlansCount,
                'expiringPlans' => $expiringPlansCount,
                'recentAssessments' => $recentAssessmentsCount,
                'painAlerts' => $painAlertsCount,
                'unreadNotifications' => $unreadNotificationsCount,
                'averageAdherence' => 94, // %
            ],
            'recentFeedbacks' => $recentFeedbacks,
            'students' => $students,
        ]);
    }
}
