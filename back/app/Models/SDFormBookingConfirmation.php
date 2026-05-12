<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SDFormBookingConfirmation extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'sd_form_id',
        'uploaded_by_user_id',
        'name',
        'path',
        'mime_type',
        'size',
    ];

    /**
     * @return BelongsTo<SDForm, SDFormBookingConfirmation>
     */
    public function sdForm(): BelongsTo
    {
        return $this->belongsTo(SDForm::class, 'sd_form_id');
    }

    /**
     * @return BelongsTo<User, SDFormBookingConfirmation>
     */
    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
