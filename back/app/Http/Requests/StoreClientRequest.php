<?php

namespace App\Http\Requests;

use App\Models\ClientStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreClientRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'company_type_id' => ['nullable', 'integer', 'exists:company_types,id'],
            'business_activity' => ['nullable', 'string', 'max:255'],
            'target_markets' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'preferred_comm_method_id' => ['nullable', 'integer', 'exists:preferred_comm_methods,id'],
            'address' => ['nullable', 'string', 'max:500'],
            'website_url' => ['nullable', 'string', 'max:255'],
            'facebook_url' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'string', 'max:255'],
            'client_type' => ['required', 'string', Rule::in(['lead', 'client'])],
            'status_id' => ['nullable', 'integer', 'exists:client_statuses,id'],
            'lead_source_id' => ['nullable', 'integer', 'exists:lead_sources,id'],
            'lead_source_other' => ['nullable', 'string', 'max:255'],
            'interest_level_id' => ['nullable', 'integer', 'exists:interest_levels,id'],
            'decision_maker_name' => ['nullable', 'string', 'max:255'],
            'decision_maker_title_id' => ['nullable', 'integer', 'exists:decision_maker_titles,id'],
            'decision_maker_title_other' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'shipping_problems' => ['nullable', 'string'],
            'current_need' => ['nullable', 'string'],
            'pain_points' => ['nullable', 'string'],
            'opportunity' => ['nullable', 'string'],
            'special_requirements' => ['nullable', 'string'],
            'pricing_tier' => ['nullable', 'string', 'max:100'],
            'pricing_discount_pct' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'pricing_updated_at' => ['nullable', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = $this->input('client_type');
            $statusId = $this->input('status_id');
            if ($type === null || $statusId === null || $statusId === '') {
                return;
            }
            $status = ClientStatus::query()->find((int) $statusId);
            if ($status && $status->applies_to !== $type) {
                $validator->errors()->add(
                    'status_id',
                    __('The selected status does not belong to this client type.')
                );
            }
        });
    }
}
