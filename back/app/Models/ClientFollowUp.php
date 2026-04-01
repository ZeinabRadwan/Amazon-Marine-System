<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientFollowUp extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'client_id',
        'channel',
        'followup_type',
        'outcome',
        'occurred_at',
        'summary',
        'next_follow_up_at',
        'reminder_at',
        'reminder_before_value',
        'reminder_before_unit',
        'created_by_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'next_follow_up_at' => 'datetime',
            'reminder_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Client, ClientFollowUp>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<User, ClientFollowUp>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * @param  Builder<ClientFollowUp>  $query
     */
    public function scopeForSalespersonPortfolio(Builder $query, int $userId): void
    {
        $query->where(function (Builder $w) use ($userId) {
            $w->whereHas('client', fn (Builder $c) => $c->where('assigned_sales_id', $userId))
                ->orWhere(function (Builder $w2) use ($userId) {
                    $w2->where('created_by_id', $userId)
                        ->whereHas('client', fn (Builder $c) => $c->whereNull('assigned_sales_id'));
                });
        });
    }
}
