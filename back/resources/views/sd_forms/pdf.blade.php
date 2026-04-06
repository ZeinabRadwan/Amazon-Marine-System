<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>SD Form {{ $form->sd_number ?? ('#' . $form->id) }}</title>
    <style>
        @font-face {
            font-family: 'Amiri';
            src: url('{{ resource_path('fonts/Amiri-Regular.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }

        body {
            font-family: 'Amiri', 'dejavusans', sans-serif;
            font-size: 11px;
            color: #111;
            direction: ltr;
            text-align: left;
        }
        h1, h2, h3 { margin: 0 0 6px; }
        .label { font-weight: bold; }
        .wrapper { border: 2px solid #0c4a6e; padding: 12px 16px; }
        .header-box {
            background: #0c4a6e;
            color: #ffffff;
            padding: 8px 12px;
            margin-bottom: 8px;
        }
        .header-title { font-size: 14px; font-weight: bold; }
        .header-sub { font-size: 11px; }
        .info-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .info-table th,
        .info-table td {
            border: 1px solid #dddddd;
            padding: 4px 6px;
            font-size: 10px;
        }
        .info-table th {
            background: #f1f5f9;
            font-weight: bold;
        }
        .section-title {
            margin-top: 10px;
            font-size: 11px;
            font-weight: bold;
            color: #0c4a6e;
        }
        .footer-box {
            margin-top: 14px;
            border-top: 1px solid #e5e7eb;
            padding-top: 6px;
            font-size: 9px;
            color: #4b5563;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        {{-- Header (customizable) --}}
        <div class="header-box">
            @if(!empty($headerHtml))
                {!! $headerHtml !!}
            @else
                <div class="header-title">Shipping Details Offer</div>
                <div class="header-sub">
                    SD: {{ $form->sd_number ?? ('#' . $form->id) }}
                    &nbsp;|&nbsp;
                    Client: {{ $form->client?->name ?? '—' }}
                </div>
            @endif
        </div>

        {{-- Main info table similar to sample offer --}}
        <table class="info-table">
            <tbody>
            <tr>
                <th>Subject</th>
                <td colspan="3">
                    {{ $form->cargo_description ?? '—' }}
                </td>
            </tr>
            <tr>
                <th>POL</th>
                <td>{{ $form->pol?->name ?? $form->pol_text ?? '—' }}</td>
                <th>POD</th>
                <td>{{ $form->pod?->name ?? $form->pod_text ?? '—' }}</td>
            </tr>
            <tr>
                <th>Shipping Line</th>
                <td colspan="3">{{ $form->shipping_line ?? '—' }}</td>
            </tr>
            <tr>
                <th>Final Destination</th>
                <td>{{ $form->final_destination ?? '—' }}</td>
                <th>Shipment Direction</th>
                <td>{{ $form->shipment_direction ?? '—' }}</td>
            </tr>
            <tr>
                <th>Container</th>
                <td>
                    {{ $form->num_containers ?? '—' }}
                    × {{ $form->container_size ?? '—' }}
                    ({{ $form->container_type ?? '—' }})
                </td>
                <th>Requested Vessel Date</th>
                <td>{{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</td>
            </tr>
            <tr>
                <th>Freight Term</th>
                <td>{{ $form->freight_term ?? '—' }}</td>
                <th>ACID</th>
                <td>{{ $form->acid_number ?? '—' }}</td>
            </tr>
            <tr>
                <th>Weights</th>
                <td colspan="3">
                    Gross: {{ $form->total_gross_weight ?? '—' }} KG
                    &nbsp;|&nbsp;
                    Net: {{ $form->total_net_weight ?? '—' }} KG
                </td>
            </tr>
            <tr>
                <th>HS Code</th>
                <td>{{ $form->hs_code ?? '—' }}</td>
                <th>Reefer (Temp / Vent / Hum)</th>
                <td>
                    {{ $form->reefer_temp ?? '—' }}
                    /
                    {{ $form->reefer_vent ?? '—' }}
                    /
                    {{ $form->reefer_hum ?? '—' }}
                </td>
            </tr>
            </tbody>
        </table>

        <div class="section-title">Parties</div>
        <table class="info-table">
            <tbody>
            <tr>
                <th>Shipper</th>
                <td>{{ $form->shipper_info ?? '—' }}</td>
            </tr>
            <tr>
                <th>Consignee</th>
                <td>{{ $form->consignee_info ?? '—' }}</td>
            </tr>
            <tr>
                <th>Notify Party</th>
                <td>
                    Mode: {{ $form->notify_party_mode ?? '—' }}<br>
                    @if($form->notify_party_details)
                        {{ $form->notify_party_details }}
                    @endif
                </td>
            </tr>
            </tbody>
        </table>

        {{-- Footer (customizable) --}}
        <div class="footer-box">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                <div>Above details are based on current SD form data in Amazon Marine system.</div>
            @endif
        </div>
    </div>
</body>
</html>

