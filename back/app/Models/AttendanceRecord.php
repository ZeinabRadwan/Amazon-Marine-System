<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'date',
        'check_in_at',
        'check_out_at',
        'is_late',
        'notes',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'date' => 'date',
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'is_late' => 'boolean',
    ];

    /**
     * @return BelongsTo<User, AttendanceRecord>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
