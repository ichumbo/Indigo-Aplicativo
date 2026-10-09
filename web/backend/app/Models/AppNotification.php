<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppNotification extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'recipient_id',
        'tenant_id',
        'personal_id',
        'audience',
        'type',
        'category',
        'priority',
        'title',
        'message',
        'body',
        'data',
        'deep_link',
        'source_type',
        'source_id',
        'dedupe_key',
        'status',
        'read',
        'feedback_id',
        'highlight_pain',
        'scheduled_at',
        'sent_at',
        'delivered_at',
        'read_at',
        'expires_at',
        'failure_reason',
    ];

    protected $casts = [
        'read' => 'boolean',
        'highlight_pain' => 'boolean',
        'data' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'read_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_id', 'id');
    }
}
