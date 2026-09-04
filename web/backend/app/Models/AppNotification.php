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
        'audience',
        'type',
        'title',
        'message',
        'read',
        'feedback_id',
        'highlight_pain',
    ];

    protected $casts = [
        'read' => 'boolean',
        'highlight_pain' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
