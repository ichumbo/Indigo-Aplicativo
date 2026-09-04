<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'email',
        'password',
        'cpf',
        'phone',
        'avatar',
        'role',
        'status',
        'professional_id',
        'trainer_code',
        'cref_verification_status',
        'is_email_verified',
        'email_verified_at',
        'last_access_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_access_at' => 'datetime',
            'is_email_verified' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function isTrainer(): bool
    {
        return $this->role === 'TRAINER' || $this->role === 'trainer';
    }

    public function isStudent(): bool
    {
        return $this->role === 'STUDENT' || $this->role === 'student';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'SUPER_ADMIN' || $this->role === 'admin';
    }

    public function trainerProfile()
    {
        return $this->hasOne(TrainerProfile::class, 'user_id', 'id');
    }

    public function studentProfile()
    {
        return $this->hasOne(StudentProfile::class, 'user_id', 'id');
    }

    public function trainerRelationships()
    {
        return $this->hasMany(TrainerStudent::class, 'trainer_id', 'id');
    }

    public function studentRelationships()
    {
        return $this->hasMany(TrainerStudent::class, 'student_id', 'id');
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class, 'user_id', 'id');
    }
}
