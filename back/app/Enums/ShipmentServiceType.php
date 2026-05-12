<?php

namespace App\Enums;

enum ShipmentServiceType: string
{
    case SeaFreight = 'sea_freight';
    case InlandTransport = 'inland_transport';
    case CustomsClearance = 'customs_clearance';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
