<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunicationLog extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'client_id',
        'shipment_id',
        'ticket_id',
        'communication_log_type_id',
        'subject',
        'client_said',
        'issue',
        'reply',
        'created_by_id',
        'occurred_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Client, CommunicationLog>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<Shipment, CommunicationLog>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<Ticket, CommunicationLog>
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * @return BelongsTo<CommunicationLogType, CommunicationLog>
     */
    public function type(): BelongsTo
    {
        return $this->belongsTo(CommunicationLogType::class, 'communication_log_type_id');
    }

    /**
     * @return BelongsTo<User, CommunicationLog>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
