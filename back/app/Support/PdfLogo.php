<?php

namespace App\Support;

final class PdfLogo
{
    public static function path(): string
    {
        return public_path('images/logo_lightmode.png');
    }

    /**
     * Absolute file:// URI for mPDF img src, or null if the file is missing.
     */
    public static function imgSrc(): ?string
    {
        $path = self::path();

        if (! is_file($path)) {
            return null;
        }

        return 'file://'.str_replace('\\', '/', $path);
    }

    public static function headerPath(): string
    {
        return public_path('images/header.png');
    }

    /**
     * Absolute file:// URI for mPDF top banner img src, or null if the file is missing.
     */
    public static function headerImgSrc(): ?string
    {
        $path = self::headerPath();

        if (! is_file($path)) {
            return null;
        }

        return 'file://'.str_replace('\\', '/', $path);
    }

    public static function footerPath(): string
    {
        return public_path('images/footer.png');
    }

    /**
     * Absolute file:// URI for mPDF footer banner img src, or null if the file is missing.
     */
    public static function footerImgSrc(): ?string
    {
        $path = self::footerPath();

        if (! is_file($path)) {
            return null;
        }

        return 'file://'.str_replace('\\', '/', $path);
    }
}
