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
        return in_array(strtoupper($this->role ?? ''), ['SUPER_ADMIN', 'ADMIN']);
    }

    public function isSupportAdmin(): bool
    {
        return strtoupper($this->role ?? '') === 'SUPPORT_ADMIN';
    }

    public function isFinancialAdmin(): bool
    {
        return strtoupper($this->role ?? '') === 'FINANCIAL_ADMIN';
    }

    public function isReadOnlyAdmin(): bool
    {
        return strtoupper($this->role ?? '') === 'READONLY_ADMIN';
    }

    public function isAdmin(): bool
    {
        return in_array(strtoupper($this->role ?? ''), [
            'SUPER_ADMIN',
            'ADMIN',
            'SUPPORT_ADMIN',
            'FINANCIAL_ADMIN',
            'READONLY_ADMIN'
        ]);
    }

    public function getAdminPermissions(): array
    {
        $role = strtoupper($this->role ?? '');
        if ($role === 'SUPER_ADMIN' || $role === 'ADMIN') {
            return ['*'];
        }
        if ($role === 'SUPPORT_ADMIN') {
            return [
                'users:read',
                'users:update_basic',
                'users:password_reset',
                'users:resend_verification',
                'users:revoke_sessions',
                'links:read',
                'links:manage',
                'notifications:read',
                'notifications:broadcast',
                'audit:read',
            ];
        }
        if ($role === 'FINANCIAL_ADMIN') {
            return [
                'subscriptions:read',
                'subscriptions:sync',
                'subscriptions:promo_grant',
                'users:read',
                'audit:read',
            ];
        }
        if ($role === 'READONLY_ADMIN') {
            return [
                'users:read',
                'links:read',
                'subscriptions:read',
                'audit:read',
                'notifications:read',
            ];
        }
        return [];
    }

    public function hasAdminPermission(string $permission): bool
    {
        if (!$this->isAdmin()) {
            return false;
        }
        $perms = $this->getAdminPermissions();
        if (in_array('*', $perms)) {
            return true;
        }
        return in_array($permission, $perms);
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
