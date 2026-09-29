<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'plan_id',
        'provider',
        'product_id',
        'original_transaction_id',
        'latest_transaction_id',
        'purchase_token',
        'environment',
        'status',
        'current_period_start',
        'current_period_end',
        'cancel_at_period_end',
        'auto_renew',
        'student_limit',
        'last_verified_at',
        'raw_payload',
    ];

    protected $casts = [
        'cancel_at_period_end' => 'boolean',
        'auto_renew' => 'boolean',
        'student_limit' => 'integer',
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
        'last_verified_at' => 'datetime',
        'raw_payload' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function transactions()
    {
        return $this->hasMany(SubscriptionTransaction::class, 'subscription_id', 'id');
    }

    /**
     * Verifica se a assinatura está ativa considerando status e data de expiração
     */
    public function isActive(): bool
    {
        $activeStatuses = ['active', 'trial', 'renewed', 'grace_period'];
        if (!in_array($this->status, $activeStatuses, true)) {
            return false;
        }

        if ($this->current_period_end !== null && $this->current_period_end->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * Determina se o usuário possui acesso PRO efetivo
     */
    public function isPro(): bool
    {
        return strtolower($this->plan_id) === 'pro' && $this->isActive();
    }

    /**
     * Retorna a lista normalizada de capacidades e limites (Entitlements)
     */
    public function getEntitlements(): array
    {
        $isPro = $this->isPro();
        return [
            'canCreateWorkouts' => true,
            'canCreateEvaluations' => true,
            'canCreateProtocols' => true,
            'canUseCustomBranding' => true,
            'canAccessWebDashboard' => true,
            'canUseAiAssistant' => true,
            'canAccessAdvancedMetrics' => $isPro,
            'maxStudents' => $isPro ? null : $this->student_limit,
            'isPro' => $isPro,
        ];
    }
}
