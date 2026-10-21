<?php

use App\Http\Controllers\Api\V1\AgendaController;
use App\Http\Controllers\Api\V1\AssessmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EvolutionController;
use App\Http\Controllers\Api\V1\ExerciseController;
use App\Http\Controllers\Api\V1\FeedbackController;
use App\Http\Controllers\Api\V1\MessageController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\ProtocolController;
use App\Http\Controllers\Api\V1\StoreWebhookController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\WorkoutController;
use App\Http\Controllers\Api\V1\Admin\AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Admin\AdminLinkController;
use App\Http\Controllers\Api\V1\Admin\AdminSubscriptionController;
use App\Http\Controllers\Api\V1\Admin\AdminAuditController;
use App\Http\Controllers\Api\V1\Admin\AdminNotificationController;
use App\Http\Controllers\Api\V1\Admin\AdminSecurityController;
use App\Http\Controllers\Api\V1\Admin\AdminSettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // 1. Rotas Públicas de Autenticação & Ping de Conexão
    Route::get('/ping', fn () => response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]));
    Route::post('/auth/login', [AuthController::class, 'login'])->name('login');
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/auth/confirm-account', [AuthController::class, 'confirmAccount']);

    // 2. Sincronização Mobile <-> Web (Acessível pelo aplicativo mobile)
    Route::get('/sync/pull', [SyncController::class, 'pull']);
    Route::post('/sync/push', [SyncController::class, 'push']);
    Route::post('/evolution/record-set', [EvolutionController::class, 'recordSet']);

    // 2.1 Webhooks Oficiais das Lojas (App Store Server Notifications e Google RTDN)
    Route::post('/webhooks/apple-iap', [StoreWebhookController::class, 'handleAppleNotification']);
    Route::post('/webhooks/google-play', [StoreWebhookController::class, 'handleGoogleNotification']);

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

        // Aliases /training-plans para compatibilidade resiliente
        Route::get('/training-plans', [WorkoutController::class, 'index']);
        Route::post('/training-plans', [WorkoutController::class, 'store']);
        Route::get('/training-plans/{id}', [WorkoutController::class, 'show']);
        Route::put('/training-plans/{id}', [WorkoutController::class, 'update']);
        Route::post('/training-plans/{id}/duplicate', [WorkoutController::class, 'duplicate']);
        Route::delete('/training-plans/{id}', [WorkoutController::class, 'destroy']);

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

        // Protocolos Aeróbios e de Força (Conconi, etc.)
        Route::get('/protocols', [ProtocolController::class, 'index']);
        Route::post('/protocols', [ProtocolController::class, 'store']);
        Route::get('/protocols/{id}', [ProtocolController::class, 'show']);
        Route::put('/protocols/{id}', [ProtocolController::class, 'update']);
        Route::delete('/protocols/{id}', [ProtocolController::class, 'destroy']);

        // Feedbacks de Treino e Relatos de Dor
        Route::get('/feedbacks', [FeedbackController::class, 'index']);
        Route::get('/feedbacks/{id}', [FeedbackController::class, 'show']);
        Route::post('/feedbacks/{id}/respond', [FeedbackController::class, 'respond']);

        // Evolução e Histórico de Cargas
        Route::get('/evolution/{studentId}', [EvolutionController::class, 'show']);

        // Chat e Mensagens com Alunos
        Route::get('/messages', [MessageController::class, 'index']);
        Route::get('/messages/{studentId}', [MessageController::class, 'messages']);
        Route::post('/messages/send', [MessageController::class, 'send']);

        // Central de Notificações
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/{id}/dismiss', [NotificationController::class, 'dismiss']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::get('/notifications/preferences', [NotificationController::class, 'getPreferences']);
        Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);

        // Registro de Dispositivos e Push Tokens
        Route::post('/devices/register', [NotificationController::class, 'registerDevice']);
        Route::post('/devices/deregister', [NotificationController::class, 'deregisterDevice']);

        // Agenda e Reavaliações
        Route::get('/agenda', [AgendaController::class, 'index']);
        Route::post('/agenda', [AgendaController::class, 'store']);

        // Assinatura e Limites
        Route::get('/subscription', [SubscriptionController::class, 'show']);
        Route::post('/subscription/verify', [SubscriptionController::class, 'verify']);
        Route::post('/subscription/restore', [SubscriptionController::class, 'restore']);
        Route::post('/subscription/cancel', [SubscriptionController::class, 'cancel']);
    });

    // 4. API Administrativa Oficial DragonCorp (/api/v1/admin)
    Route::prefix('admin')->group(function () {
        // Autenticação Administrativa Pública (com Rate Limiting estrito)
        Route::post('/auth/login', [AdminAuthController::class, 'login']);

        // Rotas Administrativas Protegidas (Sanctum + AdminRoleMiddleware)
        Route::middleware(['auth:sanctum', 'admin.role'])->group(function () {
            // Sessão e Identidade
            Route::get('/auth/me', [AdminAuthController::class, 'me']);
            Route::post('/auth/logout', [AdminAuthController::class, 'logout']);

            // Visão Geral / Dashboard
            Route::get('/dashboard', [AdminDashboardController::class, 'index']);

            // Usuários e Ações Administrativas
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::get('/users/{id}', [AdminUserController::class, 'show']);
            Route::patch('/users/{id}', [AdminUserController::class, 'update']);
            Route::post('/users/{id}/suspend', [AdminUserController::class, 'suspend']);
            Route::post('/users/{id}/reactivate', [AdminUserController::class, 'reactivate']);
            Route::post('/users/{id}/revoke-sessions', [AdminUserController::class, 'revokeSessions']);
            Route::post('/users/{id}/password-reset', [AdminUserController::class, 'passwordReset']);
            Route::post('/users/{id}/anonymize', [AdminUserController::class, 'anonymize']);
            Route::post('/users/{id}/export', [AdminUserController::class, 'export']);

            // Vínculos e Transferências
            Route::get('/links', [AdminLinkController::class, 'index']);
            Route::post('/links', [AdminLinkController::class, 'store']);
            Route::post('/links/transfer', [AdminLinkController::class, 'transfer']);
            Route::delete('/links/{id}', [AdminLinkController::class, 'destroy']);

            // Assinaturas e Planos
            Route::get('/subscriptions', [AdminSubscriptionController::class, 'index']);
            Route::post('/subscriptions/{id}/sync', [AdminSubscriptionController::class, 'sync']);
            Route::post('/subscriptions/grant-promo', [AdminSubscriptionController::class, 'grantPromo']);
            Route::post('/subscriptions/{id}/revoke-promo', [AdminSubscriptionController::class, 'revokePromo']);

            // Auditoria Imutável
            Route::get('/audit', [AdminAuditController::class, 'index']);

            // Notificações e Avisos Operacionais
            Route::get('/notifications', [AdminNotificationController::class, 'index']);
            Route::post('/notifications/broadcast', [AdminNotificationController::class, 'broadcast']);

            // Segurança e Administradores
            Route::get('/security/admins', [AdminSecurityController::class, 'admins']);
            Route::post('/security/admins', [AdminSecurityController::class, 'createAdmin']);
            Route::get('/security/sessions', [AdminSecurityController::class, 'sessions']);
            Route::post('/security/sessions/{id}/revoke', [AdminSecurityController::class, 'revokeSession']);

            // Configurações Globais e Manutenção
            Route::get('/settings', [AdminSettingsController::class, 'show']);
            Route::put('/settings', [AdminSettingsController::class, 'update']);
        });
    });
});
