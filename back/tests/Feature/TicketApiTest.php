<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketReply;
use App\Models\TicketType;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketStatusesSeeder;
use Database\Seeders\TicketTypesAndPrioritiesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketApiTest extends TestCase
{
    use RefreshDatabase;

    protected function actingAsTicketUser(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(TicketTypesAndPrioritiesSeeder::class);
        $this->seed(TicketStatusesSeeder::class);

        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo(['tickets.view', 'tickets.manage']);

        return $user;
    }

    public function test_can_list_tickets_with_filters(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(TicketTypesAndPrioritiesSeeder::class);
        $this->seed(TicketStatusesSeeder::class);

        $user = User::factory()->create();
        $user->givePermissionTo(['tickets.view']);

        $client = Client::create(['name' => 'Acme Corp', 'company_name' => 'Acme']);
        $typeInquiry = TicketType::where('name', 'inquiry')->first();
        $priorityMedium = TicketPriority::where('name', 'medium')->first();
        Ticket::create([
            'client_id' => $client->id,
            'created_by_id' => $user->id,
            'ticket_type_id' => $typeInquiry->id,
            'priority_id' => $priorityMedium->id,
            'ticket_number' => 'TKT-2026-0001',
            'subject' => 'Test ticket',
            'description' => 'Desc',
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets?status=open&ticket_type_id='.$typeInquiry->id);

        $response->assertOk()
            ->assertJsonPath('data.0.ticket_number', 'TKT-2026-0001')
            ->assertJsonPath('data.0.subject', 'Test ticket');
    }

    public function test_can_create_ticket_with_generated_ticket_number(): void
    {
        $user = $this->actingAsTicketUser();
        $client = Client::create(['name' => 'Test Client', 'company_name' => 'Test Co']);

        $typeInquiry = TicketType::where('name', 'inquiry')->first();
        $priorityHigh = TicketPriority::where('name', 'high')->first();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/tickets', [
                'client_id' => $client->id,
                'subject' => 'New inquiry',
                'description' => 'Details here',
                'ticket_type_id' => $typeInquiry->id,
                'priority_id' => $priorityHigh->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.subject', 'New inquiry')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.priority.id', $priorityHigh->id);
        $this->assertMatchesRegularExpression('/^TKT-\d{4}-\d{4}$/', $response->json('data.ticket_number'));
    }

    public function test_can_update_ticket_status(): void
    {
        $user = $this->actingAsTicketUser();
        $client = Client::create(['name' => 'Test Client', 'company_name' => 'Test Co']);
        $typeInquiry = TicketType::where('name', 'inquiry')->first();
        $priorityMedium = TicketPriority::where('name', 'medium')->first();
        $ticket = Ticket::create([
            'client_id' => $client->id,
            'created_by_id' => $user->id,
            'ticket_type_id' => $typeInquiry->id,
            'priority_id' => $priorityMedium->id,
            'ticket_number' => 'TKT-2026-0001',
            'subject' => 'Ticket',
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/tickets/'.$ticket->id, [
                'status' => 'in_progress',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'in_progress');
    }

    public function test_can_store_ticket_reply(): void
    {
        $user = $this->actingAsTicketUser();
        $client = Client::create(['name' => 'Test Client', 'company_name' => 'Test Co']);
        $typeInquiry = TicketType::where('name', 'inquiry')->first();
        $priorityMedium = TicketPriority::where('name', 'medium')->first();
        $ticket = Ticket::create([
            'client_id' => $client->id,
            'created_by_id' => $user->id,
            'ticket_type_id' => $typeInquiry->id,
            'priority_id' => $priorityMedium->id,
            'ticket_number' => 'TKT-2026-0001',
            'subject' => 'Ticket',
            'status' => 'open',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/tickets/'.$ticket->id.'/replies', [
                'body' => 'We are looking into this.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.body', 'We are looking into this.')
            ->assertJsonPath('data.user.id', $user->id);
        $this->assertDatabaseHas('ticket_replies', [
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'body' => 'We are looking into this.',
        ]);
    }

    public function test_ticket_show_lists_replies_in_chronological_order(): void
    {
        $user = $this->actingAsTicketUser();
        $client = Client::create(['name' => 'Test Client', 'company_name' => 'Test Co']);
        $typeInquiry = TicketType::where('name', 'inquiry')->first();
        $priorityMedium = TicketPriority::where('name', 'medium')->first();
        $ticket = Ticket::create([
            'client_id' => $client->id,
            'created_by_id' => $user->id,
            'ticket_type_id' => $typeInquiry->id,
            'priority_id' => $priorityMedium->id,
            'ticket_number' => 'TKT-2026-0001',
            'subject' => 'Ticket',
            'status' => 'open',
        ]);

        TicketReply::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'body' => 'First reply',
        ]);

        $this->travel(2)->seconds();

        TicketReply::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'body' => 'Second reply',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/tickets/'.$ticket->id);

        $response->assertOk()
            ->assertJsonPath('data.replies.0.body', 'First reply')
            ->assertJsonPath('data.replies.1.body', 'Second reply');
    }
}
