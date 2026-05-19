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

    public function test_cost_invoice_allows_save_without_inland_lines_when_only_ops_vendor_in_section_meta(): void
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            $this->markTestSkipped('shipment_cost_invoices table not migrated');
        }

        $user = User::factory()->create();
        $user->givePermissionTo(['shipments.view', 'shipments.manage_ops']);

        $client = Client::create(['name' => 'Cost Client 2', 'company_name' => 'Cost Co 2']);
        $contractor = Vendor::query()->create([
            'name' => 'Inland Only Meta',
            'type' => 'inland_transport',
            'is_active' => true,
        ]);

        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $user->id,
            'bl_number' => 'BL-COST-2',
            'status' => 'جديد',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/shipments/'.$shipment->id.'/cost-invoice', [
                'status' => 'draft',
                'items' => [
                    [
                        'bucket_id' => 'sea',
                        'template_id' => 'oceanFreight',
                        'amount' => 250,
                        'currency_code' => 'USD',
                        'order_index' => 0,
                    ],
                ],
                'section_meta' => [
                    'inland' => [
                        'contractor_vendor_id' => $contractor->id,
                        'contractor_name' => $contractor->name,
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.section_meta.inland.contractor_vendor_id', $contractor->id);
    }

    public function test_cost_invoice_requires_inland_vendor_when_inland_line_items_present(): void
    {
        if (! Schema::hasTable('shipment_cost_invoices')) {
            $this->markTestSkipped('shipment_cost_invoices table not migrated');
        }

        $user = User::factory()->create();
        $user->givePermissionTo(['shipments.view', 'shipments.manage_ops']);

        $client = Client::create(['name' => 'Cost Client 3', 'company_name' => 'Cost Co 3']);

        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $user->id,
            'bl_number' => 'BL-COST-3',
            'status' => 'جديد',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/shipments/'.$shipment->id.'/cost-invoice', [
                'status' => 'draft',
                'items' => [
                    [
                        'bucket_id' => 'inland',
                        'template_id' => 'inlandFreight',
                        'amount' => 50,
                        'currency_code' => 'USD',
                        'order_index' => 0,
                    ],
                ],
                'section_meta' => [],
            ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Inland Transportation section requires contractor vendor selection.',
            ]);
    }
}
