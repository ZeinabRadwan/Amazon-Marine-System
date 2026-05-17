<?php

namespace Tests\Feature;

use App\Models\PricingOffer;
use App\Models\PricingOfferItem;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
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
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.display_status', 'active')
            ->assertJsonPath('data.is_quotable', true)
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

    public function test_sea_regions_endpoint_returns_distinct_values(): void
    {
        $user = $this->actingAsPricingUser();

        PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'region' => 'البحر الأحمر',
            'pod' => 'جدة',
        ]);
        PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'region' => 'الخليج',
            'pod' => 'دبي',
        ]);
        PricingOffer::factory()->create([
            'pricing_type' => 'inland',
            'region' => 'القاهرة الكبرى',
            'pod' => 'x',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers/sea-regions');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertContains('البحر الأحمر', $data);
        $this->assertContains('الخليج', $data);
        $this->assertNotContains('القاهرة الكبرى', $data);

        $filtered = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers/sea-regions?q='.rawurlencode('الخل'));
        $filtered->assertOk();
        $this->assertContains('الخليج', $filtered->json('data'));
    }

    public function test_pricing_user_can_archive_and_delete_offer(): void
    {
        $user = $this->actingAsPricingUser();
        $offer = PricingOffer::factory()->create(['status' => 'active']);
        PricingOfferItem::query()->create([
            'pricing_offer_id' => $offer->id,
            'code' => 'of20',
            'price' => 100,
            'currency_code' => 'USD',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers/'.$offer->id.'/archive')
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/pricing/offers/'.$offer->id)
            ->assertOk();

        $this->assertDatabaseMissing('pricing_offers', ['id' => $offer->id]);
        $this->assertDatabaseMissing('pricing_offer_items', ['pricing_offer_id' => $offer->id]);
    }

    public function test_pricing_offer_must_be_archived_before_delete(): void
    {
        $user = $this->actingAsPricingUser();
        $offer = PricingOffer::factory()->create(['status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/pricing/offers/'.$offer->id)
            ->assertStatus(409);

        $this->assertDatabaseHas('pricing_offers', [
            'id' => $offer->id,
            'status' => 'active',
        ]);
    }

    public function test_pricing_user_can_unarchive_offer(): void
    {
        $user = $this->actingAsPricingUser();
        $offer = PricingOffer::factory()->create(['status' => 'archived']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers/'.$offer->id.'/activate')
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('pricing_offers', [
            'id' => $offer->id,
            'status' => 'active',
        ]);
    }

    public function test_can_create_draft_offer_and_publish(): void
    {
        $user = $this->actingAsPricingUser();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers', [
                'pricing_type' => 'sea',
                'region' => 'Europe',
                'pod' => 'Rotterdam',
                'shipping_line' => 'MSC',
                'pol' => 'Sokhna',
                'status' => 'draft',
                'pricing' => ['of20' => ['price' => 100, 'currency' => 'USD']],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.display_status', 'draft')
            ->assertJsonPath('data.is_quotable', false);

        $offerId = $response->json('data.id');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers/'.$offerId.'/activate')
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.is_quotable', true);
    }

    public function test_quotable_filter_excludes_draft_and_expired(): void
    {
        $user = $this->actingAsPricingUser();

        $active = PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'status' => 'active',
            'valid_to' => now()->addMonth()->toDateString(),
        ]);
        $draft = PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'status' => 'draft',
        ]);
        $expired = PricingOffer::factory()->create([
            'pricing_type' => 'sea',
            'status' => 'active',
            'valid_to' => now()->subDay()->toDateString(),
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers?quotable=1&pricing_type=sea');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($active->id, $ids);
        $this->assertNotContains($draft->id, $ids);
        $this->assertNotContains($expired->id, $ids);
    }

    public function test_sales_user_does_not_see_draft_offers_in_list(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole(Role::query()->where('name', 'sales_manager')->firstOrFail());

        $draft = PricingOffer::factory()->create(['status' => 'draft', 'pricing_type' => 'sea']);
        $active = PricingOffer::factory()->create(['status' => 'active', 'pricing_type' => 'sea']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers?pricing_type=sea');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($active->id, $ids);
        $this->assertNotContains($draft->id, $ids);
    }

    public function test_sales_manager_can_only_view_pricing_offers(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole(Role::query()->where('name', 'sales_manager')->firstOrFail());
        $offer = PricingOffer::factory()->create(['status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/pricing/offers/'.$offer->id)
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers', [
                'pricing_type' => 'sea',
                'region' => 'Europe',
                'pod' => 'Rotterdam',
                'shipping_line' => 'MSC',
                'pol' => 'Sokhna',
                'pricing' => ['of20' => ['price' => 100, 'currency' => 'USD']],
            ])
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/pricing/offers/'.$offer->id, ['notes' => 'blocked'])
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/offers/'.$offer->id.'/archive')
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/pricing/offers/'.$offer->id)
            ->assertForbidden();
    }
}
