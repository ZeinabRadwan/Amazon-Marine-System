<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
        $clientId = $this->route('client')?->id ?? null;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50', 'unique:clients,code,' . $clientId],
            'type' => ['sometimes', 'nullable', 'string', 'in:company,person'],
            'company_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'business_activity' => ['sometimes', 'nullable', 'string', 'max:255'],
            'target_markets' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tax_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'preferred_comm_method' => ['sometimes', 'nullable', 'string', 'max:50'],
            'city' => ['sometimes', 'nullable', 'string', 'max:255'],
            'country' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'website_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'facebook_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'linkedin_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', 'string', 'max:20'],
            'lead_source' => ['sometimes', 'nullable', 'string', 'max:255'],
            'lead_source_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'interest_level' => ['sometimes', 'nullable', 'string', 'max:20'],
            'decision_maker_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'decision_maker_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'decision_maker_title_other' => ['sometimes', 'nullable', 'string', 'max:255'],
            'default_payment_terms' => ['sometimes', 'nullable', 'string', 'max:100'],
            'default_currency' => ['sometimes', 'nullable', 'string', 'size:3'],
            'assigned_sales_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'shipping_problems' => ['sometimes', 'nullable', 'string'],
            'current_need' => ['sometimes', 'nullable', 'string'],
            'pain_points' => ['sometimes', 'nullable', 'string'],
            'opportunity' => ['sometimes', 'nullable', 'string'],
            'special_requirements' => ['sometimes', 'nullable', 'string'],
        ];
    }
}

