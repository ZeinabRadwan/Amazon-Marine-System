<?php

namespace App\Services;

class GeoDistance
{
    /**
     * Haversine distance in meters between two WGS84 points.
     */
    public static function metersBetween(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $phi1 = deg2rad($lat1);
        $phi2 = deg2rad($lat2);
        $deltaPhi = deg2rad($lat2 - $lat1);
        $deltaLambda = deg2rad($lng2 - $lng1);

        $a = sin($deltaPhi / 2) ** 2
            + cos($phi1) * cos($phi2) * sin($deltaLambda / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * @return array{ok: bool, lat: float|null, lng: float|null}
     */
    public static function parseCoordinates(mixed $lat, mixed $lng): array
    {
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return ['ok' => false, 'lat' => null, 'lng' => null];
        }

        $latF = (float) $lat;
        $lngF = (float) $lng;

        if (! is_finite($latF) || ! is_finite($lngF)) {
            return ['ok' => false, 'lat' => null, 'lng' => null];
        }

        if ($latF < -90.0 || $latF > 90.0 || $lngF < -180.0 || $lngF > 180.0) {
            return ['ok' => false, 'lat' => null, 'lng' => null];
        }

        return ['ok' => true, 'lat' => $latF, 'lng' => $lngF];
    }
}
