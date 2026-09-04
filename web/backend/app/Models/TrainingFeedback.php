<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingFeedback extends Model
{
    protected $table = 'feedbacks';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'student_id',
        'student_name',
        'trainer_id',
        'workout_id',
        'workout_name',
        'execution_id',
        'started_at',
        'finished_at',
        'duration_minutes',
        'exercises',
        'rating',
        'comment',
        'intensity',
        'has_pain',
        'pain_region',
        'pain_level',
        'status',
    ];

    protected $casts = [
        'exercises' => 'array',
        'rating' => 'integer',
        'duration_minutes' => 'integer',
        'has_pain' => 'boolean',
        'pain_level' => 'integer',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }

    public function responses()
    {
        return $this->hasMany(FeedbackResponse::class, 'feedback_id', 'id');
    }
}
