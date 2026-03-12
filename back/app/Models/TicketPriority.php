<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketPriority extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'label_ar',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return HasMany<Ticket, TicketPriority>
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'priority_id');
    }
}
