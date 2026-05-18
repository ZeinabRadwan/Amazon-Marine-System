<?php

namespace App\Support;

/**
 * Task titles inserted by {@see Database\Seeders\BackfillShipmentTasksSeeder} (English keys via __()).
 * Used only to clean up one-time backfill rows — new shipments must start with zero tasks.
 */
final class LegacyDefaultShipmentOperationTaskNames
{
    /**
     * @return list<string>
     */
    public static function all(): array
    {
        $english = [
            'Review Client Documents',
            'Review Packing List & Invoice',
            'Review Sticker',
            'Open Customs Certificate',
            'Allocate Shipping Order (D.O.)',
            'Container Withdrawal/Pulling',
            'Submit SI & VGM',
            'Review Draft B/L',
            'Prepare Certificate of Origin / Agricultural (if applicable)',
            'Stamp Customs Documents',
        ];

        $localized = array_map(fn (string $key) => __($key), $english);

        return array_values(array_unique(array_merge($english, $localized)));
    }
}
