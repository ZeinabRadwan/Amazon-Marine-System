<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\CustomerTransaction;
use App\Models\Payment;
use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrepaidPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    protected function actingAsFinancialUser(): User
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo(['financial.manage', 'accounting.view']);

        return $user;
    }

    public function test_advance_client_receipt_without_invoice_records_prepaid_credit(): void
    {
        $user = $this->actingAsFinancialUser();
        $client = Client::create(['name' => 'Prepaid Client', 'company_name' => 'Prepaid Co']);
        $sales = User::factory()->create();

        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'bl_number' => 'BL-PREPAID-1',
            'status' => 'جديد',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/payments', [
                'type' => 'client_receipt',
                'client_id' => $client->id,
                'shipment_id' => $shipment->id,
                'amount' => 500,
                'currency_code' => 'USD',
                'method' => 'bank_transfer',
                'paid_at' => '2026-05-01',
                'reference' => 'ADV-001',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.invoice_id', null)
            ->assertJsonPath('data.client_id', $client->id)
            ->assertJsonPath('data.shipment_id', $shipment->id);

        $paymentId = (int) $response->json('data.id');
        $this->assertDatabaseHas('payments', [
            'id' => $paymentId,
            'type' => 'client_receipt',
            'invoice_id' => null,
            'client_id' => $client->id,
        ]);

        $this->assertDatabaseHas('customer_transactions', [
            'customer_id' => $client->id,
            'invoice_id' => null,
            'type' => 'credit',
        ]);
    }

    public function test_shipment_payments_list_includes_unallocated_advance(): void
    {
        $user = $this->actingAsFinancialUser();
        $client = Client::create(['name' => 'List Client', 'company_name' => 'List Co']);
        $sales = User::factory()->create();

        $shipment = Shipment::create([
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'bl_number' => 'BL-PREPAID-2',
            'status' => 'جديد',
        ]);

        Payment::query()->create([
            'type' => 'client_receipt',
            'client_id' => $client->id,
            'shipment_id' => $shipment->id,
            'amount' => 250,
            'currency_code' => 'USD',
            'method' => 'cash',
            'paid_at' => now(),
            'created_by_id' => $user->id,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/payments?type=client_receipt&client_id='.$client->id.'&shipment_id='.$shipment->id);

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.invoice_id', null)
            ->assertJsonPath('data.0.amount', '250.00');
    }

    public function test_customer_statement_detail_includes_prepaid_balance(): void
    {
        $user = $this->actingAsFinancialUser();
        $client = Client::create(['name' => 'Statement Client', 'company_name' => 'Statement Co']);
        $sales = User::factory()->create();

        Payment::query()->create([
            'type' => 'client_receipt',
            'client_id' => $client->id,
            'amount' => 300,
            'currency_code' => 'USD',
            'method' => 'cash',
            'paid_at' => now(),
            'created_by_id' => $user->id,
        ]);

        CustomerTransaction::create([
            'customer_id' => $client->id,
            'invoice_id' => null,
            'type' => 'credit',
            'amount' => 300,
            'currency_id' => 1,
            'description' => 'Advance payment (prepaid)',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/accounting/customer-statements/'.$client->id);

        $response->assertOk()
            ->assertJsonPath('data.prepaid_balance_by_currency.USD', 300)
            ->assertJsonCount(1, 'data.advance_payments');
    }
}
