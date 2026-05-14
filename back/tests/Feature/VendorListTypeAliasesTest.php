<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vendor;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorListTypeAliasesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_vendors_index_filters_customs_clearance_by_alias_type(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        Vendor::create(['name' => 'Broker A', 'type' => 'customs_broker']);
        Vendor::create(['name' => 'Truck B', 'type' => 'inland_transport']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/vendors?type=customs_clearance');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Broker A', $names);
        $this->assertNotContains('Truck B', $names);
    }

    public function test_vendors_index_types_parameter_matches_any_bucket(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        Vendor::create(['name' => 'Insurer X', 'type' => 'insurer']);
        Vendor::create(['name' => 'Line Y', 'type' => 'shipping_line']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/vendors?types=insurance,overseas_agent');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains('Insurer X', $names);
        $this->assertNotContains('Line Y', $names);
    }
}
