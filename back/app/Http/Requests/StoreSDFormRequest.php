<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSDFormRequest extends FormRequest
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
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'sales_rep_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', 'string', 'in:draft,submitted,sent_to_operations,in_progress,completed,cancelled'],
            'pol_id' => ['nullable', 'integer', 'exists:ports,id'],
            'pod_id' => ['nullable', 'integer', 'exists:ports,id'],
            'shipping_line' => ['nullable', 'string', 'max:255'],
            'shipping_line_id' => ['nullable', 'integer', 'exists:shipping_lines,id'],
            'pol_text' => ['nullable', 'string', 'max:255'],
            'pod_text' => ['nullable', 'string', 'max:255'],
            'final_destination' => ['nullable', 'string', 'max:255'],
            'shipment_direction' => ['required', 'string', 'in:Export,Import'],
            'shipper_info' => ['nullable', 'string'],
            'consignee_info' => ['nullable', 'string'],
            'notify_party_mode' => ['nullable', 'string', 'in:same,different'],
            'notify_party_details' => ['nullable', 'string'],
            'freight_term' => ['nullable', 'string', 'in:Prepaid,Collect'],
            'container_type' => ['nullable', 'string', 'max:40'],
            'container_size' => ['nullable', 'string', 'max:10'],
            'num_containers' => ['nullable', 'integer', 'min:1'],
            'requested_vessel_date' => ['nullable', 'date'],
            'acid_number' => ['nullable', 'string', 'max:100', 'required_if:shipment_direction,Import'],
            'cargo_description' => ['nullable', 'string'],
            'hs_code' => ['nullable', 'string', 'max:32'],
            'reefer_temp' => ['nullable', 'string', 'max:50'],
            'reefer_vent' => ['nullable', 'string', 'max:50'],
            'reefer_hum' => ['nullable', 'string', 'max:50'],
            'total_gross_weight' => ['nullable', 'numeric', 'min:0'],
            'total_net_weight' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

