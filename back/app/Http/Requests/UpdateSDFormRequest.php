<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSDFormRequest extends FormRequest
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
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'sales_rep_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'status' => ['sometimes', 'string', 'in:draft,submitted,sent_to_operations,in_progress,completed,cancelled'],
            'pol_id' => ['sometimes', 'nullable', 'integer', 'exists:ports,id'],
            'pod_id' => ['sometimes', 'nullable', 'integer', 'exists:ports,id'],
            'shipping_line' => ['sometimes', 'required', 'string', 'max:255'],
            'pol_text' => ['sometimes', 'nullable', 'string', 'max:255'],
            'pod_text' => ['sometimes', 'nullable', 'string', 'max:255'],
            'final_destination' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shipment_direction' => ['sometimes', 'string', 'in:Export,Import'],
            'shipper_info' => ['sometimes', 'nullable', 'string'],
            'consignee_info' => ['sometimes', 'nullable', 'string'],
            'notify_party_mode' => ['sometimes', 'nullable', 'string', 'in:same,different'],
            'notify_party_details' => ['sometimes', 'nullable', 'string'],
            'freight_term' => ['sometimes', 'nullable', 'string', 'in:Prepaid,Collect'],
            'container_type' => ['sometimes', 'nullable', 'string', 'max:40'],
            'container_size' => ['sometimes', 'nullable', 'string', 'max:10'],
            'num_containers' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'requested_vessel_date' => ['sometimes', 'nullable', 'date'],
            'acid_number' => ['sometimes', 'nullable', 'string', 'max:100', 'required_if:shipment_direction,Import'],
            'cargo_description' => ['sometimes', 'nullable', 'string'],
            'hs_code' => ['sometimes', 'nullable', 'string', 'max:32'],
            'reefer_temp' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reefer_vent' => ['sometimes', 'nullable', 'string', 'max:50'],
            'reefer_hum' => ['sometimes', 'nullable', 'string', 'max:50'],
            'total_gross_weight' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'total_net_weight' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
