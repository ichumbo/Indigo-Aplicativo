<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingPlan extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'student_id',
        'trainer_id',
        'name',
        'objective',
        'status',
        'version',
        'start_at',
        'valid_until',
        'frequency_per_week',
        'session_ids',
        'weekly_schedule',
        'notes',
    ];

    protected $casts = [
        'session_ids' => 'array',
        'weekly_schedule' => 'array',
        'version' => 'integer',
        'frequency_per_week' => 'integer',
        'start_at' => 'date',
        'valid_until' => 'date',
    ];

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }

    public function sessions()
    {
        return $this->hasMany(TrainingSession::class, 'plan_id', 'id');
    }
}
