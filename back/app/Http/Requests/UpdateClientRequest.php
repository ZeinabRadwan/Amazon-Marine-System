<?php

namespace App\Http\Requests;

use App\Models\Client;
use App\Models\ClientStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateClientRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_type_id' => ['sometimes', 'nullable', 'integer', 'exists:company_types,id'],
            'business_activity' => ['sometimes', 'nullable', 'string', 'max:255'],
            'target_markets' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tax_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'preferred_comm_method_id' => ['sometimes', 'nullable', 'integer', 'exists:preferred_comm_methods,id'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'website_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'facebook_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'linkedin_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'client_type' => ['sometimes', 'string', Rule::in(['lead', 'client'])],
            'status_id' => ['sometimes', 'nullable', 'integer', 'exists:client_statuses,id'],
            'lead_source_id' => ['sometimes', 'nullable', 'integer', 'exists:lead_sources,id'],
            'lead_source_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'interest_level_id' => ['sometimes', 'nullable', 'integer', 'exists:interest_levels,id'],
            'decision_maker_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'decision_maker_title_id' => ['sometimes', 'nullable', 'integer', 'exists:decision_maker_titles,id'],
            'decision_maker_title_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'shipping_problems' => ['sometimes', 'nullable', 'string'],
            'current_need' => ['sometimes', 'nullable', 'string'],
            'pain_points' => ['sometimes', 'nullable', 'string'],
            'opportunity' => ['sometimes', 'nullable', 'string'],
            'special_requirements' => ['sometimes', 'nullable', 'string'],
            'pricing_tier' => ['sometimes', 'nullable', 'string', 'max:100'],
            'pricing_discount_pct' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'pricing_updated_at' => ['sometimes', 'nullable', 'date'],
            'assigned_sales_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $client = $this->route('client');
        if ($client instanceof Client && ! $this->has('client_type')) {
            $this->merge(['client_type' => $client->client_type]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $client = $this->route('client');
            if (! $client instanceof Client) {
                return;
            }
            $type = $this->input('client_type', $client->client_type);
            $statusId = $this->has('status_id')
                ? $this->input('status_id')
                : $client->status_id;
            if ($statusId === null || $statusId === '') {
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
