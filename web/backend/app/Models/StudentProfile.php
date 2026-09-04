<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentProfile extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'full_name',
        'avatar',
        'birth_date',
        'gender',
        'main_goal',
        'secondary_goals',
        'profession',
        'address',
        'contact',
        'status',
        'administrative_notes',
        'anamnesis',
        'follow_up_summary',
        'private_trainer_notes',
    ];

    protected $casts = [
        'secondary_goals' => 'array',
        'contact' => 'array',
        'anamnesis' => 'array',
        'follow_up_summary' => 'array',
        'private_trainer_notes' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function trainerRelationships()
    {
        return $this->hasMany(TrainerStudent::class, 'student_id', 'id');
    }

    public function trainingPlans()
    {
        return $this->hasMany(TrainingPlan::class, 'student_id', 'id');
    }

    public function assessments()
    {
        return $this->hasMany(PhysicalAssessment::class, 'student_id', 'id');
    }

    public function executedSets()
    {
        return $this->hasMany(TrainingExecutedSet::class, 'student_id', 'id');
    }
}
