<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingExecutedSet extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'student_id',
        'trainer_id',
        'workout_id',
        'workout_name',
        'exercise_id',
        'exercise_name',
        'execution_id',
        'planned_set_index',
        'planned_load',
        'executed_load',
        'load_unit',
        'planned_reps',
        'executed_reps',
        'effort',
        'completed',
        'valid_for_progression',
        'pain',
        'note',
        'executed_at',
    ];

    protected $casts = [
        'planned_set_index' => 'integer',
        'planned_load' => 'float',
        'executed_load' => 'float',
        'planned_reps' => 'integer',
        'executed_reps' => 'integer',
        'effort' => 'integer',
        'completed' => 'boolean',
        'valid_for_progression' => 'boolean',
        'pain' => 'array',
        'executed_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'id');
    }

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }
}
