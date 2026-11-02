<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MigrationItem extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    const TYPE_STUDENT = 'student';
    const TYPE_WORKOUT = 'workout';
    const TYPE_ASSESSMENT = 'assessment';
    const TYPE_DOCUMENT = 'document';
    const TYPE_PHOTO = 'photo';

    const MATCH_NEW = 'new';
    const MATCH_EXACT = 'exact_match';
    const MATCH_PROBABLE = 'probable_match';
    const MATCH_CONFLICT = 'conflict';
    const MATCH_IGNORED = 'ignored';
    const MATCH_INVALID = 'invalid';

    const DECISION_CREATE_NEW = 'create_new';
    const DECISION_LINK_EXISTING = 'link_existing';
    const DECISION_MERGE_EMPTY = 'merge_empty';
    const DECISION_OVERRIDE_FIELDS = 'override_fields';
    const DECISION_IGNORE = 'ignore';
    const DECISION_KEEP_LEGACY = 'keep_as_legacy';

    protected $fillable = [
        'id',
        'batch_id',
        'item_type',
        'external_id',
        'raw_data',
        'normalized_data',
        'match_status',
        'match_confidence',
        'matched_entity_id',
        'review_decision',
        'warnings',
        'errors',
        'destination_id',
        'imported_at',
    ];

    protected $casts = [
        'raw_data' => 'array',
        'normalized_data' => 'array',
        'warnings' => 'array',
        'errors' => 'array',
        'match_confidence' => 'integer',
        'imported_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MigrationBatch::class, 'batch_id', 'id');
    }
}
