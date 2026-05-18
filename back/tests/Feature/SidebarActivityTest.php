<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientFollowUp;
use App\Models\SDForm;
use App\Models\User;
use App\Notifications\SdFormInformationRequestedNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SidebarActivityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['permissions.verification_enabled' => true]);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_sidebar_counts_use_unread_activity_not_record_totals(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');

        $otherSales = User::factory()->create(['status' => 'active']);
        $otherSales->assignRole('sales');

        $client = Client::factory()->create(['assigned_sales_id' => $sales->id]);
        Client::factory()->count(5)->create(['assigned_sales_id' => $otherSales->id]);

        $form = SDForm::create([
            'sd_number' => 'SD-BADGE-1',
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'status' => 'information_requested',
            'shipment_direction' => 'Export',
        ]);

        $sales->notify(new SdFormInformationRequestedNotification($form, 'Please complete ACID'));

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/dashboard/sidebar-counts', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.sdFormsCount', 1)
            ->assertJsonPath('data.badges.sd_forms', 1)
            ->assertJsonPath('data.crmCount', 0);
    }

    public function test_clients_badge_includes_overdue_follow_ups_until_acknowledged(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');

        $client = Client::factory()->create(['assigned_sales_id' => $sales->id]);

        ClientFollowUp::create([
            'client_id' => $client->id,
            'created_by_id' => $sales->id,
            'channel' => 'phone',
            'followup_type' => 'call',
            'summary' => 'Call back',
            'occurred_at' => now()->subDay(),
            'next_follow_up_at' => now()->subHour(),
        ]);

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/dashboard/sidebar-counts', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.crmCount', 1)
            ->assertJsonPath('data.badges.clients', 1);

        $this->postJson('/api/v1/dashboard/sidebar-activity/acknowledge', [
            'module' => 'clients',
        ], [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.crmCount', 0)
            ->assertJsonPath('data.badges.clients', 0);

        Cache::flush();
    }

    public function test_marking_notification_read_reduces_module_badge(): void
    {
        $sales = User::factory()->create(['status' => 'active']);
        $sales->assignRole('sales');

        $client = Client::factory()->create(['assigned_sales_id' => $sales->id]);
        $form = SDForm::create([
            'sd_number' => 'SD-BADGE-2',
            'client_id' => $client->id,
            'sales_rep_id' => $sales->id,
            'status' => 'information_requested',
            'shipment_direction' => 'Export',
        ]);

        $sales->notify(new SdFormInformationRequestedNotification($form, 'Note'));

        $token = $sales->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/dashboard/sidebar-counts', [
            'Authorization' => 'Bearer '.$token,
        ])->assertJsonPath('data.sdFormsCount', 1);

        $notificationId = $sales->unreadNotifications()->first()->id;

        $this->postJson("/api/v1/notifications/{$notificationId}/read", [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $this->getJson('/api/v1/dashboard/sidebar-counts', [
            'Authorization' => 'Bearer '.$token,
        ])
            ->assertOk()
            ->assertJsonPath('data.sdFormsCount', 0);
    }
}
