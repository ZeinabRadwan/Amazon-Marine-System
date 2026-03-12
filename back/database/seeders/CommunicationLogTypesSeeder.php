<?php

namespace Database\Seeders;

use App\Models\CommunicationLogType;
use Illuminate\Database\Seeder;

class CommunicationLogTypesSeeder extends Seeder
{
    /**
     * Seed communication_log_types. IDs are stable (by insert order):
     * 1=call (مكالمة), 2=whatsapp (واتساب), 3=email (بريد إلكتروني), 4=meeting (اجتماع), 5=note (ملاحظة).
     */
    public function run(): void
    {
        $types = [
            ['name' => 'call', 'label_ar' => 'مكالمة', 'sort_order' => 1],
            ['name' => 'whatsapp', 'label_ar' => 'واتساب', 'sort_order' => 2],
            ['name' => 'email', 'label_ar' => 'بريد إلكتروني', 'sort_order' => 3],
            ['name' => 'meeting', 'label_ar' => 'اجتماع', 'sort_order' => 4],
            ['name' => 'note', 'label_ar' => 'ملاحظة', 'sort_order' => 5],
        ];

        foreach ($types as $data) {
            CommunicationLogType::firstOrCreate(
                ['name' => $data['name']],
                $data
            );
        }
    }
}
