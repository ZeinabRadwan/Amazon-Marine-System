<?php

namespace Database\Seeders;

use App\Models\Port;
use Illuminate\Database\Seeder;

/**
 * POL/POD reference data — UI/sd-forms.html (Alexandria, Port Said East, Jeddah, Dubai)
 * plus ports named in SDFormsSeeder sample rows (Damietta, Sokhna, Hamburg, Genoa).
 */
class PortsSeeder extends Seeder
{
    public function run(): void
    {
        $ports = [
            ['name' => 'Alexandria', 'code' => 'EGALY', 'country' => 'Egypt', 'active' => true],
            ['name' => 'Port Said East', 'code' => 'EGPSE', 'country' => 'Egypt', 'active' => true],
            ['name' => 'Damietta', 'code' => 'EGDAM', 'country' => 'Egypt', 'active' => true],
            ['name' => 'Sokhna', 'code' => 'EGSOK', 'country' => 'Egypt', 'active' => true],
            ['name' => 'Jeddah', 'code' => 'SAJED', 'country' => 'Saudi Arabia', 'active' => true],
            ['name' => 'Dubai', 'code' => 'AEDXB', 'country' => 'United Arab Emirates', 'active' => true],
            ['name' => 'Hamburg', 'code' => 'DEHAM', 'country' => 'Germany', 'active' => true],
            ['name' => 'Genoa', 'code' => 'ITGOA', 'country' => 'Italy', 'active' => true],
        ];

        foreach ($ports as $row) {
            Port::updateOrCreate(
                ['name' => $row['name']],
                [
                    'code' => $row['code'],
                    'country' => $row['country'],
                    'active' => $row['active'],
                ]
            );
        }
    }
}
