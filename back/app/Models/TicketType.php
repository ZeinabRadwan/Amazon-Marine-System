<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketType extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'label_ar',
        'label_en',
    ];

    /**
     * @return HasMany<Ticket, TicketType>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'ticket_type_id');
    }
}
