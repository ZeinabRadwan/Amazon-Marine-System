<?php

namespace App\Services;

class DeviceTypeResolver
{
    public function resolve(?string $userAgent): string
    {
        if ($userAgent === null || $userAgent === '') {
            return 'unknown';
        }

        $ua = strtolower($userAgent);

        if (str_contains($ua, 'android')) {
            return 'android';
        }

        if (str_contains($ua, 'iphone') || str_contains($ua, 'ipad') || str_contains($ua, 'ios')) {
            return 'ios';
        }

        if (str_contains($ua, 'windows')) {
            return 'windows';
        }

        if (str_contains($ua, 'mac os') || str_contains($ua, 'macintosh')) {
            return 'mac';
        }

        if (str_contains($ua, 'linux')) {
            return 'linux';
        }

        return 'unknown';
    }
}
