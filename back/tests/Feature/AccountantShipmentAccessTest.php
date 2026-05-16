<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountantShipmentAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['permissions.verification_enabled' => true]);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_accounting_role_can_list_and_view_shipments(): void
    {
        $accountant = User::factory()->create(['status' => 'active']);
        $accountant->assignRole('accounting');

        $client = Client::factory()->create();
        $shipment = Shipment::create([
            'client_id' => $client->id,
            'bl_number' => 'BL-ACC-1',
            'status' => 'جديد',
            'shipment_direction' => 'Export',
        ]);

        $token = $accountant->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/shipments?per_page=5', [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->getJson("/api/v1/shipments/{$shipment->id}", [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk()
            ->assertJsonPath('data.bl_number', 'BL-ACC-1');

        $this->getJson("/api/v1/shipments/{$shipment->id}/cost-invoice", [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();
    }

    public function test_accounting_role_cannot_create_or_update_shipments(): void
    {
        $accountant = User::factory()->create(['status' => 'active']);
        $accountant->assignRole('accounting');

        $client = Client::factory()->create();
        $shipment = Shipment::create([
            'client_id' => $client->id,
            'bl_number' => 'BL-ACC-2',
            'status' => 'جديد',
            'shipment_direction' => 'Export',
        ]);

        $token = $accountant->createToken('test')->plainTextToken;

        $this->postJson('/api/v1/shipments', [
            'client_id' => $client->id,
            'shipment_direction' => 'Export',
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();

        $this->putJson("/api/v1/shipments/{$shipment->id}", [
            'notes' => 'Should not apply',
        ], [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }
}
