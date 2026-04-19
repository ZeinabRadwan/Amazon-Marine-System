<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use App\Traits\HasFiles;

class Document extends Model
{
    use HasFiles;
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'type',
        'path',
        'mime_type',
        'size',
        'uploaded_by_id',
    ];

    /**
     * @return BelongsTo<User, Document>
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_id');
    }
}
