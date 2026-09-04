<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'conversation_id',
        'sender_id',
        'sender_name',
        'sender_role',
        'receiver_id',
        'receiver_name',
        'receiver_role',
        'text',
        'tag',
        'read',
    ];

    protected $casts = [
        'read' => 'boolean',
    ];
}
