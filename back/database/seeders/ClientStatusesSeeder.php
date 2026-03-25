<?php

namespace Database\Seeders;

use App\Models\ClientStatus;
use Illuminate\Database\Seeder;

/**
 * Client lifecycle statuses (bilingual name_ar / name_en).
 */
class ClientStatusesSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['name_en' => 'New', 'name_ar' => 'جديد', 'sort_order' => 1],
            ['name_en' => 'Active', 'name_ar' => 'نشط', 'sort_order' => 2],
            ['name_en' => 'Inactive', 'name_ar' => 'غير نشط', 'sort_order' => 3],
            ['name_en' => 'Pending', 'name_ar' => 'قيد الانتظار', 'sort_order' => 4],
            ['name_en' => 'Prospect', 'name_ar' => 'عميل محتمل', 'sort_order' => 5],
            ['name_en' => 'Lead', 'name_ar' => 'عميل متوقع', 'sort_order' => 6],
        ];

        foreach ($statuses as $row) {
            ClientStatus::updateOrCreate(
                ['name_en' => $row['name_en']],
                [
                    'name_ar' => $row['name_ar'],
                    'sort_order' => $row['sort_order'],
                ]
            );
        }
    }
}
