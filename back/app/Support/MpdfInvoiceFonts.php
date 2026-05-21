<?php

namespace App\Support;

use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;

final class MpdfInvoiceFonts
{
    /**
     * mPDF options merged with base config (Inter + Cairo, matching amazon_marine_invoice_template.html).
     *
     * @param  array<string, mixed>  $base
     * @return array<string, mixed>
     */
    public static function mergeOptions(array $base): array
    {
        $dir = resource_path('fonts/mpdf');
        $inter = $dir.'/Inter-VF.ttf';
        $cairo = $dir.'/Cairo-VF.ttf';
        if (! is_readable($inter) || ! is_readable($cairo)) {
            return $base;
        }

        $dc = (new ConfigVariables)->getDefaults();
        $fd = (new FontVariables)->getDefaults();

        return array_replace_recursive($base, [
            'fontDir' => array_merge($dc['fontDir'], [$dir]),
            'fontdata' => $fd['fontdata'] + [
                'inter' => [
                    'R' => 'Inter-VF.ttf',
                    'B' => 'Inter-VF.ttf',
                    'I' => 'Inter-VF.ttf',
                    'BI' => 'Inter-VF.ttf',
                ],
                'cairo' => [
                    'R' => 'Cairo-VF.ttf',
                    'B' => 'Cairo-VF.ttf',
                    // Cairo-VF triggers "MarkGlyphSets - Not tested yet" when OTL is enabled.
                    'useOTL' => 0,
                    'useKashida' => 0,
                ],
            ],
            'default_font' => 'inter',
        ]);
    }
}
