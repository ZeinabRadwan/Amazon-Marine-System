<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketStatus extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'key',
        'label_ar',
        'label_en',
        'active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'bool',
            'sort_order' => 'int',
        ];
    }
}
