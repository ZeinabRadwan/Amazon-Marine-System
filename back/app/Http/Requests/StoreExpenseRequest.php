<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('accounting.manage') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'in:shipment,general'],
            'expense_category_id' => ['required', 'integer', 'exists:expense_categories,id'],
            'shipment_id' => ['required_if:type,shipment', 'nullable', 'integer', 'exists:shipments,id'],
            'vendor_id' => ['nullable', 'integer', 'exists:vendors,id'],
            'description' => ['required', 'string', 'max:500'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_code' => ['required', 'string', 'size:3'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'expense_date' => ['required', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
        ];
    }
}
