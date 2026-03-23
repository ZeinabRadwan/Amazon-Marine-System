<?php

namespace Tests\Unit;

use App\Services\GeoDistance;
use PHPUnit\Framework\TestCase;

class GeoDistanceTest extends TestCase
{
    public function test_haversine_alexandria_to_cairo_approximate(): void
    {
        $alexLat = 31.2001;
        $alexLng = 29.9187;
        $cairoLat = 30.0444;
        $cairoLng = 31.2357;
        $m = GeoDistance::metersBetween($alexLat, $alexLng, $cairoLat, $cairoLng);
        $this->assertGreaterThan(150_000, $m);
        $this->assertLessThan(250_000, $m);
    }

    public function test_parse_coordinates_rejects_invalid(): void
    {
        $this->assertFalse(GeoDistance::parseCoordinates('x', 10)['ok']);
        $this->assertFalse(GeoDistance::parseCoordinates(10, 200)['ok']);
        $this->assertTrue(GeoDistance::parseCoordinates(10.5, 20.25)['ok']);
    }
}
