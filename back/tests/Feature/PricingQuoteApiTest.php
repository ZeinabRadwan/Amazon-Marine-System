<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\PricingOffer;
use App\Models\PricingQuote;
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

        $offer = PricingOffer::factory()->create([
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
        ]);

        $payload = [
            'client_id' => $client->id,
            'pricing_offer_id' => $offer->id,
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
                ['code' => 'OF', 'name' => 'Ocean Freight', 'description' => 'Base', 'amount' => 1000, 'currency' => 'USD'],
                ['code' => 'THC', 'name' => 'THC', 'description' => '', 'amount' => 250, 'currency' => 'USD'],
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
            ->assertJsonPath('data.sailing_dates.0', '2026-03-14')
            ->assertJsonPath('data.show_carrier_on_pdf', true);
    }

    public function test_handling_fee_line_item_accepts_handling_code(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $offer = PricingOffer::factory()->create([
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
        ]);

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/pricing/quotes', [
            'client_id' => $client->id,
            'pricing_offer_id' => $offer->id,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'container_type' => '40HQ Dry',
            'qty' => 1,
            'items' => [
                ['code' => 'OF', 'name' => 'Ocean Freight', 'amount' => 500, 'currency' => 'USD'],
                ['code' => 'HANDLING', 'name' => 'Handling fees', 'amount' => 75, 'currency' => 'USD'],
            ],
        ]);

        $create->assertCreated();
        $create->assertJsonPath('data.items.1.code', 'HANDLING');
        $create->assertJsonPath('data.items.1.amount', 75);

        $id = $create->json('data.id');
        $pdf = $this->actingAs($user, 'sanctum')->get('/api/v1/pricing/quotes/'.$id.'/pdf');
        $pdf->assertOk()->assertHeader('content-type', 'application/pdf');
    }

    public function test_official_receipts_note_is_stored_separately_from_line_items(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $offer = PricingOffer::factory()->create([
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
        ]);

        $note = 'Government stamps per local tariff (informational only).';

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/pricing/quotes', [
            'client_id' => $client->id,
            'pricing_offer_id' => $offer->id,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'container_type' => '40HQ Dry',
            'qty' => 1,
            'official_receipts_note' => $note,
            'items' => [
                ['code' => 'OF', 'name' => 'Ocean Freight', 'amount' => 900, 'currency' => 'USD'],
                ['code' => 'OTHER', 'name' => 'Customs Certificate Fee', 'amount' => 50, 'currency' => 'USD'],
            ],
        ]);

        $create->assertCreated()
            ->assertJsonPath('data.official_receipts_note', $note);

        $id = (int) $create->json('data.id');
        $this->assertSame($note, PricingQuote::query()->find($id)?->official_receipts_note);

        $names = collect($create->json('data.items'))->pluck('name')->all();
        $this->assertNotContains('Official Receipts', $names);
    }

    public function test_can_set_show_carrier_on_pdf_when_creating_quote(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $offer = PricingOffer::factory()->create([
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
        ]);

        $payload = [
            'client_id' => $client->id,
            'pricing_offer_id' => $offer->id,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'show_carrier_on_pdf' => false,
            'container_type' => '40HQ Dry',
            'qty' => 1,
            'items' => [
                ['code' => 'OF', 'name' => 'Ocean Freight', 'amount' => 1000, 'currency' => 'USD'],
            ],
        ];

        $create = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/quotes', $payload);

        $create->assertCreated()
            ->assertJsonPath('data.show_carrier_on_pdf', false);

        $id = $create->json('data.id');

        $pdf = $this->actingAs($user, 'sanctum')
            ->get('/api/v1/pricing/quotes/'.$id.'/pdf');

        $pdf->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', $pdf->getContent() ?: '');
    }

    public function test_quote_pdf_endpoint_returns_pdf(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $offer = PricingOffer::factory()->create([
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
        ]);

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/pricing/quotes', [
            'client_id' => $client->id,
            'pricing_offer_id' => $offer->id,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'container_type' => '40HQ Dry',
            'qty' => 1,
            'items' => [
                ['code' => 'OF', 'name' => 'Ocean Freight', 'amount' => 500, 'currency' => 'USD'],
            ],
        ]);

        $create->assertCreated();
        $id = $create->json('data.id');

        $pdf = $this->actingAs($user, 'sanctum')
            ->get('/api/v1/pricing/quotes/'.$id.'/pdf');

        $pdf->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', $pdf->getContent() ?: '');
    }

    public function test_can_accept_and_reject_quote(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/pricing/quotes', [
            'client_id' => $client->id,
            'quick_mode' => true,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'container_type' => '40HQ Dry',
            'items' => [
                ['code' => 'OF', 'name' => 'Ocean Freight', 'amount' => 1000, 'currency' => 'USD'],
            ],
        ]);

        $create->assertCreated();
        $create->assertJsonPath('data.quick_mode', true);
        $create->assertJsonPath('data.is_quick_quotation', true);
        $id = $create->json('data.id');

        $accepted = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/quotes/'.$id.'/accept');
        $accepted->assertOk()->assertJsonPath('data.status', 'accepted');

        $rejected = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/pricing/quotes/'.$id.'/reject');
        $rejected->assertOk()->assertJsonPath('data.status', 'rejected');
    }

    public function test_is_quick_quotation_alias_maps_to_quick_mode(): void
    {
        $user = $this->actingAsPricingUser();

        $client = Client::factory()->create();

        $create = $this->actingAs($user, 'sanctum')->postJson('/api/v1/pricing/quotes', [
            'client_id' => $client->id,
            'is_quick_quotation' => true,
            'pol' => 'Sokhna',
            'pod' => 'Jeddah',
            'shipping_line' => 'MSC',
            'container_type' => '40HQ Dry',
            'items' => [
                ['code' => 'OF', 'name' => 'Ocean Freight', 'amount' => 800, 'currency' => 'USD'],
            ],
        ]);

        $create->assertCreated();
        $create->assertJsonPath('data.quick_mode', true);
        $create->assertJsonPath('data.is_quick_quotation', true);
    }
}
