<?php

namespace Database\Seeders;

use App\Models\ShipmentStatus;
use Illuminate\Database\Seeder;

class ShipmentOperationalStatusesSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            [
                'name_ar' => 'جاري تخصيص الحاويات',
                'name_en' => 'Container allocation in progress',
                'type' => 'operational',
                'color' => '#3B82F6',
                'sort_order' => 1,
            ],
            [
                'name_ar' => 'جاري التحميل',
                'name_en' => 'Loading in progress',
                'type' => 'operational',
                'color' => '#F59E0B',
                'sort_order' => 2,
            ],
            [
                'name_ar' => 'جاري التخليص الجمركي',
                'name_en' => 'Customs clearance in progress',
                'type' => 'operational',
                'color' => '#8B5CF6',
                'sort_order' => 3,
            ],
            [
                'name_ar' => 'بانتظار فواتير الشحن',
                'name_en' => 'Awaiting shipping invoices',
                'type' => 'operational',
                'color' => '#6366F1',
                'sort_order' => 4,
            ],
            [
                'name_ar' => 'جاري الفوترة',
                'name_en' => 'Billing in progress',
                'type' => 'operational',
                'color' => '#EC4899',
                'sort_order' => 5,
            ],
            [
                'name_ar' => 'بانتظار دفع العميل',
                'name_en' => 'Awaiting client payment',
                'type' => 'operational',
                'color' => '#EF4444',
                'sort_order' => 6,
            ],
            [
                'name_ar' => 'جاري الإفراج عن الشحنة',
                'name_en' => 'Releasing shipment',
                'type' => 'operational',
                'color' => '#10B981',
                'sort_order' => 7,
            ],
            [
                'name_ar' => 'مكتملة',
                'name_en' => 'Shipment complete',
                'type' => 'operational',
                'color' => '#059669',
                'sort_order' => 8,
            ],
        ];

        foreach ($statuses as $status) {
            ShipmentStatus::updateOrCreate(
                ['name_en' => $status['name_en'], 'type' => 'operational'],
                $status
            );
        }
    }
}
