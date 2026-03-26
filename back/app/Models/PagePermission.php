<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Role;

class PagePermission extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'role_id',
        'page',
        'can_view',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'can_view' => 'bool',
    ];

    /**
     * @return BelongsTo<Role, PagePermission>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
