<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\PricingOffer;
use App\Models\PricingQuote;
use App\Models\User;
use Illuminate\Database\Seeder;

class PricingSeeder extends Seeder
{
    public function run(): void
    {
        $pricingUser = User::query()->first();
        $client = Client::query()->first();

        $seaOffer = PricingOffer::create([
            'pricing_type' => 'sea',
            'region' => 'البحر الأحمر',
            'pod' => 'جدة',
            'shipping_line' => 'MSC',
            'pol' => 'Sokhna',
            'dnd' => '7 days',
            'transit_time' => '5 days',
            'valid_to' => now()->addDays(30)->toDateString(),
            'status' => 'active',
            'other_charges' => 'BL: 35$',
            'notes' => 'Seeded sea offer',
        ]);

        $seaOffer->sailingDates()->createMany([
            ['sailing_date' => now()->addDays(7)->toDateString()],
            ['sailing_date' => now()->addDays(14)->toDateString()],
        ]);

        $seaOffer->items()->createMany([
            ['code' => 'of20', 'price' => 1200, 'currency_code' => 'USD'],
            ['code' => 'of40', 'price' => 2100, 'currency_code' => 'USD'],
            ['code' => 'thc20', 'price' => 150, 'currency_code' => 'USD'],
            ['code' => 'thc40', 'price' => 220, 'currency_code' => 'USD'],
            ['code' => 'of40rf', 'price' => 3200, 'currency_code' => 'USD'],
            ['code' => 'thcRf', 'price' => 300, 'currency_code' => 'USD'],
            ['code' => 'powerDay', 'price' => 45, 'currency_code' => 'USD'],
            ['code' => 'pti', 'price' => 80, 'currency_code' => 'USD'],
        ]);

        $inlandOffer = PricingOffer::create([
            'pricing_type' => 'inland',
            'region' => 'القاهرة الكبرى',
            'inland_port' => 'Alex',
            'destination' => 'القاهرة',
            'inland_gov' => 'القاهرة الكبرى',
            'inland_city' => 'القاهرة',
            'valid_to' => now()->addDays(20)->toDateString(),
            'status' => 'active',
            'notes' => 'Seeded inland offer',
        ]);

        $inlandOffer->items()->createMany([
            ['code' => 't20d', 'price' => 9500, 'currency_code' => 'EGP'],
            ['code' => 't40d', 'price' => 14500, 'currency_code' => 'EGP'],
            ['code' => 't40hq', 'price' => 15500, 'currency_code' => 'EGP'],
            ['code' => 't20r', 'price' => 12500, 'currency_code' => 'EGP'],
            ['code' => 't40r', 'price' => 17500, 'currency_code' => 'EGP'],
            ['code' => 'generator', 'price' => 2500, 'currency_code' => 'EGP'],
        ]);

        if ($client) {
            $quote = PricingQuote::create([
                'quote_no' => 'Q-'.now()->format('Y').'-SEED1',
                'client_id' => $client->id,
                'sales_user_id' => $pricingUser?->id,
                'pricing_offer_id' => $seaOffer->id,
                'pol' => 'Sokhna',
                'pod' => 'Jeddah',
                'shipping_line' => 'MSC',
                'container_type' => '40HQ Dry',
                'qty' => 1,
                'transit_time' => '5 days',
                'free_time' => '7 days',
                'valid_from' => now()->toDateString(),
                'valid_to' => now()->addDays(10)->toDateString(),
                'notes' => 'Seeded quote',
                'status' => 'pending',
            ]);

            $quote->sailingDates()->createMany([
                ['sailing_date' => now()->addDays(7)->toDateString()],
            ]);

            $quote->items()->createMany([
                [
                    'code' => 'ocean',
                    'name' => 'Ocean Freight',
                    'description' => 'Based on offer',
                    'amount' => 2100,
                    'currency_code' => 'USD',
                    'sort_order' => 0,
                ],
                [
                    'code' => 'thc',
                    'name' => 'THC',
                    'description' => '',
                    'amount' => 220,
                    'currency_code' => 'USD',
                    'sort_order' => 1,
                ],
            ]);
        }
    }
}

