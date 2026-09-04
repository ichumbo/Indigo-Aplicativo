<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Exercise extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'trainer_id',
        'name',
        'category',
        'muscle_groups',
        'tags',
        'thumbnail_url',
        'video_url',
        'description',
        'instructions',
        'common_errors',
        'is_system',
    ];

    protected $casts = [
        'muscle_groups' => 'array',
        'tags' => 'array',
        'common_errors' => 'array',
        'is_system' => 'boolean',
    ];

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }
}
