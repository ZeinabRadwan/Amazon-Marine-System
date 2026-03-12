<?php

namespace Database\Seeders;

use App\Models\TicketPriority;
use App\Models\TicketType;
use Illuminate\Database\Seeder;

class TicketTypesAndPrioritiesSeeder extends Seeder
{
    /**
     * Seed ticket_types and ticket_priorities. IDs are stable: type 1=inquiry, 2=complaint, 3=request;
     * priority 1=low, 2=medium, 3=high (based on insert order).
     */
    public function run(): void
    {
        $types = [
            ['name' => 'inquiry', 'label_ar' => 'استفسار'],
            ['name' => 'complaint', 'label_ar' => 'شكوى'],
            ['name' => 'request', 'label_ar' => 'طلب'],
        ];

        foreach ($types as $data) {
            TicketType::firstOrCreate(
                ['name' => $data['name']],
                $data
            );
        }

        $priorities = [
            ['name' => 'low', 'label_ar' => 'منخفض', 'sort_order' => 1],
            ['name' => 'medium', 'label_ar' => 'متوسط', 'sort_order' => 2],
            ['name' => 'high', 'label_ar' => 'عالي', 'sort_order' => 3],
        ];

        foreach ($priorities as $data) {
            TicketPriority::firstOrCreate(
                ['name' => $data['name']],
                $data
            );
        }
    }
}
