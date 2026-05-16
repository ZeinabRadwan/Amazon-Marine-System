<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientInvoiceDraftApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_upsert_and_get_client_invoice_draft_persists_notes_and_items(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $client = Client::create(['name' => 'Draft Client', 'company_name' => 'Draft Co']);
        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $user->id,
            'bl_number' => 'BL-DRAFT-1',
            'status' => 'جديد',
        ]);

        $put = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/shipments/'.$shipment->id.'/client-invoice-draft', [
                'notes' => 'Partial draft note',
                'issue_date' => '2026-05-10',
                'due_date' => '2026-06-10',
                'items' => [
                    [
                        'description' => 'Ocean Freight',
                        'title' => 'Ocean Freight',
                        'quantity' => 1,
                        'unit_price' => 500,
                        'currency_code' => 'USD',
                        'section_key' => 'shipping',
                        'order_index' => 0,
                        'source_key' => 'test:shipping-1',
                    ],
                ],
            ]);

        $put->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.notes', 'Partial draft note');
        $this->assertStringContainsString('2026-05-10', (string) $put->json('data.issue_date'));
        $this->assertStringContainsString('2026-06-10', (string) $put->json('data.due_date'));

        $invoiceId = (int) $put->json('data.id');
        $this->assertGreaterThan(0, $invoiceId);

        $get = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shipments/'.$shipment->id.'/client-invoice-draft');

        $get->assertOk()
            ->assertJsonPath('data.id', $invoiceId)
            ->assertJsonPath('data.notes', 'Partial draft note');

        $this->assertDatabaseHas('invoices', [
            'id' => $invoiceId,
            'shipment_id' => $shipment->id,
            'client_id' => $client->id,
            'status' => 'draft',
        ]);
    }

    public function test_merge_section_keys_preserves_other_sections(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $client = Client::create(['name' => 'Merge Client', 'company_name' => 'Merge Co']);
        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $user->id,
            'bl_number' => 'BL-DRAFT-2',
            'status' => 'جديد',
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/shipments/'.$shipment->id.'/client-invoice-draft', [
                'items' => [
                    [
                        'description' => 'Shipping line',
                        'quantity' => 1,
                        'unit_price' => 100,
                        'currency_code' => 'USD',
                        'section_key' => 'shipping',
                        'source_key' => 'test:ship',
                    ],
                    [
                        'description' => 'Customs fee',
                        'quantity' => 1,
                        'unit_price' => 50,
                        'currency_code' => 'USD',
                        'section_key' => 'customs',
                        'source_key' => 'test:customs',
                    ],
                ],
            ])
            ->assertOk();

        $invoice = Invoice::query()->where('shipment_id', $shipment->id)->where('status', 'draft')->first();
        $this->assertNotNull($invoice);
        $this->assertSame(2, $invoice->items()->count());

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/shipments/'.$shipment->id.'/client-invoice-draft', [
                'merge_section_keys' => ['customs'],
                'items' => [
                    [
                        'description' => 'Updated customs',
                        'quantity' => 1,
                        'unit_price' => 75,
                        'currency_code' => 'USD',
                        'section_key' => 'customs',
                        'source_key' => 'test:customs',
                    ],
                ],
            ])
            ->assertOk();

        $invoice->refresh();
        $items = $invoice->items()->orderBy('section_key')->get();
        $this->assertCount(2, $items);
        $shipping = $items->firstWhere('section_key', 'shipping');
        $customs = $items->firstWhere('section_key', 'customs');
        $this->assertNotNull($shipping);
        $this->assertSame(100.0, (float) $shipping->unit_price);
        $this->assertNotNull($customs);
        $this->assertSame(75.0, (float) $customs->unit_price);
    }
}
