<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhysicalAssessment extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'student_id',
        'trainer_id',
        'assessment_date',
        'type',
        'status',
        'general_info',
        'anamnesis',
        'body_composition',
        'perimeters',
        'skinfolds',
        'cardio',
        'functional',
        'postural',
        'photos',
        'conclusion',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'general_info' => 'array',
        'anamnesis' => 'array',
        'body_composition' => 'array',
        'perimeters' => 'array',
        'skinfolds' => 'array',
        'cardio' => 'array',
        'functional' => 'array',
        'postural' => 'array',
        'photos' => 'array',
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
