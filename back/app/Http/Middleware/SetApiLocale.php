<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetApiLocale
{
    /** @var list<string> */
    private const SUPPORTED = ['en', 'ar'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);
        if ($locale !== null) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    private function resolveLocale(Request $request): ?string
    {
        $header = $request->header('X-App-Locale');
        if (is_string($header) && $header !== '') {
            $normalized = strtolower(substr(trim($header), 0, 2));
            if (in_array($normalized, self::SUPPORTED, true)) {
                return $normalized;
            }
        }

        $accept = $request->header('Accept-Language');
        if (! is_string($accept) || $accept === '') {
            return null;
        }

        foreach (explode(',', $accept) as $part) {
            $tag = trim(explode(';', $part, 2)[0]);
            if ($tag === '') {
                continue;
            }
            $primary = strtolower(substr(explode('-', $tag, 2)[0], 0, 2));
            if (in_array($primary, self::SUPPORTED, true)) {
                return $primary;
            }
        }

        return null;
    }
}
