<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('clients.manage') ?? false;
    }

    public function rules(): array
    {
        return [
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'vendor_id' => ['sometimes', 'nullable', 'integer', 'exists:vendors,id'],
            'other_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'subject' => ['sometimes', 'string', 'max:255'],
            'purpose' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'visit_date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'string', 'max:30'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $provided = collect([
                'client_id' => $this->filled('client_id'),
                'vendor_id' => $this->filled('vendor_id'),
                'other_name' => $this->filled('other_name'),
            ])->filter();

            if ($provided->count() > 1) {
                $validator->errors()->add('client_id', 'Provide only one of client_id, vendor_id, or other_name.');
            }
        });
    }
}

