<?php

namespace App\Providers;

use App\Models\Client;
use App\Models\CommunicationLog;
use App\Models\Note;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\ShipmentTrackingUpdate;
use App\Models\Ticket;
use App\Models\TicketType;
use App\Models\User;
use App\Models\UserPermission;
use App\Policies\ClientPolicy;
use Illuminate\Support\Facades\Gate;
use App\Policies\CommunicationLogPolicy;
use App\Policies\NotePolicy;
use App\Policies\SDFormPolicy;
use App\Policies\ShipmentPolicy;
use App\Policies\ShipmentTrackingUpdatePolicy;
use App\Policies\TicketPolicy;
use App\Policies\TicketTypePolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class => UserPolicy::class,
        Client::class => ClientPolicy::class,
        SDForm::class => SDFormPolicy::class,
        Shipment::class => ShipmentPolicy::class,
        ShipmentTrackingUpdate::class => ShipmentTrackingUpdatePolicy::class,
        Ticket::class => TicketPolicy::class,
        TicketType::class => TicketTypePolicy::class,
        CommunicationLog::class => CommunicationLogPolicy::class,
        Note::class => NotePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // User-level permission overrides take priority over role permissions
        Gate::before(function (User $user, string $ability) {
            $override = UserPermission::where('user_id', $user->id)
                ->whereHas('permission', fn ($q) => $q->where('name', $ability))
                ->first();
            if ($override !== null) {
                return $override->allowed;
            }
            return null;
        });
    }
}
