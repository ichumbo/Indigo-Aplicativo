<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainerProfile extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'cref_number',
        'cref_state',
        'cref_verification_status',
        'bio',
        'specialties',
        'service_type',
        'experience_years',
        'city',
        'state',
        'address',
        'instagram',
        'portfolio_url',
        'working_hours',
        'certifications',
        'status',
    ];

    protected $casts = [
        'specialties' => 'array',
        'certifications' => 'array',
        'experience_years' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
