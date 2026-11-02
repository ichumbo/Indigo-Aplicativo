<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LegacyImportedFile extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    const CATEGORY_WORKOUT_SHEET = 'workout_sheet';
    const CATEGORY_ASSESSMENT = 'assessment';
    const CATEGORY_ANAMNESIS = 'anamnesis';
    const CATEGORY_PHOTO = 'photo';
    const CATEGORY_REPORT = 'report';
    const CATEGORY_DOCUMENT = 'document';
    const CATEGORY_UNCLASSIFIED = 'unclassified';

    const STATUS_RAW_PRESERVED = 'raw_preserved';
    const STATUS_PARTIALLY_PARSED = 'partially_parsed';
    const STATUS_MANUAL_CONVERTED = 'manual_converted';

    protected $fillable = [
        'id',
        'student_id',
        'trainer_id',
        'migration_batch_id',
        'category',
        'original_name',
        'stored_path',
        'file_size',
        'mime_type',
        'source_platform',
        'original_date',
        'notes',
        'conversion_status',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'original_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class, 'student_id', 'id');
    }

    public function trainer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'trainer_id', 'id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MigrationBatch::class, 'migration_batch_id', 'id');
    }
}
