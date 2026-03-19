<?php

namespace Database\Seeders;

use App\Models\TicketStatus;
use Illuminate\Database\Seeder;

class TicketStatusesSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            [
                'key' => 'open',
                'label_ar' => 'مفتوح',
                'label_en' => 'Open',
                'active' => true,
                'sort_order' => 1,
            ],
            [
                'key' => 'in_progress',
                'label_ar' => 'قيد المعالجة',
                'label_en' => 'In Progress',
                'active' => true,
                'sort_order' => 2,
            ],
            [
                'key' => 'waiting',
                'label_ar' => 'بانتظار',
                'label_en' => 'Waiting',
                'active' => true,
                'sort_order' => 3,
            ],
            [
                'key' => 'closed',
                'label_ar' => 'مغلق',
                'label_en' => 'Closed',
                'active' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($statuses as $status) {
            TicketStatus::updateOrCreate(
                ['key' => $status['key']],
                $status
            );
        }
    }
}
