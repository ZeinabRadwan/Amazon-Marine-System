<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shipment;
use App\Models\ShipmentTrackingUpdate;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShipmentTrackingUpdateApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    protected function userWithTrackingPermission(): User
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo([
            'customer_service.view_tracking_updates',
            'customer_service.manage_tracking_updates',
        ]);

        return $user;
    }

    public function test_can_list_tracking_updates_for_shipment(): void
    {
        $user = $this->userWithTrackingPermission();
        $client = Client::create(['name' => 'Test', 'company_name' => 'Test']);
        $shipment = Shipment::create([
            'client_id' => $client->id,
            'bl_number' => 'BL-2026-0001',
            'status' => 'in_transit',
        ]);
        ShipmentTrackingUpdate::create([
            'shipment_id' => $shipment->id,
            'created_by_id' => $user->id,
            'update_text' => 'Departed port',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shipments/'.$shipment->id.'/tracking-updates');

        $response->assertOk()
            ->assertJsonPath('data.0.update_text', 'Departed port');
    }

    public function test_can_add_tracking_update(): void
    {
        $user = $this->userWithTrackingPermission();
        $client = Client::create(['name' => 'Test', 'company_name' => 'Test']);
        $shipment = Shipment::create([
            'client_id' => $client->id,
            'bl_number' => 'BL-2026-0002',
            'status' => 'booked',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipments/'.$shipment->id.'/tracking-updates', [
                'update_text' => 'Container allocated and loading in progress.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.update_text', 'Container allocated and loading in progress.');
        $this->assertDatabaseHas('shipment_tracking_updates', [
            'shipment_id' => $shipment->id,
            'update_text' => 'Container allocated and loading in progress.',
        ]);
    }
}
