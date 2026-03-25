<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunicationLogType extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'label_ar',
        'label_en',
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

    /**
     * @return HasMany<CommunicationLog, CommunicationLogType>
     */
    public function communicationLogs(): HasMany
    {
        return $this->hasMany(CommunicationLog::class, 'communication_log_type_id');
    }
}
