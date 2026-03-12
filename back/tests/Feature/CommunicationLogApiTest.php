<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\CommunicationLog;
use App\Models\CommunicationLogType;
use App\Models\User;
use Database\Seeders\CommunicationLogTypesSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunicationLogApiTest extends TestCase
{
    use RefreshDatabase;

    protected function actingAsCommsUser(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(CommunicationLogTypesSeeder::class);

        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo(['customer_service.view_comms', 'customer_service.manage_comms']);

        return $user;
    }

    public function test_can_list_communication_logs_with_filters(): void
    {
        $user = $this->actingAsCommsUser();
        $client = Client::create(['name' => 'Acme', 'company_name' => 'Acme']);
        $typeCall = CommunicationLogType::where('name', 'call')->first();
        CommunicationLog::create([
            'client_id' => $client->id,
            'created_by_id' => $user->id,
            'communication_log_type_id' => $typeCall->id,
            'subject' => 'Follow-up call',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/communication-logs?client_id='.$client->id);

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.subject', 'Follow-up call');
    }

    public function test_can_create_communication_log(): void
    {
        $user = $this->actingAsCommsUser();
        $client = Client::create(['name' => 'Acme', 'company_name' => 'Acme']);
        $typeEmail = CommunicationLogType::where('name', 'email')->first();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/communication-logs', [
                'client_id' => $client->id,
                'communication_log_type_id' => $typeEmail->id,
                'subject' => 'Invoice inquiry',
                'client_said' => 'Asked for copy',
                'reply' => 'Sent PDF',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.type.name', 'email')
            ->assertJsonPath('data.subject', 'Invoice inquiry');
        $this->assertDatabaseHas('communication_logs', [
            'client_id' => $client->id,
            'subject' => 'Invoice inquiry',
        ]);
    }
}
