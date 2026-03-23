<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    public const TYPE_CLOCK_IN = 'clock_in';

    public const TYPE_CLOCK_OUT = 'clock_out';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'type',
        'attempted_at',
        'device_type',
        'ip_address',
        'latitude',
        'longitude',
        'distance_from_office',
        'is_within_radius',
        'accepted',
        'note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempted_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'distance_from_office' => 'float',
            'is_within_radius' => 'boolean',
            'accepted' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<User, AttendanceLog>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
