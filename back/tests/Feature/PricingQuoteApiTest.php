<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingQuoteApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    protected function actingAsPricingUser(): User
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo([
            'pricing.view_quotes',
            'pricing.manage_quotes',
        ]);

        return $user;
    }

    public function test_can_create_and_view_quote(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create([
            'name' => 'Test Client',
        ]);

        $payload = [
            'client_id' => $client->id,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'container_type' => '40HQ Dry',
            'qty' => 1,
            'valid_from' => '2026-03-01',
            'valid_to' => '2026-03-31',
            'notes' => 'API test quote',
            'sailing_dates' => ['2026-03-14', '2026-03-21'],
            'items' => [
                ['code' => 'ocean', 'name' => 'Ocean Freight', 'description' => 'Base', 'amount' => 1000, 'currency' => 'USD'],
                ['code' => 'thc', 'name' => 'THC', 'description' => '', 'amount' => 250, 'currency' => 'USD'],
            ],
        ];

        $create = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/quotes', $payload);

        $create->assertCreated()
            ->assertJsonPath('data.client.id', $client->id)
            ->assertJsonPath('data.items.0.amount', 1000);

        $id = $create->json('data.id');
        $this->assertNotNull($id);

        $show = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/quotes/'.$id);

        $show->assertOk()
            ->assertJsonPath('data.id', $id)
            ->assertJsonPath('data.sailing_dates.0', '2026-03-14');
    }

    public function test_can_accept_and_reject_quote(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/pricing/quotes', [
            'client_id' => $client->id,
            'items' => [
                ['name' => 'Ocean Freight', 'amount' => 1000, 'currency' => 'USD'],
            ],
        ]);

        $create->assertCreated();
        $id = $create->json('data.id');

        $accepted = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/quotes/'.$id.'/accept');
        $accepted->assertOk()->assertJsonPath('data.status', 'accepted');

        $rejected = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/quotes/'.$id.'/reject');
        $rejected->assertOk()->assertJsonPath('data.status', 'rejected');
    }
}

