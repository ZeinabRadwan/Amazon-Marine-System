<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\SDForm;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShipmentListOperationsRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_operations_user_lists_shipment_when_sd_form_is_post_operations_status(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('sales');

        $operations = User::factory()->create();
        $operations->assignRole('operations');

        $client = Client::create(['name' => 'Client A', 'company_name' => 'Client A Co']);

        $sd = SDForm::create([
            'sd_number' => 'SD-OPS-LIST-1',
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'status' => 'converted_to_shipment',
            'shipment_direction' => 'Export',
        ]);

        Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'sd_form_id' => $sd->id,
            'bl_number' => 'BL-OPS-LIST-1',
            'status' => 'جديد',
        ]);

        $response = $this->actingAs($operations, 'sanctum')
            ->getJson('/api/v1/shipments?per_page=15');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.bl_number', 'BL-OPS-LIST-1');
    }

    public function test_operations_user_can_view_shipment_detail_without_shipments_view_permission(): void
    {
        $sales = User::factory()->create();
        $sales->assignRole('sales');

        $operations = User::factory()->create();
        $operations->assignRole('operations');

        $client = Client::create(['name' => 'Client B', 'company_name' => 'Client B Co']);

        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'bl_number' => 'BL-OPS-SHOW-1',
            'status' => 'جديد',
        ]);

        $response = $this->actingAs($operations, 'sanctum')
            ->getJson('/api/v1/shipments/'.$shipment->id);

        $response->assertOk()
            ->assertJsonPath('data.id', $shipment->id)
            ->assertJsonPath('data.bl_number', 'BL-OPS-SHOW-1');
    }
}
