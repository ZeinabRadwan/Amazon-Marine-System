<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingFreightUnitTypeApiTest extends TestCase
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
            'pricing.view_offers',
            'pricing.manage_offers',
        ]);

        return $user;
    }

    public function test_store_ocean_container_with_label_only_infers_meta(): void
    {
        $user = $this->actingAsPricingUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/freight-unit-types', [
                'dataset' => 'ocean_container',
                'label' => "40' HC Dry",
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.dataset', 'ocean_container')
            ->assertJsonPath('data.label', "40' HC Dry")
            ->assertJsonPath('data.meta.type', 'Dry')
            ->assertJsonPath('data.meta.size', '40')
            ->assertJsonPath('data.meta.height', 'HQ');

        $this->assertNotEmpty($response->json('data.slug'));
    }

    public function test_store_ocean_container_reefer_20_standard_from_label(): void
    {
        $user = $this->actingAsPricingUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/freight-unit-types', [
                'dataset' => 'ocean_container',
                'label' => '20ft Reefer standard',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.meta.type', 'Reefer')
            ->assertJsonPath('data.meta.size', '20')
            ->assertJsonPath('data.meta.height', 'Standard');
    }

    public function test_index_filters_by_dataset(): void
    {
        $user = $this->actingAsPricingUser();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/freight-unit-types', [
                'dataset' => 'ocean_container',
                'label' => 'Test Ocean Type',
            ])
            ->assertCreated();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/freight-unit-types', [
                'dataset' => 'inland_truck',
                'label' => 'Test Truck',
            ])
            ->assertCreated();

        $ocean = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/freight-unit-types?dataset=ocean_container');

        $ocean->assertOk();
        $items = $ocean->json('data');
        $this->assertNotEmpty($items);
        foreach ($items as $item) {
            $this->assertSame('ocean_container', $item['dataset']);
        }
    }
}
