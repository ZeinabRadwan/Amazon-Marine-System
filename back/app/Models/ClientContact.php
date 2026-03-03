<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientContact extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'client_id',
        'name',
        'position',
        'email',
        'phone',
        'is_primary',
    ];

    /**
     * @return BelongsTo<Client, ClientContact>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
