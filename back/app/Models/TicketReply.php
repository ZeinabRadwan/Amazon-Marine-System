<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketReply extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'ticket_id',
        'user_id',
        'body',
    ];

    /**
     * @return BelongsTo<Ticket, TicketReply>
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * @return BelongsTo<User, TicketReply>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
