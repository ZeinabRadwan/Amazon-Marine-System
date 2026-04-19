<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use App\Traits\HasFiles;

class Ticket extends Model
{
    use HasFactory, HasFiles;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'client_id',
        'shipment_id',
        'created_by_id',
        'assigned_to_id',
        'ticket_type_id',
        'priority_id',
        'ticket_number',
        'subject',
        'description',
        'status',
        'source',
    ];

    /**
     * @return BelongsTo<Client, Ticket>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<Shipment, Ticket>
     */
    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * @return BelongsTo<TicketType, Ticket>
     */
    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class, 'ticket_type_id');
    }

    /**
     * @return BelongsTo<TicketPriority, Ticket>
     */
    public function priority(): BelongsTo
    {
        return $this->belongsTo(TicketPriority::class, 'priority_id');
    }

    /**
     * @return BelongsTo<User, Ticket>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @return BelongsTo<User, Ticket>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * @return HasMany<TicketReply>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(TicketReply::class)->orderBy('created_at');
    }
}
