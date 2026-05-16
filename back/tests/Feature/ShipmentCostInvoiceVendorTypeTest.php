<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vendor;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ShipmentCostInvoiceVendorTypeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_cost_invoice_accepts_contractor_alias_for_inland_section(): void
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            $this->markTestSkipped('shipment_cost_invoices table not migrated');
        }

        $user = User::factory()->create();
        $user->givePermissionTo(['shipments.view', 'shipments.manage_ops']);

        $client = Client::create(['name' => 'Cost Client', 'company_name' => 'Cost Co']);
        $contractor = Vendor::query()->create([
            'name' => 'Inland Contractor',
            'type' => 'contractor',
            'is_active' => true,
        ]);

        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $user->id,
            'bl_number' => 'BL-COST-1',
            'status' => 'جديد',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/shipments/'.$shipment->id.'/cost-invoice', [
                'status' => 'draft',
                'items' => [
                    [
                        'bucket_id' => 'inland',
                        'template_id' => 'inlandFreight',
                        'amount' => 100,
                        'currency_code' => 'USD',
                        'vendor_id' => $contractor->id,
                        'order_index' => 0,
                    ],
                ],
                'section_meta' => [
                    'inland' => [
                        'contractor_vendor_id' => $contractor->id,
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.section_meta.inland.contractor_vendor_id', $contractor->id);
    }
}
