<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'action',
        'actor_id',
        'actor_role',
        'target_id',
        'ip_address',
        'user_agent',
        'correlation_id',
        'reason',
        'old_values',
        'new_values',
        'result',
        'level',
        'details',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }
}
