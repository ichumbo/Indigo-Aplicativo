<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainerStudent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'trainer_id',
        'student_id',
        'status',
        'started_at',
        'ended_at',
        'invite_id',
        'invite_status',
        'code_used',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function trainer()
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }

    public function student()
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'id');
    }
}
