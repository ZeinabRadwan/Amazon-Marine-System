<?php

namespace App\Http\Requests;

use App\Models\VendorPartnerType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVendorPartnerTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user();
    }

    /**
     * @return array<string, array<int, string|\Illuminate\Validation\Rules\Unique>>
     */
    public function rules(): array
    {
        /** @var VendorPartnerType|null $existing */
        $existing = $this->route('vendorPartnerType');
        $id = $existing?->id;

        return [
            'code' => ['required', 'string', 'max:40', Rule::unique('vendor_partner_types', 'code')->ignore($id)],
            'name_ar' => ['required', 'string', 'max:255'],
            'name_en' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
