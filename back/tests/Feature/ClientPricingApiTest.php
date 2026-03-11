<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientPricingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function actingAsPricingUser(): User
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->givePermissionTo([
            'clients.view',
            'clients.manage',
            'pricing.view_client_pricing',
            'pricing.manage_client_pricing',
        ]);

        return $user;
    }

    public function test_pricing_list_returns_client_pricing(): void
    {
        $user = $this->actingAsPricingUser();

        Client::factory()->create([
            'name' => 'Test Client',
            'company_name' => 'Test Co',
            'pricing_tier' => 'A',
            'pricing_discount_pct' => 10.5,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/clients/pricing?search=Test');

        $response->assertOk()
            ->assertJsonPath('data.0.name', 'Test Client')
            ->assertJsonPath('data.0.pricing_tier', 'A');
    }
}

