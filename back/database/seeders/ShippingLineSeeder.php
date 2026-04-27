<?php

namespace Database\Seeders;

use App\Models\ShippingLine;
use Illuminate\Database\Seeder;

class ShippingLineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $lines = [
            'Cosco',
            'B&G',
            'Hapag lloyd',
            'CMA',
            'SIDRA',
            'Maersk',
            'MSC',
            'ARKAS',
            'OCEAN EXPRESS',
            'ZIM',
            'ONE',
            'ESL',
            'EGL',
            'ADMIRAL',
            'ESG',
            'YANG MING',
            'MLH',
            'TARROS',
            'MEDKON',
            'OOCL',
            'TSA',
            'SEAGLORY EGYPT',
            'LAT',
        ];

        foreach ($lines as $name) {
            ShippingLine::updateOrCreate(
                ['name' => $name],
                ['active' => true, 'service_scope' => 'ocean']
            );
        }
    }
}
