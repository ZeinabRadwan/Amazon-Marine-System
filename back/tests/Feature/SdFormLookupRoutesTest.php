<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * No DB — verifies SD Form lookup routes are registered in routes/api.php.
 */
class SdFormLookupRoutesTest extends TestCase
{
    public function test_sd_form_lookup_routes_are_registered_not_404(): void
    {
        $uris = [
            '/api/v1/shipment-directions',
            '/api/v1/notify-party-modes',
            '/api/v1/freight-terms',
            '/api/v1/container-types',
            '/api/v1/container-sizes',
        ];

        foreach ($uris as $uri) {
            $response = $this->getJson($uri);
            $this->assertNotSame(
                404,
                $response->getStatusCode(),
                "Expected route to exist for {$uri} (got 404 — deploy routes/api.php and run php artisan route:clear)."
            );
            $response->assertUnauthorized();
        }
    }
}
