<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'plan_id',
        'status',
        'current_period_start',
        'current_period_end',
        'cancel_at_period_end',
        'student_limit',
    ];

    protected $casts = [
        'cancel_at_period_end' => 'boolean',
        'student_limit' => 'integer',
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
