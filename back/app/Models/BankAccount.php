<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'bank_name',
        'account_name',
        'account_number',
        'iban',
        'swift_code',
        'supported_currencies',
        'is_active',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'supported_currencies' => 'array',
        'is_active' => 'boolean',
    ];
}
