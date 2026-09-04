<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TrainerStudent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $trainer = $request->user();
        $sub = $trainer->subscription;

        $activeStudentsCount = TrainerStudent::where('trainer_id', $trainer->id)
            ->where('status', 'ACTIVE')
            ->count();

        $plan = $sub ? $sub->plan_id : 'pro';
        $limit = $sub ? $sub->student_limit : 9999;

        return response()->json([
            'plan' => $plan,
            'status' => $sub ? $sub->status : 'active',
            'activeStudentsCount' => $activeStudentsCount,
            'studentLimit' => $limit,
            'isPro' => $plan === 'pro',
            'canAddStudents' => $limit > $activeStudentsCount,
        ]);
    }
}
