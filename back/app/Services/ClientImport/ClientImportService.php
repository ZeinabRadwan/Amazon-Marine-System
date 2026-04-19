<?php

namespace App\Services\ClientImport;

use App\Models\Client;
use App\Models\ClientStatus;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

final class ClientImportService
{
    public const MAX_DATA_ROWS = 500;

    /** @var array<string, string> normalized import label => client_statuses.name_en (lead pipeline) */
    private const STATUS_IMPORT_TO_NAME_EN = [
        'new' => 'Prospect',
        'contacted' => 'Contacted',
        'qualified' => 'Interested',
        'lost' => 'Lost lead',
    ];

    public function __construct(
        private readonly ClientImportFileReader $reader,
    ) {}

    /**
     * @return array{
     *     success: bool,
     *     message?: string,
     *     errors?: list<array{row: int, field: string, message: string}>,
     *     imported_count?: int,
     *     failed_rows?: list<array{row: int, field: string, message: string}>
     * }
     */
    public function import(UploadedFile $file): array
    {
        $parsed = $this->reader->read($file);

        if (! isset($parsed['headers']['name'], $parsed['headers']['phone'])) {
            return [
                'success' => false,
                'message' => __('The file must include header columns :cols.', ['cols' => 'name, phone']),
                'errors' => [
                    ['row' => 1, 'field' => '_file', 'message' => __('Missing required columns: name and phone.')],
                ],
            ];
        }

        $statusIdsByNameEn = $this->resolveLeadStatusIds();
        if (count($statusIdsByNameEn) < count(array_unique(self::STATUS_IMPORT_TO_NAME_EN))) {
            return [
                'success' => false,
                'message' => __('Import is temporarily unavailable: required client statuses are not configured.'),
                'errors' => [
                    ['row' => 0, 'field' => '_server', 'message' => __('Missing lead status lookup rows in the database.')],
                ],
            ];
        }

        $existingPhones = $this->existingNormalizedPhones();
        $existingEmails = $this->existingNormalizedEmails();

        $errors = [];
        $prepared = [];
        $seenPhones = [];
        $seenEmails = [];

        $dataRowCount = 0;
        foreach ($parsed['rows'] as $row) {
            $rowNum = $row['row_number'];
            $cells = $row['values'];
            $get = function (string $field) use ($parsed, $cells): string {
                $idx = $parsed['headers'][$field] ?? null;
                if ($idx === null || ! array_key_exists($idx, $cells)) {
                    return '';
                }
                $v = $cells[$idx];

                return $v === null ? '' : trim((string) $v);
            };

            $rawName = $get('name');
            $rawPhone = $get('phone');
            $rawEmail = $get('email');
            $rawCompany = $get('company_name');
            $rawStatus = $get('status');

            if ($rawName === '' && $rawPhone === '' && $rawEmail === '' && $rawCompany === '' && $rawStatus === '') {
                continue;
            }

            $dataRowCount++;
            if ($dataRowCount > self::MAX_DATA_ROWS) {
                $errors[] = [
                    'row' => $rowNum,
                    'field' => '_file',
                    'message' => __('This import allows at most :max rows of data.', ['max' => self::MAX_DATA_ROWS]),
                ];
                break;
            }

            $rowErrors = [];

            if ($rawName === '') {
                $rowErrors[] = ['row' => $rowNum, 'field' => 'name', 'message' => __('The name field is required.')];
            }

            if ($rawPhone === '') {
                $rowErrors[] = ['row' => $rowNum, 'field' => 'phone', 'message' => __('The phone field is required.')];
            }

            $normalizedPhone = self::normalizePhoneDigits($rawPhone);
            if ($rawPhone !== '' && ($normalizedPhone === '' || ! ctype_digit($normalizedPhone))) {
                $rowErrors[] = ['row' => $rowNum, 'field' => 'phone', 'message' => __('The phone must contain digits only (after removing spaces and symbols).')];
            } elseif ($normalizedPhone !== '' && (strlen($normalizedPhone) < 5 || strlen($normalizedPhone) > 20)) {
                $rowErrors[] = ['row' => $rowNum, 'field' => 'phone', 'message' => __('The phone must be between 5 and 20 digits.')];
            }

            $normalizedEmail = null;
            if ($rawEmail !== '') {
                if (! filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
                    $rowErrors[] = ['row' => $rowNum, 'field' => 'email', 'message' => __('The email must be a valid address.')];
                } else {
                    $normalizedEmail = strtolower($rawEmail);
                }
            }

            $statusKey = $rawStatus === '' ? 'new' : strtolower(trim($rawStatus));
            $statusNameEn = self::STATUS_IMPORT_TO_NAME_EN[$statusKey] ?? null;
            if ($statusNameEn === null) {
                $rowErrors[] = [
                    'row' => $rowNum,
                    'field' => 'status',
                    'message' => __('Status must be one of: :list.', ['list' => 'New, Contacted, Qualified, Lost']),
                ];
            }
            $statusId = $statusNameEn !== null ? ($statusIdsByNameEn[$statusNameEn] ?? null) : null;
            if ($statusNameEn !== null && $statusId === null) {
                $rowErrors[] = ['row' => $rowNum, 'field' => 'status', 'message' => __('The selected status could not be resolved.')];
            }

            if ($normalizedPhone !== '' && ctype_digit($normalizedPhone)) {
                if (isset($seenPhones[$normalizedPhone])) {
                    $rowErrors[] = ['row' => $rowNum, 'field' => 'phone', 'message' => __('This phone is duplicated in the file.')];
                }
                if (isset($existingPhones[$normalizedPhone])) {
                    $rowErrors[] = ['row' => $rowNum, 'field' => 'phone', 'message' => __('A client with this phone already exists.')];
                }
            }

            if ($normalizedEmail !== null) {
                if (isset($seenEmails[$normalizedEmail])) {
                    $rowErrors[] = ['row' => $rowNum, 'field' => 'email', 'message' => __('This email is duplicated in the file.')];
                }
                if (isset($existingEmails[$normalizedEmail])) {
                    $rowErrors[] = ['row' => $rowNum, 'field' => 'email', 'message' => __('A client with this email already exists.')];
                }
            }

            foreach ($rowErrors as $e) {
                $errors[] = $e;
            }

            if ($rowErrors === [] && $statusId !== null) {
                $seenPhones[$normalizedPhone] = true;
                if ($normalizedEmail !== null) {
                    $seenEmails[$normalizedEmail] = true;
                }
                $prepared[] = [
                    'name' => self::capitalizeWords($rawName),
                    'phone' => $normalizedPhone,
                    'email' => $normalizedEmail,
                    'company_name' => $rawCompany === '' ? null : self::capitalizeWords($rawCompany),
                    'client_type' => 'lead',
                    'status_id' => (int) $statusId,
                ];
            }
        }

        if ($dataRowCount === 0) {
            return [
                'success' => false,
                'message' => __('No data rows were found in the file.'),
                'errors' => [
                    ['row' => 0, 'field' => '_file', 'message' => __('Add at least one data row below the header row.')],
                ],
            ];
        }

        if ($errors !== []) {
            return [
                'success' => false,
                'message' => __('The import failed validation. No records were saved.'),
                'errors' => $errors,
            ];
        }

        $now = now();
        $insertRows = array_map(fn (array $r) => [
            'name' => $r['name'],
            'phone' => $r['phone'],
            'email' => $r['email'],
            'company_name' => $r['company_name'],
            'client_type' => $r['client_type'],
            'status_id' => $r['status_id'],
            'created_at' => $now,
            'updated_at' => $now,
        ], $prepared);

        DB::transaction(function () use ($insertRows): void {
            foreach (array_chunk($insertRows, 100) as $chunk) {
                Client::query()->insert($chunk);
            }
        });

        return [
            'success' => true,
            'imported_count' => count($insertRows),
            'failed_rows' => [],
        ];
    }

