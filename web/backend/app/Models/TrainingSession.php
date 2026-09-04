<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingSession extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'plan_id',
        'student_id',
        'trainer_id',
        'status',
        'active_version_id',
        'release_config',
    ];

    protected $casts = [
        'release_config' => 'array',
    ];

    public function plan()
    {
        return $this->belongsTo(TrainingPlan::class, 'plan_id', 'id');
    }

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }

    public function versions()
    {
        return $this->hasMany(TrainingSessionVersion::class, 'session_id', 'id');
    }

    public function activeVersion()
    {
        return $this->hasOne(TrainingSessionVersion::class, 'id', 'active_version_id');
    }
}
