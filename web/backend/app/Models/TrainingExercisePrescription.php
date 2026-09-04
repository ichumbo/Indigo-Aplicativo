<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingExercisePrescription extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'version_id',
        'exercise_catalog_id',
        'name',
        'type',
        'muscle_group',
        'order',
        'section_id',
        'combination_id',
        'combination_label',
        'planned_sets',
        'planned_set_details',
        'planned_reps',
        'planned_load',
        'load_unit',
        'duration_seconds',
        'rest_seconds',
        'tempo',
        'side',
        'observation',
        'video_url',
        'unilateral',
        'warmup_set',
        'valid_set',
    ];

    protected $casts = [
        'order' => 'integer',
        'planned_sets' => 'integer',
        'planned_reps' => 'integer',
        'planned_load' => 'float',
        'duration_seconds' => 'integer',
        'rest_seconds' => 'integer',
        'unilateral' => 'boolean',
        'warmup_set' => 'boolean',
        'valid_set' => 'boolean',
        'planned_set_details' => 'array',
    ];

    public function version()
    {
        return $this->belongsTo(TrainingSessionVersion::class, 'version_id', 'id');
    }

    public function catalogExercise()
    {
        return $this->belongsTo(Exercise::class, 'exercise_catalog_id', 'id');
    }
}
