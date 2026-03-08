<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyType extends Model
{
    protected $fillable = ['name', 'sort_order'];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    /**
     * @return HasMany<Client>
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'company_type_id');
    }
}
