<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackResponse extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'feedback_id',
        'author_id',
        'author_name',
        'author_role',
        'message',
    ];

    public function feedback()
    {
        return $this->belongsTo(TrainingFeedback::class, 'feedback_id', 'id');
    }
}
