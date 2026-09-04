<?php

use App\Http\Controllers\Api\V1\AssessmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EvolutionController;
use App\Http\Controllers\Api\V1\ExerciseController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\WorkoutController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // 1. Rotas Públicas de Autenticação
    Route::post('/auth/login', [AuthController::class, 'login'])->name('login');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    // 2. Sincronização Mobile <-> Web (Acessível pelo aplicativo mobile)
    Route::get('/sync/pull', [SyncController::class, 'pull']);
    Route::post('/sync/push', [SyncController::class, 'push']);
    Route::post('/evolution/record-set', [EvolutionController::class, 'recordSet']);

    // 3. Rotas Protegidas (Laravel Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        // Sessão e Perfil
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);

        // Dashboard do Personal
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Gestão de Alunos (com isolamento IDOR e controle Freemium)
        Route::get('/students', [StudentController::class, 'index']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::get('/students/{id}', [StudentController::class, 'show']);
        Route::put('/students/{id}', [StudentController::class, 'update']);
        Route::delete('/students/{id}', [StudentController::class, 'destroy']);

        // Gestão e Editor de Treinos
        Route::get('/workouts', [WorkoutController::class, 'index']);
        Route::post('/workouts', [WorkoutController::class, 'store']);
        Route::get('/workouts/{id}', [WorkoutController::class, 'show']);
        Route::put('/workouts/{id}', [WorkoutController::class, 'update']);
        Route::post('/workouts/{id}/duplicate', [WorkoutController::class, 'duplicate']);
        Route::delete('/workouts/{id}', [WorkoutController::class, 'destroy']);

        // Biblioteca de Exercícios
        Route::get('/exercises', [ExerciseController::class, 'index']);
        Route::post('/exercises', [ExerciseController::class, 'store']);
        Route::put('/exercises/{id}', [ExerciseController::class, 'update']);
        Route::delete('/exercises/{id}', [ExerciseController::class, 'destroy']);

        // Avaliações Físicas e Comparativo
        Route::get('/assessments', [AssessmentController::class, 'index']);
        Route::post('/assessments', [AssessmentController::class, 'store']);
        Route::get('/assessments/compare', [AssessmentController::class, 'compare']);
        Route::get('/assessments/{id}', [AssessmentController::class, 'show']);

        // Evolução e Histórico de Cargas
        Route::get('/evolution/{studentId}', [EvolutionController::class, 'show']);

        // Chat e Mensagens com Alunos
        Route::get('/messages', [MessageController::class, 'index']);
        Route::get('/messages/{studentId}', [MessageController::class, 'messages']);
        Route::post('/messages/send', [MessageController::class, 'send']);

        // Central de Notificações
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // Assinatura e Limites
        Route::get('/subscription', [SubscriptionController::class, 'show']);
    });
});
