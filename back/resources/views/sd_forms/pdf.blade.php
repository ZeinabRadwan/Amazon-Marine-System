<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SD Form {{ $form->sd_number ?? ('#' . $form->id) }}</title>
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #111; }
        h1, h2, h3 { margin: 0 0 8px; }
        .section { margin-bottom: 12px; }
        .label { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    </style>
</head>
<body>
    <h2>Shipping Details Form (SD)</h2>
    <p><span class="label">SD Number:</span> {{ $form->sd_number ?? ('#' . $form->id) }}</p>

    <div class="section">
        <h3>1. Shipment Basic Information</h3>
        <p><span class="label">Port of Loading (POL):</span> {{ $form->pol?->name ?? $form->pol_text ?? '—' }}</p>
        <p><span class="label">Port of Discharge (POD):</span> {{ $form->pod?->name ?? $form->pod_text ?? '—' }}</p>
        <p><span class="label">Final Destination:</span> {{ $form->final_destination ?? '—' }}</p>
        <p><span class="label">Shipment Direction:</span> {{ $form->shipment_direction ?? '—' }}</p>
    </div>

    <div class="section">
        <h3>2. Parties Information</h3>
        <p><span class="label">Client:</span> {{ $form->client?->name ?? '—' }}</p>
        <p><span class="label">Shipper:</span><br>{{ $form->shipper_info ?? '—' }}</p>
        <p><span class="label">Consignee:</span><br>{{ $form->consignee_info ?? '—' }}</p>
        <p><span class="label">Notify Party Mode:</span> {{ $form->notify_party_mode ?? '—' }}</p>
        @if($form->notify_party_details)
            <p><span class="label">Notify Party Details:</span><br>{{ $form->notify_party_details }}</p>
        @endif
    </div>

    <div class="section">
        <h3>3. Freight &amp; Payment</h3>
        <p><span class="label">Freight Term:</span> {{ $form->freight_term ?? '—' }}</p>
    </div>

    <div class="section">
        <h3>4. Container Details</h3>
        <table>
            <thead>
            <tr>
                <th>Type</th>
                <th>Size</th>
                <th>Number of Containers</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td>{{ $form->container_type ?? '—' }}</td>
                <td>{{ $form->container_size ?? '—' }}</td>
                <td>{{ $form->num_containers ?? '—' }}</td>
            </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>5. Shipment Details</h3>
        <p><span class="label">Requested Vessel Date:</span> {{ optional($form->requested_vessel_date)->toDateString() ?? '—' }}</p>
        <p><span class="label">ACID Number:</span> {{ $form->acid_number ?? '—' }}</p>
    </div>

    <div class="section">
        <h3>6. Cargo Information</h3>
        <p><span class="label">Cargo Description:</span><br>{{ $form->cargo_description ?? '—' }}</p>
        <p><span class="label">HS Code:</span> {{ $form->hs_code ?? '—' }}</p>
    </div>

    <div class="section">
        <h3>7. Reefer Details</h3>
        <p><span class="label">Temperature (Temp):</span> {{ $form->reefer_temp ?? '—' }}</p>
        <p><span class="label">Ventilation (Vent):</span> {{ $form->reefer_vent ?? '—' }}</p>
        <p><span class="label">Humidity (Hum):</span> {{ $form->reefer_hum ?? '—' }}</p>
    </div>

    <div class="section">
        <h3>8. Weight Details</h3>
        <p><span class="label">Total Gross Weight (KG):</span> {{ $form->total_gross_weight ?? '—' }}</p>
        <p><span class="label">Total Net Weight (KG):</span> {{ $form->total_net_weight ?? '—' }}</p>
    </div>
</body>
</html>

