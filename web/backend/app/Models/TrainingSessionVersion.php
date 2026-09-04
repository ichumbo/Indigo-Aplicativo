<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingSessionVersion extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'session_id',
        'version',
        'status',
        'name',
        'identifier',
        'objective',
        'description',
        'muscle_groups',
        'level',
        'estimated_duration_minutes',
        'valid_from',
        'valid_until',
        'recommended_days',
        'order',
        'instructions',
        'show_when_locked',
        'requires_supervision',
        'private_trainer_notes',
        'sections',
    ];

    protected $casts = [
        'version' => 'integer',
        'order' => 'integer',
        'estimated_duration_minutes' => 'integer',
        'muscle_groups' => 'array',
        'recommended_days' => 'array',
        'sections' => 'array',
        'show_when_locked' => 'boolean',
        'requires_supervision' => 'boolean',
        'valid_from' => 'date',
        'valid_until' => 'date',
    ];

    public function session()
    {
        return $this->belongsTo(TrainingSession::class, 'session_id', 'id');
    }

    public function exercises()
    {
        return $this->hasMany(TrainingExercisePrescription::class, 'version_id', 'id')->orderBy('order', 'asc');
    }
}
