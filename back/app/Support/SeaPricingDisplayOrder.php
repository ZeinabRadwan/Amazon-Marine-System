<?php

namespace App\Support;

/**
 * Canonical Ocean Side Pricing display order for sea freight offers.
 */
class SeaPricingDisplayOrder
{
    /** @var list<string> */
    private const ORDER = [
        'of20',
        'of20rf',
        'of40',
        'of40rf',
        'thc20',
        'thc20rf',
        'thc40',
        'thcrf',
        'blfee',
        'bl',
        'bl_fee',
        'telex',
        'pti',
        'powerday',
        'power_day',
    ];

    public static function sortIndex(string $code): int
    {
        $c = strtolower(trim($code));
        $idx = array_search($c, self::ORDER, true);
        if ($idx !== false) {
            return $idx;
        }
        if (preg_match('/^othercharge(\d+)$/i', $c, $m)) {
            return count(self::ORDER) + (int) $m[1];
        }

        return count(self::ORDER) + 999;
    }

    public static function compare(string $a, string $b): int
    {
        return self::sortIndex($a) <=> self::sortIndex($b);
    }
}
