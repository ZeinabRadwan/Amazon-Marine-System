<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreasuryEntry extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'entry_type',
        'source',
        'account_id',
        'counter_account_id',
        'payment_id',
        'amount',
        'currency_code',
        'exchange_rate',
        'target_currency_code',
        'converted_amount',
        'method',
        'reference',
        'notes',
        'entry_date',
        'created_by_id',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:8',
        'converted_amount' => 'decimal:2',
        'entry_date' => 'date',
    ];

    /**
     * @return BelongsTo<Payment, TreasuryEntry>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * @return BelongsTo<User, TreasuryEntry>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
