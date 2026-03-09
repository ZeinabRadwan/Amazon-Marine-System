<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\SDForm;
use App\Models\User;
use Illuminate\Database\Seeder;

class SDFormsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $salesUser = User::whereHas('roles', function ($q) {
            $q->where('name', 'sales');
        })->first() ?? User::first();

        $clients = Client::orderBy('id')->take(3)->get();

        if ($clients->isEmpty() || ! $salesUser) {
            return;
        }

        $client1 = $clients[0];
        $client2 = $clients[1] ?? $client1;
        $client3 = $clients[2] ?? $client1;

        $forms = [
            [
                'client_id' => $client1->id,
                'sales_rep_id' => $salesUser->id,
                'status' => 'completed',
                'pol_text' => 'Alexandria',
                'pod_text' => 'Jeddah',
                'final_destination' => 'Jeddah, Saudi Arabia',
                'shipment_direction' => 'Export',
                'shipper_info' => 'Mansour & Co., Industrial Zone, Cairo',
                'consignee_info' => 'Al Saud Trading, Jeddah',
                'freight_term' => 'Prepaid',
                'container_type' => 'Dry',
                'container_size' => '40',
                'num_containers' => 2,
                'requested_vessel_date' => $now->copy()->subDays(20),
                'cargo_description' => 'Cotton textiles',
                'hs_code' => '5208.11',
                'total_gross_weight' => 48000,
                'total_net_weight' => 47000,
                'created_at' => $now->copy()->subDays(22),
                'updated_at' => $now->copy()->subDays(5),
            ],
            [
                'client_id' => $client2->id,
                'sales_rep_id' => $salesUser->id,
                'status' => 'submitted',
                'pol_text' => 'Damietta',
                'pod_text' => 'Dubai',
                'final_destination' => 'Dubai, UAE',
                'shipment_direction' => 'Export',
                'shipper_info' => 'Al Afaq Foods, Damietta',
                'consignee_info' => 'Dubai Foods Import LLC',
                'freight_term' => 'Collect',
                'container_type' => 'Reefer',
                'container_size' => '40',
                'num_containers' => 1,
                'requested_vessel_date' => $now->copy()->subDays(10),
                'cargo_description' => 'Frozen food',
                'hs_code' => '1604.20',
                'total_gross_weight' => 24000,
                'total_net_weight' => 23000,
                'created_at' => $now->copy()->subDays(12),
                'updated_at' => $now->copy()->subDays(7),
            ],
            [
                'client_id' => $client3->id,
                'sales_rep_id' => $salesUser->id,
                'status' => 'draft',
                'pol_text' => 'Sokhna',
                'pod_text' => 'Hamburg',
                'final_destination' => 'Hamburg, Germany',
                'shipment_direction' => 'Export',
                'shipper_info' => 'Elite Textiles, Cairo',
                'consignee_info' => 'Hamburg Fabrics GmbH',
                'freight_term' => 'Prepaid',
                'container_type' => 'Dry',
                'container_size' => '20',
                'num_containers' => 1,
                'requested_vessel_date' => $now->copy()->addDays(14),
                'cargo_description' => 'Synthetic fabrics',
                'hs_code' => '5407.61',
                'total_gross_weight' => 12000,
                'total_net_weight' => 11500,
                'created_at' => $now->copy()->subDays(3),
                'updated_at' => $now->copy()->subDays(1),
            ],
            [
                'client_id' => $client1->id,
                'sales_rep_id' => $salesUser->id,
                'status' => 'sent_to_operations',
                'pol_text' => 'Alexandria',
                'pod_text' => 'Genoa',
                'final_destination' => 'Genoa, Italy',
                'shipment_direction' => 'Export',
                'shipper_info' => 'Mansour & Co.',
                'consignee_info' => 'Italian Marble Importers',
                'freight_term' => 'Prepaid',
                'container_type' => 'Flat Rack',
                'container_size' => '40',
                'num_containers' => 1,
                'requested_vessel_date' => $now->copy()->addDays(7),
                'cargo_description' => 'Marble blocks',
                'hs_code' => '6802.10',
                'total_gross_weight' => 28000,
                'total_net_weight' => 27000,
                'created_at' => $now->copy()->subMonth()->addDays(2),
                'updated_at' => $now->copy()->subDays(2),
            ],
        ];

        foreach ($forms as $data) {
            $timestamps = [
                'created_at' => $data['created_at'],
                'updated_at' => $data['updated_at'],
            ];

            unset($data['created_at'], $data['updated_at']);

            SDForm::updateOrCreate(
                [
                    'client_id' => $data['client_id'],
                    'shipment_direction' => $data['shipment_direction'],
                    'cargo_description' => $data['cargo_description'],
                ],
                array_merge($data, $timestamps),
            );
        }
    }
}

