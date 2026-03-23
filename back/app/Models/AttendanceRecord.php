<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    public const STATUS_ON_TIME = 'on_time';

    public const STATUS_LATE = 'late';

    public const STATUS_EARLY_LEAVE = 'early_leave';

    public const STATUS_ABSENT = 'absent';

    public const STATUS_EXCUSED = 'excused';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'date',
        'check_in_at',
        'check_out_at',
        'is_late',
        'status',
        'worked_minutes',
        'clock_in_device_type',
        'clock_in_distance_from_office',
        'clock_in_is_within_radius',
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
        'worked_minutes' => 'integer',
        'clock_in_distance_from_office' => 'float',
        'clock_in_is_within_radius' => 'boolean',
    ];

    /**
     * @return BelongsTo<User, AttendanceRecord>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
