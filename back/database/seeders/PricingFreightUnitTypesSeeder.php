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
                'label' => '20\' Dry (Standard)',
                'sort_order' => 10,
                'meta' => ['type' => 'Dry', 'size' => '20', 'height' => 'Standard'],
            ],
            [
                'slug' => '40-dry-std',
                'label' => '40\' Dry (Standard)',
                'sort_order' => 20,
                'meta' => ['type' => 'Dry', 'size' => '40', 'height' => 'Standard'],
            ],
            [
                'slug' => '40-dry-hq',
                'label' => '40\' Dry HQ',
                'sort_order' => 30,
                'meta' => ['type' => 'Dry', 'size' => '40', 'height' => 'HQ'],
            ],
            [
                'slug' => '40-reefer',
                'label' => '40\' Reefer',
                'sort_order' => 40,
                'meta' => ['type' => 'Reefer', 'size' => '40', 'height' => 'Standard'],
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
            ['slug' => 't20d', 'label' => '20 Dry', 'sort_order' => 10],
            ['slug' => 't40d', 'label' => '40 Dry', 'sort_order' => 20],
            ['slug' => 'p20x2', 'label' => 'Twin 20', 'sort_order' => 30],
            ['slug' => 't40r', 'label' => 'Reefer 40', 'sort_order' => 40],
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
