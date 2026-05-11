<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'expense_id',
        'amount',
        'currency_code',
        'exchange_rate',
        'exchange_rate_source',
        'journal_transaction_id',
        'journal_kind',
        'ledger_side',
        'target_currency_code',
        'converted_amount',
        'method',
        'reference',
        'notes',
        'entry_date',
        'created_by_id',
        'is_voided',
        'voided_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:8',
        'converted_amount' => 'decimal:2',
        'entry_date' => 'date',
        'is_voided' => 'boolean',
        'voided_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Payment, TreasuryEntry>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * @return BelongsTo<Expense, TreasuryEntry>
     */
    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    /**
     * @return BelongsTo<User, TreasuryEntry>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
