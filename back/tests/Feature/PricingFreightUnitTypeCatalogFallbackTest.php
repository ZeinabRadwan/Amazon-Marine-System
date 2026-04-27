<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Ensures API does not return 500 when pricing_freight_unit_types is missing (un-migrated DB).
 */
class PricingFreightUnitTypeCatalogFallbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    protected function actingAsPricingUser(): User
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo([
            'pricing.view_offers',
            'pricing.manage_offers',
        ]);

        return $user;
    }

    public function test_index_returns_empty_payload_when_table_dropped(): void
    {
        $user = $this->actingAsPricingUser();

        Schema::dropIfExists('pricing_freight_unit_types');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/freight-unit-types?dataset=ocean_container');

        $response->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.catalog_available', false);
    }

    public function test_store_returns_503_when_table_dropped(): void
    {
        $user = $this->actingAsPricingUser();

        Schema::dropIfExists('pricing_freight_unit_types');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/freight-unit-types', [
                'dataset' => 'ocean_container',
                'label' => "40' Dry",
            ]);

        $response->assertStatus(503)
            ->assertJsonPath('error', 'catalog_unavailable');
    }

    public function test_update_returns_503_when_table_dropped(): void
    {
        $user = $this->actingAsPricingUser();

        Schema::dropIfExists('pricing_freight_unit_types');

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/pricing/freight-unit-types/1', [
                'label' => 'Updated',
            ]);

        $response->assertStatus(503)
            ->assertJsonPath('error', 'catalog_unavailable');
    }
}
