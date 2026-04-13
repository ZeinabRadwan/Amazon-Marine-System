<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Traits\HasFiles;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable, HasFiles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'initials',
        'status',
        'timezone',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * @return HasMany<Visit>
     */
    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    /**
     * @return HasMany<Shipment>
     */
    public function salesShipments(): HasMany
    {
        return $this->hasMany(Shipment::class, 'sales_rep_id');
    }

    /**
     * @return HasMany<ShipmentOperationTask>
     */
    public function assignedOperationTasks(): HasMany
    {
        return $this->hasMany(ShipmentOperationTask::class, 'assigned_to_id');
    }

    /**
     * @return HasMany<Payment>
     */
    public function createdPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'created_by_id');
    }

    /**
     * @return HasMany<TreasuryEntry>
     */
    public function createdTreasuryEntries(): HasMany
    {
        return $this->hasMany(TreasuryEntry::class, 'created_by_id');
    }

    /**
     * @return HasMany<Expense>
     */
    public function paidExpenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'paid_by_id');
    }

    /**
     * @return HasMany<Ticket>
     */
    public function createdTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'created_by_id');
    }

    /**
     * @return HasMany<Ticket>
     */
    public function assignedTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assigned_to_id');
    }

    /**
     * @return HasMany<Note>
     */
    public function notesAuthored(): HasMany
    {
        return $this->hasMany(Note::class, 'author_id');
    }

    /**
     * User-level permission overrides (allow/deny). Takes priority over role permissions.
     *
     * @return BelongsToMany<\Spatie\Permission\Models\Permission>
     */
    public function permissionOverrides(): BelongsToMany
    {
        return $this->belongsToMany(
            \Spatie\Permission\Models\Permission::class,
            'user_permissions',
            'user_id',
            'permission_id'
        )->withPivot('allowed')->withTimestamps();
    }

    /**
     * Get effective permission names (role permissions merged with user overrides).
     *
     * @return array<int, string>
     */
    public function getEffectivePermissionNames(): array
    {
        $rolePermissions = $this->getPermissionsViaRoles()->pluck('name')->keyBy(fn ($n) => $n);
        $overrides = $this->permissionOverrides()->get();
        foreach ($overrides as $override) {
            $name = $override->name;
            $rolePermissions[$name] = $override->pivot->allowed ? $name : null;
        }

        return $rolePermissions->filter()->values()->all();
    }

    /**
     * Check effective permission (user override wins over role).
     */
    public function hasEffectivePermission(string $ability): bool
    {
        $override = $this->permissionOverrides()
            ->where('name', $ability)
            ->first();
        if ($override !== null) {
            return (bool) $override->pivot->allowed;
        }

        return $this->can($ability);
    }
}