    public static function normalizePhoneDigits(string $value): string
    {
        return preg_replace('/\D+/', '', $value) ?? '';
    }

    /**
     * @return array<string, int> name_en => id
     */
    private function resolveLeadStatusIds(): array
    {
        $needed = array_values(array_unique(self::STATUS_IMPORT_TO_NAME_EN));

        return ClientStatus::query()
            ->where('applies_to', 'lead')
            ->whereIn('name_en', $needed)
            ->pluck('id', 'name_en')
            ->all();
    }

    /**
     * @return array<string, true>
     */
    private function existingNormalizedPhones(): array
    {
        $map = [];
        $phones = Client::query()->whereNotNull('phone')->pluck('phone');
        foreach ($phones as $p) {
            $n = self::normalizePhoneDigits((string) $p);
            if ($n !== '') {
                $map[$n] = true;
            }
        }

        return $map;
    }

    /**
     * @return array<string, true> lowercase email
     */
    private function existingNormalizedEmails(): array
    {
        $map = [];
        $emails = Client::query()->whereNotNull('email')->pluck('email');
        foreach ($emails as $e) {
            $s = strtolower(trim((string) $e));
            if ($s !== '') {
                $map[$s] = true;
            }
        }

        return $map;
    }

    private static function capitalizeWords(string $value): string
    {
        $t = preg_replace('/\s+/', ' ', trim($value)) ?? trim($value);

        return mb_convert_case($t, MB_CASE_TITLE, 'UTF-8');
    }
}
