<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorPartnerType extends Model
{
    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
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
}
