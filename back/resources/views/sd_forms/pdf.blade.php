<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>SD Form {{ $form->sd_number ?? ('#' . $form->id) }}</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #1f2937;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
        }
        .page {
            border: 1px solid #dbe3ef;
            padding: 16px 18px;
        }
        .header {
            border-bottom: 2px solid #0c4a6e;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: top;
        }
        .logo-box {
            width: 58px;
            height: 58px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            text-align: center;
            line-height: 58px;
            font-weight: 700;
            color: #0c4a6e;
            font-size: 11px;
            background: #f8fafc;
        }
        .company-name {
            font-size: 18px;
            font-weight: 700;
            color: #0c4a6e;
            margin: 0 0 4px;
        }
        .company-slogan {
            font-size: 11px;
            color: #6b7280;
            margin: 0;
        }
        .doc-meta {
            text-align: right;
            font-size: 11px;
            color: #374151;
            line-height: 1.5;
        }
        .doc-meta .doc-title {
            font-size: 16px;
            font-weight: 700;
            color: #0c4a6e;
            margin-bottom: 4px;
        }
        .section-title {
            margin: 14px 0 6px;
            padding: 4px 8px;
            border-left: 4px solid #0c4a6e;
            background: #f8fafc;
            font-size: 12px;
            font-weight: 700;
            color: #0c4a6e;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .data-table th,
        .data-table td {
            border: 1px solid #d6deeb;
            padding: 6px 8px;
            vertical-align: top;
        }
        .data-table th {
            background: #edf3fb;
            color: #0f3a61;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }
        .data-table td {
            font-size: 11px;
            color: #111827;
            line-height: 1.45;
        }
        .muted {
            color: #6b7280;
            font-size: 10px;
        }
        .notes-box {
            border: 1px solid #d6deeb;
            background: #fcfdff;
            padding: 8px 10px;
            min-height: 40px;
            line-height: 1.5;
        }
        .footer {
            margin-top: 14px;
            border-top: 1px solid #d6deeb;
            padding-top: 10px;
            font-size: 10px;
            color: #4b5563;
        }
        .footer-title {
            font-weight: 700;
            color: #0c4a6e;
            margin: 0 0 4px;
            font-size: 11px;
        }
        .footer-line {
            margin: 2px 0;
        }
    </style>
</head>
<body>
    <div class="page">
        @php
            $pol = $form->pol?->name ?? $form->pol_text ?? '—';
            $pod = $form->pod?->name ?? $form->pod_text ?? '—';
            $finalDestination = $form->final_destination ?? '—';
            $consignee = $form->consignee_info ?? '—';
            $notifyMode = strtolower((string) ($form->notify_party_mode ?? ''));
            if (!empty($form->notify_party_details)) {
                $notifyParty = $form->notify_party_details;
            } elseif ($notifyMode === 'same') {
                $notifyParty = $consignee;
            } else {
                $notifyParty = '—';
            }
            $contactDetails = trim((string) ($form->client?->email ?? ''));
            if ($contactDetails === '') {
                $contactDetails = trim((string) ($form->client?->phone ?? ''));
            }
            $containerLabel = trim((string) ($form->num_containers ?? ''));
            if ($containerLabel !== '') {
                $containerLabel .= 'x';
            }
            $containerLabel .= trim((string) ($form->container_size ?? '—'));
            $weightLabel = 'T.G.W: '.($form->total_gross_weight ?? '—');
            $vesselRef = $form->linkedShipment?->bl_number ?? '—';
            $logoPath = base_path('../front/src/assets/logo_darkmode.png');
            $logoSrc = file_exists($logoPath) ? 'file://'.str_replace('\\', '/', $logoPath) : null;
        @endphp

        <div class="header">
            @if(!empty($headerHtml))
                {!! $headerHtml !!}
            @else
                <table class="header-table">
                    <tr>
                        <td style="width: 64px;">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="Amazon Marine" style="width:58px;height:58px;object-fit:contain;">
                            @else
                                <div class="logo-box">LOGO</div>
                            @endif
                        </td>
                        <td style="padding-left: 10px;">
                            <p class="company-name">AMAZON MARINE</p>
                            <p class="company-slogan">Shipping and Logistics Solutions</p>
                        </td>
                        <td class="doc-meta">
                            <div class="doc-title">SD - Shipping Details Form</div>
                            <div><strong>SD No:</strong> {{ $form->sd_number ?? ('SD-'.$form->id) }}</div>
                            <div><strong>SD Date:</strong> {{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</div>
                            <div><strong>Vessel Date:</strong> {{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</div>
                            <div><strong>Client:</strong> {{ $form->client?->name ?? '—' }}</div>
                        </td>
                    </tr>
                </table>
            @endif
        </div>

        <div class="section-title">Shipment Info</div>
        <table class="data-table">
            <tr>
                <th>Port of Loading</th>
                <th>Port of Discharge</th>
                <th>Final Destination</th>
            </tr>
            <tr>
                <td>{{ $pol }}</td>
                <td>{{ $pod }}</td>
                <td>{{ $finalDestination }}</td>
            </tr>
            <tr>
                <th>Consignee</th>
                <th>Notify Party</th>
                <th>Contact Details</th>
            </tr>
            <tr>
                <td>{{ $consignee }}</td>
                <td>{{ $notifyParty }}</td>
                <td>
                    Email: {{ $form->client?->email ?? '—' }}<br>
                    Phone: {{ $form->client?->phone ?? '—' }}
                </td>
            </tr>
        </table>

        <div class="section-title">Shipping Info</div>
        <table class="data-table">
            <tr>
                <th>SWB Type</th>
                <th>Freight</th>
                <th>On Board Status</th>
            </tr>
            <tr>
                <td>SWB TELEX</td>
                <td>{{ $form->freight_term ?? '—' }}</td>
                <td>Clean on Board</td>
            </tr>
            <tr>
                <th>Vessel / Container</th>
                <th>Container Type</th>
                <th>HS Code</th>
                <th>Weight (KGS)</th>
            </tr>
            <tr>
                <td>{{ $vesselRef }}</td>
                <td>{{ $form->container_type ?? '—' }} ({{ $containerLabel }})</td>
                <td>{{ $form->hs_code ?? '—' }}</td>
                <td>{{ $weightLabel }}</td>
            </tr>
            <tr>
                <th>Shipping Line</th>
                <td colspan="3">{{ $form->shipping_line ?? '—' }}</td>
            </tr>
        </table>

        <div class="section-title">Goods Details</div>
        <table class="data-table">
            <tr>
                <th style="width: 35%;">Marks / Numbers</th>
                <th>Description of Goods</th>
            </tr>
            <tr>
                <td>{{ $form->sd_number ?? '—' }}</td>
                <td>{{ $form->cargo_description ?? '—' }}</td>
            </tr>
        </table>
        <div class="notes-box">
            <strong>Total Gross Weight:</strong> {{ $form->total_gross_weight ?? '—' }} KG
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <strong>Total Net Weight:</strong> {{ $form->total_net_weight ?? '—' }} KG
            @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                <br><strong>ACID Number:</strong> {{ $form->acid_number }}
            @endif
            @if(!empty($form->notes))
                <br><br><strong>Notes:</strong> {{ $form->notes }}
            @endif
        </div>

        <div class="footer">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                <p class="footer-title">Contact Information</p>
                <p class="footer-line"><strong>Phone:</strong> 01200744888</p>
                <p class="footer-line"><strong>Email:</strong> mabdrabboh@amazonmarine.ltd</p>
                <p class="footer-line"><strong>Address:</strong> Villa 129, 2nd District New Cairo, Egypt</p>
                <p class="footer-line"><strong>Website:</strong> www.amazonmarine.ltd</p>
            @endif
        </div>
    </div>
</body>
</html>

