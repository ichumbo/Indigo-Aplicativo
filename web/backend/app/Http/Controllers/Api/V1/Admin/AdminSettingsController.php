<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AdminSettingsController extends Controller
{
    private const SETTINGS_CACHE_KEY = 'dragoncorp_global_settings';

    private function getDefaultSettings(): array
    {
        return [
            'maintenance_mode' => false,
            'maintenance_message' => 'O sistema DragonCorp está passando por uma breve manutenção programada.',
            'enable_hydration_module' => true,
            'enable_photo_assessments' => true,
            'enable_chat_messaging' => true,
            'enable_auto_notifications' => true,
            'allow_public_registration' => true,
            'max_active_students_per_trainer' => 50,
            'min_required_app_version' => '1.0.0',
            'recommended_app_version' => '1.0.0',
        ];
    }

    public function show(Request $request)
    {
        $settings = Cache::get(self::SETTINGS_CACHE_KEY, $this->getDefaultSettings());

        return response()->json([
            'success' => true,
            'settings' => $settings,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'maintenance_mode' => 'sometimes|boolean',
            'maintenance_message' => 'nullable|string|max:255',
            'enable_hydration_module' => 'sometimes|boolean',
            'enable_photo_assessments' => 'sometimes|boolean',
            'enable_chat_messaging' => 'sometimes|boolean',
            'enable_auto_notifications' => 'sometimes|boolean',
            'allow_public_registration' => 'sometimes|boolean',
            'max_active_students_per_trainer' => 'sometimes|integer|min:1|max:500',
            'min_required_app_version' => 'sometimes|string|max:10',
            'recommended_app_version' => 'sometimes|string|max:10',
            'reason' => 'required|string|min:4',
        ]);

        $current = Cache::get(self::SETTINGS_CACHE_KEY, $this->getDefaultSettings());
        $reason = $validated['reason'];
        unset($validated['reason']);

        $updated = array_merge($current, $validated);
        Cache::forever(self::SETTINGS_CACHE_KEY, $updated);

        AuditService::log(
            $request,
            'GLOBAL_SETTINGS_UPDATED',
            null,
            $reason,
            $current,
            $updated,
            'SUCCESS',
            'alert',
            "Configurações operacionais globais do sistema foram atualizadas."
        );

        return response()->json([
            'success' => true,
            'message' => 'Configurações globais salvas com sucesso.',
            'settings' => $updated,
        ]);
    }
}
