<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\SDForm;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SdFormStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['permissions.verification_enabled' => true]);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_sales_user_sd_form_stats_are_scoped_to_own_forms(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');
        $sales->givePermissionTo('sd_forms.view');

        $otherSales = User::factory()->create(['status' => 'active']);
        $otherSales->assignRole('sales');

        $client = Client::factory()->create();

        SDForm::create([
            'sd_number' => 'SD-STATS-001',
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'status' => 'draft',
            'shipment_direction' => 'Export',
        ]);
        SDForm::create([
            'sd_number' => 'SD-STATS-002',
            'client_id' => $client->id,
            'sales_rep_id' => $otherSales->id,
            'status' => 'submitted',
            'shipment_direction' => 'Export',
        ]);
        SDForm::create([
            'sd_number' => 'SD-STATS-003',
            'client_id' => $client->id,
            'sales_rep_id' => $otherSales->id,
            'status' => 'submitted',
            'shipment_direction' => 'Import',
        ]);

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/sd-forms/stats', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_forms', 1);
    }

    public function test_sales_user_with_no_sd_forms_gets_zero_stats(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');
        $sales->givePermissionTo('sd_forms.view');

        $otherSales = User::factory()->create(['status' => 'active']);
        $client = Client::factory()->create();

        SDForm::create([
            'sd_number' => 'SD-STATS-OTHER',
            'client_id' => $client->id,
            'sales_rep_id' => $otherSales->id,
            'status' => 'draft',
            'shipment_direction' => 'Export',
        ]);

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/sd-forms/stats', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_forms', 0)
            ->assertJsonPath('data.by_status', []);
    }

    public function test_admin_sd_form_stats_remain_global(): void
    {
        $admin = User::factory()->create(['status' => 'active']);
        $admin->assignRole('admin');

        $client = Client::factory()->create();
        $rep = User::factory()->create();

        SDForm::create([
            'sd_number' => 'SD-STATS-A1',
            'client_id' => $client->id,
            'sales_rep_id' => $rep->id,
            'status' => 'draft',
            'shipment_direction' => 'Export',
        ]);
        SDForm::create([
            'sd_number' => 'SD-STATS-A2',
            'client_id' => $client->id,
            'sales_rep_id' => $rep->id,
            'status' => 'submitted',
            'shipment_direction' => 'Export',
        ]);

        $token = $admin->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/sd-forms/stats', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.total_forms', 2);
    }
}
