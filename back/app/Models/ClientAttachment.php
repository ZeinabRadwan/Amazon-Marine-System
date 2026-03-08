<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAttachment extends Model
{
    protected $fillable = [
        'client_id',
        'name',
        'path',
        'mime_type',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    /**
     * @return BelongsTo<Client, ClientAttachment>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
