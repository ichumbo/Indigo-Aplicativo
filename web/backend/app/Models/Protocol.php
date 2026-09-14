<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Protocol extends Model
{
    protected $table = 'protocols';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'trainer_id',
        'student_id',
        'student_name',
        'student_avatar',
        'type',
        'title',
        'protocol_date',
        'warmup_text',
        'conconi_test_result',
        'days_prescription',
        'general_notes',
        'status',
    ];

    protected $casts = [
        'conconi_test_result' => 'array',
        'days_prescription' => 'array',
        'protocol_date' => 'date',
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
