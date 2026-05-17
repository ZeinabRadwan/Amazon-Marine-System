<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['permissions.verification_enabled' => true]);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_sales_user_client_stats_are_scoped_to_assigned_clients(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');
        $sales->givePermissionTo('clients.view');

        $otherSales = User::factory()->create(['status' => 'active']);
        $otherSales->assignRole('sales');

        $mine = Client::factory()->create(['assigned_sales_id' => $sales->id]);
        Client::factory()->create(['assigned_sales_id' => $otherSales->id]);
        Client::factory()->create(['assigned_sales_id' => null]);

        Invoice::create([
            'invoice_number' => 'INV-STATS-001',
            'client_id' => $mine->id,
            'status' => 'paid',
            'net_amount' => 1000,
        ]);
        $otherClient = Client::factory()->create(['assigned_sales_id' => $otherSales->id]);
        Invoice::create([
            'invoice_number' => 'INV-STATS-002',
            'client_id' => $otherClient->id,
            'status' => 'paid',
            'net_amount' => 50000,
        ]);

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/clients/stats', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_clients', 1)
            ->assertJsonPath('data.total_revenue_from_clients', 1000);
    }

    public function test_sales_user_with_no_clients_gets_zero_stats(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');
        $sales->givePermissionTo('clients.view');

        Client::factory()->count(3)->create(['assigned_sales_id' => User::factory()->create()->id]);

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/clients/stats', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_clients', 0)
            ->assertJsonPath('data.active_clients', 0)
            ->assertJsonPath('data.new_clients_this_month', 0)
            ->assertJsonPath('data.total_revenue_from_clients', 0);
    }

    public function test_admin_client_stats_remain_global(): void
    {
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('admin');

        Client::factory()->count(2)->create();
        Client::factory()->create(['assigned_sales_id' => User::factory()->create()->id]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/clients/stats', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_clients', 3);
    }
}
