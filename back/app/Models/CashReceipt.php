<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CashReceipt extends Model
{
    protected $fillable = [
        'client_id',
        'receipt_number',
        'receipt_kind',
        'totals_by_currency',
        'pdf_path',
        'locale',
        'created_by_id',
    ];

    protected $casts = [
        'totals_by_currency' => 'array',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function payments(): BelongsToMany
    {
        return $this->belongsToMany(Payment::class, 'cash_receipt_payment')
            ->withTimestamps();
    }
}
