<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShipmentOperationTask extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'shipment_id',
        'name',
        'sort_order',
        'assigned_to_id',
        'due_date',
        'execution_at',
        'priority',
        'reminder_at',
        'reminder_before_value',
        'reminder_before_unit',
        'status',
        'completed_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'due_date' => 'date',
        'execution_at' => 'datetime',
        'reminder_at' => 'datetime',
        'completed_at' => 'datetime',
        'sort_order' => 'int',
        'reminder_before_value' => 'int',
    ];

    /**
     * @return BelongsTo<Shipment, ShipmentOperationTask>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<User, ShipmentOperationTask>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }
}
