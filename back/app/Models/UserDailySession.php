<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDailySession extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'session_date',
        'first_seen_at',
        'last_seen_at',
        'total_active_seconds',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'session_date' => 'date',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'total_active_seconds' => 'int',
    ];

    /**
     * @return BelongsTo<User, UserDailySession>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
