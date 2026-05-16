<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_overview_returns_real_kpi_structure(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $invoice = Invoice::query()->create([
            'invoice_number' => 'INV-DASH-'.uniqid(),
            'issue_date' => now()->startOfMonth(),
            'status' => 'issued',
            'currency_code' => 'USD',
            'total_amount' => 1500,
            'net_amount' => 1500,
        ]);

        InvoiceItem::query()->create([
            'invoice_id' => $invoice->id,
            'description' => 'Ocean freight',
            'quantity' => 1,
            'unit_price' => 1500,
            'line_total' => 1500,
            'currency_code' => 'USD',
        ]);

        Expense::query()->create([
            'description' => 'Office rent',
            'amount' => 200,
            'currency_code' => 'USD',
            'expense_date' => now()->startOfMonth(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/admin-overview');

        $response->assertOk();
        $response->assertJsonStructure([
            'kpi_cards' => [
                'monthly_revenue' => ['by_currency', 'change_pct'],
                'shipment_costs' => ['by_currency', 'shipment_count'],
                'shipment_net_profit' => ['by_currency', 'margin_pct'],
                'company_net_profit' => ['by_currency'],
                'customer_debts' => ['by_currency'],
                'partner_obligations' => ['by_currency'],
            ],
            'bank_accounts',
            'sales_team',
            'operations' => [
                'active_shipments',
                'sd_forms_awaiting_booking',
                'overdue_tasks',
                'near_cutoff_shipments',
                'today_tasks',
            ],
        ]);

        $response->assertJsonPath('kpi_cards.monthly_revenue.by_currency.USD', 1500);
    }
}
