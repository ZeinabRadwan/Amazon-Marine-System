<?php

namespace Database\Seeders;

use App\Models\ClientStatus;
use Illuminate\Database\Seeder;

/**
 * Lead pipeline vs post-contract client statuses (bilingual name_ar / name_en).
 */
class ClientStatusesSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['name_en' => 'Prospect', 'name_ar' => 'عميل محتمل', 'sort_order' => 1, 'applies_to' => 'lead'],
            ['name_en' => 'Contacted', 'name_ar' => 'تم التواصل', 'sort_order' => 2, 'applies_to' => 'lead'],
            ['name_en' => 'Interested', 'name_ar' => 'مهتم', 'sort_order' => 3, 'applies_to' => 'lead'],
            ['name_en' => 'Quotation', 'name_ar' => 'عرض سعر', 'sort_order' => 4, 'applies_to' => 'lead'],
            ['name_en' => 'Negotiation', 'name_ar' => 'تفاوض', 'sort_order' => 5, 'applies_to' => 'lead'],
            ['name_en' => 'Expected', 'name_ar' => 'عميل متوقع', 'sort_order' => 6, 'applies_to' => 'lead'],
            ['name_en' => 'Lost lead', 'name_ar' => 'مفقود', 'sort_order' => 7, 'applies_to' => 'lead'],
            ['name_en' => 'New', 'name_ar' => 'جديد', 'sort_order' => 1, 'applies_to' => 'client'],
            ['name_en' => 'Active', 'name_ar' => 'نشط', 'sort_order' => 2, 'applies_to' => 'client'],
            ['name_en' => 'Recurring', 'name_ar' => 'متكرر', 'sort_order' => 3, 'applies_to' => 'client'],
            ['name_en' => 'In progress', 'name_ar' => 'قيد التنفيذ', 'sort_order' => 4, 'applies_to' => 'client'],
            ['name_en' => 'On hold', 'name_ar' => 'متوقف', 'sort_order' => 5, 'applies_to' => 'client'],
            ['name_en' => 'Inactive', 'name_ar' => 'غير نشط', 'sort_order' => 6, 'applies_to' => 'client'],
            ['name_en' => 'Lost client', 'name_ar' => 'مفقود', 'sort_order' => 7, 'applies_to' => 'client'],
        ];

        foreach ($statuses as $row) {
            ClientStatus::updateOrCreate(
                ['name_en' => $row['name_en']],
                [
                    'name_ar' => $row['name_ar'],
                    'sort_order' => $row['sort_order'],
                    'applies_to' => $row['applies_to'],
                ]
            );
        }
    }
}
