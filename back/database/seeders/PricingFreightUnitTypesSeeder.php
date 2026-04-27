<?php

namespace Database\Seeders;

use App\Models\PricingFreightUnitType;
use Illuminate\Database\Seeder;

class PricingFreightUnitTypesSeeder extends Seeder
{
    public function run(): void
    {
        $ocean = [
            [
                'slug' => '20-dry-std',
                'label' => '20′ Dry Container',
                'sort_order' => 10,
                'meta' => ['type' => 'Dry', 'size' => '20', 'height' => 'Standard'],
            ],
            [
                'slug' => '40-dry-std',
                'label' => '40′ Dry Container',
                'sort_order' => 20,
                'meta' => ['type' => 'Dry', 'size' => '40', 'height' => 'Standard'],
            ],
            [
                'slug' => '40-dry-hq',
                'label' => '40′ High Cube (40′ HC)',
                'sort_order' => 30,
                'meta' => ['type' => 'Dry', 'size' => '40', 'height' => 'HQ'],
            ],
            [
                'slug' => '20-reefer',
                'label' => '20′ Reefer Container',
                'sort_order' => 40,
                'meta' => ['type' => 'Reefer', 'size' => '20', 'height' => 'Standard'],
            ],
            [
                'slug' => '40-reefer',
                'label' => '40′ Reefer Container',
                'sort_order' => 50,
                'meta' => ['type' => 'Reefer', 'size' => '40', 'height' => 'Standard'],
            ],
            [
                'slug' => 'flat-rack',
                'label' => 'Flat Rack Container (FR)',
                'sort_order' => 60,
                'meta' => ['type' => 'Dry', 'size' => '40', 'height' => 'Standard'],
            ],
            [
                'slug' => 'open-top',
                'label' => 'Open Top Container (OT)',
                'sort_order' => 70,
                'meta' => ['type' => 'Dry', 'size' => '40', 'height' => 'Standard'],
            ],
        ];

        foreach ($ocean as $row) {
            PricingFreightUnitType::updateOrCreate(
                ['dataset' => 'ocean_container', 'slug' => $row['slug']],
                [
                    'label' => $row['label'],
                    'sort_order' => $row['sort_order'],
                    'active' => true,
                    'meta' => $row['meta'],
                ]
            );
        }

        $inland = [
            ['slug' => 't20d', 'label' => '20′ Truck (Dry Container)', 'sort_order' => 10],
            ['slug' => 't40d', 'label' => '40′ Truck (Dry Container)', 'sort_order' => 20],
            ['slug' => 'p20x2', 'label' => 'Twin 20′ (2 Containers Truck)', 'sort_order' => 30],
            ['slug' => 't40r', 'label' => '40′ Reefer Truck', 'sort_order' => 40],
        ];

        foreach ($inland as $row) {
            PricingFreightUnitType::updateOrCreate(
                ['dataset' => 'inland_truck', 'slug' => $row['slug']],
                [
                    'label' => $row['label'],
                    'sort_order' => $row['sort_order'],
                    'active' => true,
                    'meta' => null,
                ]
            );
        }
    }
}
