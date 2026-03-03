<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Note extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'noteable_type',
        'noteable_id',
        'author_id',
        'content',
        'due_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'due_at' => 'datetime',
    ];

    /**
     * @return MorphTo<Model, Note>
     */
    public function noteable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return BelongsTo<User, Note>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
