<?php

namespace Tests\Feature;

use Tests\TestCase;

class AttendanceClockApiTest extends TestCase
{
    public function test_clock_in_requires_authentication(): void
    {
        $this->postJson('/api/v1/attendance/clock-in', [
            'latitude' => 31.2001,
            'longitude' => 29.9187,
        ])->assertStatus(401);
    }

    public function test_clock_out_requires_authentication(): void
    {
        $this->postJson('/api/v1/attendance/clock-out', [
            'latitude' => 31.2001,
            'longitude' => 29.9187,
        ])->assertStatus(401);
    }
}
