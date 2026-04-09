<?php

namespace Database\Seeders;

use App\Models\Vendor;
use Illuminate\Database\Seeder;

class VendorsSeeder extends Seeder
{
    public function run(): void
    {
        $vendors = [
            [
                'name' => 'Maersk Line',
                'type' => 'shipping_line',
                'email' => 'contact@maersk.com',
                'phone' => '+1234567890',
                'country' => 'Denmark',
            ],
            [
                'name' => 'MSC Mediterranean Shipping',
                'type' => 'shipping_line',
                'email' => 'info@msc.com',
                'phone' => '+0987654321',
                'country' => 'Switzerland',
            ],
            [
                'name' => 'Fast Trucking Co.',
                'type' => 'inland_transport',
                'email' => 'ops@fasttrucking.com',
                'phone' => '+201000000001',
                'country' => 'Egypt',
            ],
            [
                'name' => 'Expert Customs Brokers',
                'type' => 'customs_clearance',
                'email' => 'clearance@expert.com',
                'phone' => '+201000000002',
                'country' => 'Egypt',
            ],
            [
                'name' => 'Global Marine Insurance',
                'type' => 'insurance',
                'email' => 'claims@globalmarine.com',
                'phone' => '+201000000003',
                'country' => 'Egypt',
            ],
            [
                'name' => 'Far East Logistics (China)',
                'type' => 'overseas_agent',
                'email' => 'agent@fareast.com',
                'phone' => '+86123456789',
                'country' => 'China',
            ],
        ];

        foreach ($vendors as $vendor) {
            Vendor::updateOrCreate(
                ['name' => $vendor['name']],
                $vendor
            );
        }
    }
}
