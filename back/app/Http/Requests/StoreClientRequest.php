<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'contact_name' => ['nullable', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:clients,code'],
            'type' => ['nullable', 'string', 'in:company,person'],
            'company_type' => ['nullable', 'string', 'max:50'],
            'business_activity' => ['nullable', 'string', 'max:255'],
            'target_markets' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'preferred_comm_method' => ['nullable', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'website_url' => ['nullable', 'string', 'max:255'],
            'facebook_url' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:20'],
            'lead_source' => ['nullable', 'string', 'max:255'],
            'lead_source_other' => ['nullable', 'string', 'max:255'],
            'interest_level' => ['nullable', 'string', 'max:20'],
            'decision_maker_name' => ['nullable', 'string', 'max:255'],
            'decision_maker_title' => ['nullable', 'string', 'max:255'],
            'decision_maker_title_other' => ['nullable', 'string', 'max:255'],
            'default_payment_terms' => ['nullable', 'string', 'max:100'],
            'default_currency' => ['nullable', 'string', 'size:3'],
            'assigned_sales_id' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
            'shipping_problems' => ['nullable', 'string'],
            'current_need' => ['nullable', 'string'],
            'pain_points' => ['nullable', 'string'],
            'opportunity' => ['nullable', 'string'],
            'special_requirements' => ['nullable', 'string'],
        ];
    }
}

