<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\PricingQuote;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['permissions.verification_enabled' => true]);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_sales_employee_dashboard_returns_kpis_and_charts(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');

        $client = Client::factory()->create(['assigned_sales_id' => $sales->id]);

        PricingQuote::create([
            'quote_no' => 'Q-SD-001',
            'client_id' => $client->id,
            'sales_user_id' => $sales->id,
            'status' => 'pending',
        ]);

        Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'bl_number' => 'BL-SD-1',
            'status' => 'completed',
            'shipment_direction' => 'Export',
            'selling_price_total' => 50000,
            'profit_total' => 8000,
        ]);

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/dashboard/sales-employee?completed_period=current_month', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonStructure([
                'kpis' => [
                    'active_customers',
                    'open_shipments',
                    'completed_shipments',
                    'quotations_sent_month',
                    'conversion_rate_pct',
                    'total_revenue',
                    'net_profit',
                ],
                'charts' => [
                    'monthly_revenue_profit_line',
                    'quotations_sent_bar',
                    'conversion_rate_line',
                ],
            ])
            ->assertJsonPath('sales_user_id', $sales->id)
            ->assertJsonPath('kpis.active_customers', 1)
            ->assertJsonPath('kpis.total_revenue', 50000)
            ->assertJsonPath('kpis.net_profit', 8000);
    }

    public function test_sales_employee_dashboard_excludes_other_sales_users_data(): void
    {
        $salesA = User::factory()->create(['status' => 'active']);
        $salesA->assignRole('sales');

        $salesB = User::factory()->create(['status' => 'active']);
        $salesB->assignRole('sales');

        $clientB = Client::factory()->create(['assigned_sales_id' => $salesB->id]);

        PricingQuote::create([
            'quote_no' => 'Q-SD-B',
            'client_id' => $clientB->id,
            'sales_user_id' => $salesB->id,
            'status' => 'pending',
        ]);

        Shipment::create([
            'client_id' => $clientB->id,
            'sales_rep_id' => $salesB->id,
            'bl_number' => 'BL-SD-B',
            'status' => 'completed',
            'shipment_direction' => 'Export',
            'selling_price_total' => 90000,
            'profit_total' => 12000,
        ]);

        $tokenA = $salesA->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/dashboard/sales-employee?completed_period=current_month', [
            'Authorization' => 'Bearer '.$tokenA,
        ])
            ->assertOk()
            ->assertJsonPath('sales_user_id', $salesA->id)
            ->assertJsonPath('kpis.active_customers', 0)
            ->assertJsonPath('kpis.open_shipments', 0)
            ->assertJsonPath('kpis.quotations_sent_month', 0)
            ->assertJsonPath('kpis.total_revenue', 0)
            ->assertJsonPath('kpis.net_profit', 0);
    }

    public function test_sales_can_link_shipment_to_quotation(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');

        $client = Client::factory()->create(['assigned_sales_id' => $sales->id]);

        $quote = PricingQuote::create([
            'quote_no' => 'Q-SD-002',
            'client_id' => $client->id,
            'sales_user_id' => $sales->id,
            'status' => 'pending',
        ]);

        $token = $sales->createToken('test')->plainTextToken;

        $create = $this->postJson('/api/v1/shipments', [
            'client_id' => $client->id,
            'shipment_direction' => 'Export',
            'pricing_quote_id' => $quote->id,
        ], [
            'Authorization' => 'Bearer '.$token,
        ]);

        $create->assertCreated();

        $shipmentId = $create->json('data.id');
        $this->assertNotNull($shipmentId);

        $this->assertDatabaseHas('shipments', [
            'id' => $shipmentId,
            'pricing_quote_id' => $quote->id,
            'quotation_reference' => 'Q-SD-002',
        ]);
    }
}
