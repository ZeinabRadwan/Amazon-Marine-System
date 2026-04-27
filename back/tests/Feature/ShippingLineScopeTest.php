<?php

namespace Tests\Feature;

use App\Models\ShippingLine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingLineScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_ocean_scope_returns_ocean_and_both(): void
    {
        $user = User::factory()->create();

        ShippingLine::create(['name' => 'Ocean A', 'active' => true, 'service_scope' => 'ocean']);
        ShippingLine::create(['name' => 'Inland A', 'active' => true, 'service_scope' => 'inland']);
        ShippingLine::create(['name' => 'Both A', 'active' => true, 'service_scope' => 'both']);

        $res = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shipping-lines?service_scope=ocean');

        $res->assertOk();
        $names = collect($res->json('data'))->pluck('name')->all();
        $this->assertContains('Ocean A', $names);
        $this->assertContains('Both A', $names);
        $this->assertNotContains('Inland A', $names);
    }

    public function test_inland_scope_returns_inland_and_both(): void
    {
        $user = User::factory()->create();

        ShippingLine::create(['name' => 'Ocean B', 'active' => true, 'service_scope' => 'ocean']);
        ShippingLine::create(['name' => 'Inland B', 'active' => true, 'service_scope' => 'inland']);
        ShippingLine::create(['name' => 'Both B', 'active' => true, 'service_scope' => 'both']);

        $res = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/shipping-lines?service_scope=inland');

        $res->assertOk();
        $names = collect($res->json('data'))->pluck('name')->all();
        $this->assertContains('Inland B', $names);
        $this->assertContains('Both B', $names);
        $this->assertNotContains('Ocean B', $names);
    }

    public function test_can_create_with_service_scope(): void
    {
        $user = User::factory()->create();

        $res = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/shipping-lines', [
                'name' => 'New Inland Trucking',
                'active' => true,
                'service_scope' => 'inland',
            ]);

        $res->assertCreated()
            ->assertJsonPath('data.service_scope', 'inland');

        $this->assertSame('inland', ShippingLine::where('name', 'New Inland Trucking')->value('service_scope'));
    }
}
