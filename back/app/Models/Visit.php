<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Visit extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'visitable_type',
        'visitable_id',
        'user_id',
        'subject',
        'purpose',
        'notes',
        'visit_date',
        'status',
        'other_name',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'visit_date' => 'datetime',
    ];

    /**
     * @return MorphTo<Model, Visit>
     */
    public function visitable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return BelongsTo<User, Visit>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
