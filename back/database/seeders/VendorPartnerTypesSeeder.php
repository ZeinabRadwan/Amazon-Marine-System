<?php

namespace Database\Seeders;

use App\Models\VendorPartnerType;
use Illuminate\Database\Seeder;

class VendorPartnerTypesSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'shipping_line', 'name_en' => 'Shipping line', 'name_ar' => 'خط ملاحي', 'sort_order' => 1],
            ['code' => 'inland_transport', 'name_en' => 'Inland transport', 'name_ar' => 'نقل داخلي', 'sort_order' => 2],
            ['code' => 'customs_clearance', 'name_en' => 'Customs clearance', 'name_ar' => 'تخليص جمركي', 'sort_order' => 3],
        ];

        foreach ($rows as $row) {
            VendorPartnerType::query()->updateOrCreate(
                ['code' => $row['code']],
                [
                    'name_en' => $row['name_en'],
                    'name_ar' => $row['name_ar'],
                    'sort_order' => $row['sort_order'],
                ]
            );
        }
    }
}
