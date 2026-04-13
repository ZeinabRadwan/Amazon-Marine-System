<?php

namespace App\Services\ClientImport;

use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ClientImportTemplateExporter
{
    public function downloadResponse(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Clients');

        $sheet->fromArray([
            ['name', 'phone', 'email', 'company_name', 'status'],
            ['John Smith', '01234567890', 'john@example.com', 'Acme Corp', 'New'],
        ]);

        foreach (['A' => 22, 'B' => 16, 'C' => 28, 'D' => 24, 'E' => 14] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $validation = new DataValidation;
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setErrorStyle(DataValidation::STYLE_STOP);
        $validation->setAllowBlank(true);
        $validation->setShowInputMessage(true);
        $validation->setShowErrorMessage(true);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"New,Contacted,Qualified,Lost"');
        $validation->setPromptTitle(__('Status'));
        $validation->setPrompt(__('Choose a pipeline status.'));
        $validation->setErrorTitle(__('Invalid value'));
        $validation->setError(__('Pick one of: New, Contacted, Qualified, Lost.'));

        for ($r = 2; $r <= ClientImportService::MAX_DATA_ROWS + 1; $r++) {
            $sheet->getCell('E'.$r)->setDataValidation(clone $validation);
        }

        return new StreamedResponse(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="clients-import-template.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
