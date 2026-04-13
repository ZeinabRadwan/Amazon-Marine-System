<?php

namespace App\Services\ClientImport;

use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

final class ClientImportFileReader
{
    /**
     * @return array{headers: array<string, int>, rows: list<array{row_number: int, values: list<string|null>}>}
     */
    public function read(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if ($path === false) {
            throw new \RuntimeException(__('Could not read the uploaded file.'));
        }

        $reader = IOFactory::createReaderForFile($path);
        $reader->setReadDataOnly(true);
        /** @var Spreadsheet $spreadsheet */
        $spreadsheet = $reader->load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = (int) $sheet->getHighestDataRow();
        $highestColumn = $sheet->getHighestDataColumn();
        $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);

        if ($highestRow < 1) {
            return ['headers' => [], 'rows' => []];
        }

        $headerRow = [];
        for ($c = 1; $c <= $highestColumnIndex; $c++) {
            $coord = Coordinate::stringFromColumnIndex($c).'1';
            $raw = $sheet->getCell($coord)->getValue();
            $headerRow[] = $raw === null ? '' : trim((string) $raw);
        }

        $headers = $this->mapHeaders($headerRow);

        $rows = [];
        for ($r = 2; $r <= $highestRow; $r++) {
            $values = [];
            for ($c = 1; $c <= $highestColumnIndex; $c++) {
                $coord = Coordinate::stringFromColumnIndex($c).$r;
                $cell = $sheet->getCell($coord);
                $formatted = $cell->getFormattedValue();
                if ($formatted === null || $formatted === '') {
                    $raw = $cell->getValue();
                    $values[] = $raw === null ? null : trim((string) $raw);
                } else {
                    $values[] = trim((string) $formatted);
                }
            }
            $rows[] = ['row_number' => $r, 'values' => $values];
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * @param  list<string>  $headerRow
     * @return array<string, int> canonical field => 0-based column index
     */
    private function mapHeaders(array $headerRow): array
    {
        $headers = [];
        foreach ($headerRow as $index => $label) {
            $key = $this->canonicalHeaderKey($label);
            if ($key !== null) {
                $headers[$key] = $index;
            }
        }

        return $headers;
    }

    private function canonicalHeaderKey(string $label): ?string
    {
        $n = strtolower(trim($label));
        $n = str_replace(['_', '-'], ' ', $n);
        $n = preg_replace('/\s+/', ' ', $n) ?? $n;

        return match ($n) {
            'name', 'client name', 'full name' => 'name',
            'phone', 'mobile', 'tel', 'telephone' => 'phone',
            'email', 'e mail' => 'email',
            'company', 'company name', 'company_name' => 'company_name',
            'status' => 'status',
            default => null,
        };
    }
}
