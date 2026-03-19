<?php

namespace Database\Seeders;

use App\Models\ShipmentStatus;
use Illuminate\Database\Seeder;

class ShipmentStatusesSeeder extends Seeder
{
    public function run(): void
    {
        // Seeded based on UI/customer-service.html tracking status keys + Arabic/English labels.
        // These are used by GET /shipment-statuses for dropdowns/settings and by manual testing.
        $statuses = [
            [
                'name_ar' => 'تم تأكيد الحجز',
                'name_en' => 'Booking Confirmed',
                'color' => '#3B82F6',
                'description' => null,
                'active' => true,
                'sort_order' => 1,
            ],
            [
                'name_ar' => 'تخصيص الحاوية',
                'name_en' => 'Container Allocation',
                'color' => '#F59E0B',
                'description' => null,
                'active' => true,
                'sort_order' => 2,
            ],
            [
                'name_ar' => 'التحميل قيد التنفيذ',
                'name_en' => 'Loading in Progress',
                'color' => '#F59E0B',
                'description' => null,
                'active' => true,
                'sort_order' => 3,
            ],
            [
                'name_ar' => 'السفينة غادرت',
                'name_en' => 'Vessel Departed',
                'color' => '#F59E0B',
                'description' => null,
                'active' => true,
                'sort_order' => 4,
            ],
            [
                'name_ar' => 'في الطريق',
                'name_en' => 'In Transit',
                'color' => '#F59E0B',
                'description' => null,
                'active' => true,
                'sort_order' => 5,
            ],
            [
                'name_ar' => 'التخليص الجمركي',
                'name_en' => 'Customs Clearance',
                'color' => '#8B5CF6',
                'description' => null,
                'active' => true,
                'sort_order' => 6,
            ],
            [
                'name_ar' => 'جاهز للتسليم',
                'name_en' => 'Ready for Delivery',
                'color' => '#F59E0B',
                'description' => null,
                'active' => true,
                'sort_order' => 7,
            ],
            [
                'name_ar' => 'تم التسليم',
                'name_en' => 'Delivered',
                'color' => '#10B981',
                'description' => null,
                'active' => true,
                'sort_order' => 8,
            ],
        ];

        foreach ($statuses as $status) {
            // Use name_en as a stable key for idempotency.
            ShipmentStatus::updateOrCreate(
                ['name_en' => $status['name_en']],
                $status
            );
        }
    }
}
