<?php

namespace App\Providers;

use App\Models\Client;
use App\Models\Note;
use App\Models\Shipment;
use App\Models\SDForm;
use App\Models\Ticket;
use App\Models\User;
use App\Policies\ClientPolicy;
use App\Policies\NotePolicy;
use App\Policies\ShipmentPolicy;
use App\Policies\SDFormPolicy;
use App\Policies\TicketPolicy;
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
        Ticket::class => TicketPolicy::class,
        Note::class => NotePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}

