<?php

namespace Database\Factories;

use App\Models\PricingOffer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PricingOffer>
 */
class PricingOfferFactory extends Factory
{
    protected $model = PricingOffer::class;

    public function definition(): array
    {
        return [
            'pricing_type' => 'sea',
            'region' => $this->faker->randomElement(['البحر الأحمر', 'الخليج', 'أوروبا']),
            'pod' => $this->faker->randomElement(['جدة', 'دبي', 'هامبورغ']),
            'shipping_line' => $this->faker->randomElement(['MSC', 'Maersk', 'CMA CGM']),
            'pol' => $this->faker->randomElement(['Alex', 'Sokhna', 'Damietta']),
            'valid_to' => now()->addDays(30)->toDateString(),
            'status' => 'draft',
        ];
    }
}

