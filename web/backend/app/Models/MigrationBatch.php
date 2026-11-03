<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MigrationBatch extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    const STATUS_UPLOADED = 'uploaded';
    const STATUS_VALIDATING = 'validating';
    const STATUS_PARSED = 'parsed';
    const STATUS_AWAITING_REVIEW = 'awaiting_review';
    const STATUS_READY = 'ready';
    const STATUS_IMPORTING = 'importing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_COMPLETED_WARNINGS = 'completed_with_warnings';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_ROLLED_BACK = 'rolled_back';

    const SOURCE_MFIT = 'mfit';
    const SOURCE_AVALIACAO_FISICA_PRO = 'avaliacao_fisica_pro';
    const SOURCE_SPREADSHEET = 'spreadsheet';
    const SOURCE_PDF = 'pdf';
    const SOURCE_IMAGES_ZIP = 'images_zip';
    const SOURCE_OTHER = 'other';

    protected $fillable = [
        'id',
        'trainer_id',
        'source',
        'status',
        'source_files',
        'column_mapping',
        'total_items',
        'imported_items',
        'warning_items',
        'failed_items',
        'conflict_resolutions',
        'execution_summary',
        'started_at',
        'completed_at',
        'rollback_until',
        'rolled_back_at',
        'rollback_reason',
    ];

    protected $casts = [
        'source_files' => 'array',
        'column_mapping' => 'array',
        'conflict_resolutions' => 'array',
        'execution_summary' => 'array',
        'total_items' => 'integer',
        'imported_items' => 'integer',
        'warning_items' => 'integer',
        'failed_items' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'rollback_until' => 'datetime',
        'rolled_back_at' => 'datetime',
    ];

    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MigrationItem::class, 'batch_id', 'id');
    }

    public function legacyFiles(): HasMany
    {
        return $this->hasMany(LegacyImportedFile::class, 'migration_batch_id', 'id');
    }

    public function canRollback(): bool
    {
        if ($this->status !== self::STATUS_COMPLETED && $this->status !== self::STATUS_COMPLETED_WARNINGS) {
            return false;
        }

        if ($this->rolled_back_at !== null) {
            return false;
        }

        if ($this->rollback_until !== null && $this->rollback_until->isPast()) {
            return false;
        }

        return true;
    }

    public function isAwaitingReview(): bool
    {
        return $this->status === self::STATUS_AWAITING_REVIEW || $this->status === self::STATUS_PARSED;
    }
}

