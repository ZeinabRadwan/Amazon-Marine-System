<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Shared hosting MySQL instances often have a max index key length of 1000 bytes.
        // With `utf8mb4`, a `string(255)` becomes 255*4=1020 bytes, which breaks on indexed columns.
        Schema::defaultStringLength(191);

        \App\Models\Shipment::observe(\App\Observers\ShipmentObserver::class);
    }
}
