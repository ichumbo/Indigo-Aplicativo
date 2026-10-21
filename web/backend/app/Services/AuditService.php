<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuditService
{
    private static array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'token',
        'remember_token',
        'purchase_token',
        'raw_payload',
        'secret',
        'anamnesis',
        'clinical_notes',
        'card_number',
        'cvv',
        'credit_card',
    ];

    public static function log(
        Request $request,
        string $action,
        ?string $targetId = null,
        ?string $reason = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        string $result = 'SUCCESS',
        string $level = 'info',
        ?string $details = null
    ): AuditLog {
        $actor = $request->user();
        $correlationId = $request->header('X-Correlation-ID') ?: (string) Str::uuid();

        return AuditLog::create([
            'id' => (string) Str::uuid(),
            'action' => $action,
            'actor_id' => $actor ? $actor->id : 'system',
            'actor_role' => $actor ? $actor->role : 'SYSTEM',
            'target_id' => $targetId,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'correlation_id' => $correlationId,
            'reason' => $reason,
            'old_values' => $oldValues ? self::sanitize($oldValues) : null,
            'new_values' => $newValues ? self::sanitize($newValues) : null,
            'result' => $result,
            'level' => $level,
            'details' => $details ?: "Ação {$action} executada com resultado {$result}",
        ]);
    }

    public static function sanitize(array $data): array
    {
        $sanitized = [];
        foreach ($data as $key => $value) {
            $lowerKey = strtolower((string) $key);
            $isSensitive = false;
            foreach (self::$sensitiveKeys as $sensitive) {
                if (str_contains($lowerKey, $sensitive)) {
                    $isSensitive = true;
                    break;
                }
            }

            if ($isSensitive) {
                $sanitized[$key] = '[REDACTED_SENSITIVE_DATA]';
            } elseif (is_array($value)) {
                $sanitized[$key] = self::sanitize($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        return $sanitized;
    }
}
