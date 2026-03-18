<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentStatus extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name_ar',
        'name_en',
        'color',
        'description',
        'active',
        'sort_order',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'active' => 'bool',
        'sort_order' => 'int',
    ];
}
