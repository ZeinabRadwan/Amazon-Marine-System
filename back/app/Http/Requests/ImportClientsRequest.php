<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportClientsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('clients.manage') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimes:xlsx,csv',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => __('A file is required.'),
            'file.mimes' => __('The file must be an Excel (.xlsx) or CSV file.'),
            'file.max' => __('The file may not be greater than 10 MB.'),
        ];
    }
}
