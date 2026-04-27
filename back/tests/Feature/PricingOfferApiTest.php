<?php

namespace Tests\Feature;

use App\Models\PricingOffer;
use App\Models\PricingOfferItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingOfferApiTest extends TestCase
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

    public function test_can_create_and_view_sea_pricing_offer(): void
    {
        $user = $this->actingAsPricingUser();

        $payload = [
            'pricing_type' => 'sea',
            'region' => 'البحر الأحمر',
            'pod' => 'جدة',
            'shipping_line' => 'MSC',
            'pol' => 'Sokhna',
            'dnd' => '7det',
            'transit_time' => '5 days',
            'valid_to' => '2026-12-31',
            'other_charges' => 'BL: 35$',
            'notes' => 'API test sea offer',
            'sailing_dates' => ['2026-03-14', '2026-03-21'],
            'pricing' => [
                'of20' => ['price' => 70, 'currency' => 'USD'],
                'of40' => ['price' => 103, 'currency' => 'USD'],
            ],
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.region', 'البحر الأحمر')
            ->assertJsonPath('data.pricing.of20.price', 70);

        $offerId = $response->json('data.id');
        $this->assertNotNull($offerId);

        $showResponse = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers/'.$offerId);

        $showResponse->assertOk()
            ->assertJsonPath('data.id', $offerId)
            ->assertJsonPath('data.pricing.of40.currency', 'USD');
    }

    public function test_pricing_list_supports_filters(): void
    {
        $user = $this->actingAsPricingUser();

        PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'region' => 'البحر الأحمر',
            'pod' => 'جدة',
            'shipping_line' => 'MSC',
            'status' => 'active',
        ]);
        $this->assertDatabaseCount('pricing_offers', 1);

        $query = http_build_query([
            'pricing_type' => 'sea',
            'region' => 'البحر الأحمر',
            'pod' => 'جدة',
        ], '', '&', PHP_QUERY_RFC3986);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers?'.$query);

        $response->assertOk()
            ->assertJsonPath('data.0.pod', 'جدة');
    }

    public function test_pricing_list_filters_by_pol_and_pricing_item_code(): void
    {
        $user = $this->actingAsPricingUser();

        $other = PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'pol' => 'Damietta',
            'pod' => 'Rotterdam',
        ]);
        PricingOfferItem::query()->create([
            'pricing_offer_id' => $other->id,
            'code' => 'of40',
            'price' => 90,
            'currency_code' => 'USD',
        ]);

        $match = PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'pol' => 'Sokhna',
            'pod' => 'جدة',
        ]);
        PricingOfferItem::query()->create([
            'pricing_offer_id' => $match->id,
            'code' => 'of20',
            'price' => 100,
            'currency_code' => 'USD',
        ]);

        $query = http_build_query([
            'pricing_type' => 'sea',
            'pol' => 'Sokhna',
            'pricing_item_code' => 'of20',
        ], '', '&', PHP_QUERY_RFC3986);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers?'.$query);

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($match->id, $ids);
        $this->assertNotContains($other->id, $ids);
    }
}
