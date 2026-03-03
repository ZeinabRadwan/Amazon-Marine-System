<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitSDFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('sd_forms.manage') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'shipment_direction' => ['sometimes', 'string', 'in:Export,Import'],
            'acid_number' => ['nullable', 'string', 'max:100', 'required_if:shipment_direction,Import'],
        ];
    }
}

