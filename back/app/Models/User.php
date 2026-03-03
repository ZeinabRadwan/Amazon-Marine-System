<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

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
     * @return HasMany<Client>
     */
    public function salesClients(): HasMany
    {
        return $this->hasMany(Client::class, 'assigned_sales_id');
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
}
