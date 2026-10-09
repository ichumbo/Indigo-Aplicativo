<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushDevice extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'tenant_id',
        'token',
        'provider',
        'platform',
        'device_id',
        'app_version',
        'environment',
        'active',
        'last_seen_at',
        'invalidated_at',
    ];

    protected $casts = [
        'active' => 'boolean',
        'last_seen_at' => 'datetime',
        'invalidated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
