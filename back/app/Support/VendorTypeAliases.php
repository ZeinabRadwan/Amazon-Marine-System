<?php

namespace App\Support;

/**
 * Maps vendor `type` strings (DB / legacy data) to canonical operational categories.
 */
final class VendorTypeAliases
{
    /**
     * @return list<string>
     */
    public static function aliasesForCanonical(string $canonical): array
    {
        $key = self::normalize((string) $canonical);
        $map = [
            'inland_transport' => [
                'inland_transport',
                'inland',
                'transport',
                'contractor',
                'trucker',
                'domestic_transport',
                'domestic',
                'haulage',
                'trucking',
            ],
            'customs_clearance' => [
                'customs_clearance',
                'customs',
                'broker',
                'customs_broker',
                'customsbroker',
                'clearance',
                'custom_broker',
            ],
            'insurance' => [
                'insurance',
                'insurer',
            ],
            'overseas_agent' => [
                'overseas_agent',
                'overseas',
                'agent',
                'freight_forwarder',
                'forwarder',
                'nvocc',
            ],
            'shipping_line' => [
                'shipping_line',
                'shipping',
                'line',
                'shippingline',
            ],
        ];

        return array_values(array_unique($map[$key] ?? [$key]));
    }

    public static function normalize(?string $type): string
    {
        $t = strtolower(str_replace([' ', '-'], '_', trim((string) ($type ?? ''))));

        return $t;
    }

    public static function vendorMatchesCanonical(?string $vendorType, string $canonical): bool
    {
        $norm = self::normalize($vendorType);
        if ($norm === '') {
            return false;
        }

        foreach (self::aliasesForCanonical($canonical) as $alias) {
            if ($norm === self::normalize($alias)) {
                return true;
            }
        }

        return false;
    }
}
