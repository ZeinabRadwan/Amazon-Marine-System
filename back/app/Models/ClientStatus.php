<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientStatus extends Model
{
    protected $fillable = ['name_ar', 'name_en', 'sort_order'];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    /**
     * @return HasMany<Client>
     */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'status_id');
    }
}
