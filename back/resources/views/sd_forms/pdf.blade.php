<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>SD Form {{ $form->sd_number ?? ('#' . $form->id) }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            color: #111827;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
            line-height: 1.45;
        }
        .wrap {
            padding: 18px 20px 22px;
        }
        table.head {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            border-bottom: 1px solid #d1d5db;
        }
        table.head td {
            vertical-align: top;
            padding-bottom: 14px;
            border: none;
        }
        .logo-cell {
            width: 88px;
            padding-right: 14px;
        }
        .logo-cell img {
            width: 76px;
            height: auto;
            max-height: 72px;
            display: block;
        }
        .brand-text .name {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #0f172a;
            margin: 0 0 3px;
        }
        .brand-text .tag {
            font-size: 10px;
            color: #64748b;
            margin: 0;
            letter-spacing: 0.02em;
        }
        .head-meta {
            text-align: right;
        }
        .doc-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 8px;
        }
        .meta-line {
            margin: 0 0 3px;
            font-size: 10.5px;
            color: #374151;
        }
        .meta-line strong {
            color: #1e293b;
            font-weight: 600;
        }
        .sec {
            margin: 0 0 12px;
        }
        .sec-h {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #475569;
            margin: 0 0 6px;
            padding-bottom: 4px;
            border-bottom: 2px solid #e2e8f0;
        }
        table.grid {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        table.grid th,
        table.grid td {
            border: 1px solid #e2e8f0;
            padding: 7px 9px;
            vertical-align: top;
        }
        table.grid th {
            background: #f8fafc;
            font-size: 9.5px;
            font-weight: 700;
            color: #334155;
            text-align: left;
        }
        table.grid td {
            font-size: 10.5px;
            color: #111827;
        }
        .cell-muted {
            color: #9ca3af;
        }
        .block-text {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .notes {
            border: 1px solid #e2e8f0;
            background: #fafafa;
            padding: 10px 12px;
            margin-top: 8px;
            font-size: 10.5px;
            line-height: 1.55;
        }
        .footer {
            margin-top: 18px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 9.5px;
            color: #64748b;
        }
        .footer-h {
            font-weight: 700;
            color: #334155;
            margin: 0 0 6px;
            font-size: 10px;
        }
        .footer p { margin: 2px 0; }
    </style>
</head>
<body>
    @php
        $pol = $form->pol?->name ?? $form->pol_text ?? '—';
        $pod = $form->pod?->name ?? $form->pod_text ?? '—';
        $finalDestination = $form->final_destination ?? '—';
        $consigneeRaw = trim((string) ($form->consignee_info ?? ''));
        $consignee = $consigneeRaw !== '' ? $consigneeRaw : '—';

        $notifyMode = strtolower((string) ($form->notify_party_mode ?? ''));
        $notifyDetailsRaw = trim((string) ($form->notify_party_details ?? ''));

        if ($notifyDetailsRaw !== '') {
            $notifyDisplayHtml = nl2br(e($notifyDetailsRaw));
        } elseif ($notifyMode === 'same') {
            $notifyDisplayHtml = '<span style="color:#475569;font-style:italic;">Same as consignee</span>';
        } else {
            $notifyDisplayHtml = '—';
        }

        $consigneeHtml = $consignee === '—' ? '—' : nl2br(e($consigneeRaw));

        $containerLabel = trim((string) ($form->num_containers ?? ''));
        if ($containerLabel !== '') {
            $containerLabel .= '×';
        }
        $containerLabel .= trim((string) ($form->container_size ?? ''));
        if ($containerLabel === '') {
            $containerLabel = '—';
        }
        $ct = trim((string) ($form->container_type ?? ''));
        $containerTypeCell = $ct !== '' ? $ct.' ('.$containerLabel.')' : $containerLabel;

        $weightLabel = 'T.G.W: '.($form->total_gross_weight ?? '—');

        $bl = trim((string) ($form->linkedShipment?->bl_number ?? ''));
        $bk = trim((string) ($form->linkedShipment?->booking_number ?? ''));
        if ($bl !== '') {
            $vesselRef = $bl;
        } elseif ($bk !== '') {
            $vesselRef = $bk;
        } else {
            $vesselRef = '—';
        }

        $logoPath = base_path('../front/src/assets/logo_lightmode.png');
        $logoSrc = file_exists($logoPath) ? 'file://'.str_replace('\\', '/', $logoPath) : null;
    @endphp

    <div class="wrap">
        @if(!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <table class="head">
                <tr>
                    <td style="width:58%;">
                        <table style="width:100%;border-collapse:collapse;">
                            <tr>
                                <td class="logo-cell" style="border:none;">
                                    @if($logoSrc)
                                        <img src="{{ $logoSrc }}" alt="Amazon Marine">
                                    @else
                                        <div style="width:76px;height:56px;border:1px solid #e5e7eb;text-align:center;line-height:56px;font-size:9px;color:#64748b;">LOGO</div>
                                    @endif
                                </td>
                                <td class="brand-text" style="border:none;">
                                    <p class="name">AMAZON MARINE</p>
                                    <p class="tag">Shipping and Logistics Solutions</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="head-meta" style="width:42%;">
                        <div class="doc-title">SD - Shipping Details Form</div>
                        <p class="meta-line"><strong>SD No:</strong> {{ $form->sd_number ?? ('SD-'.$form->id) }}</p>
                        <p class="meta-line"><strong>SD Date:</strong> {{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</p>
                        <p class="meta-line"><strong>Vessel Date:</strong> {{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</p>
                        <p class="meta-line"><strong>Client:</strong> {{ $form->client?->name ?? '—' }}</p>
                    </td>
                </tr>
            </table>
        @endif

        <div class="sec">
            <p class="sec-h">Shipment Info</p>
            <table class="grid">
                <tr>
                    <th style="width:33.33%;">Port of Loading</th>
                    <th style="width:33.33%;">Port of Discharge</th>
                    <th style="width:33.33%;">Final Destination</th>
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
                    <td class="block-text">{!! $consigneeHtml !!}</td>
                    <td class="block-text">{!! $notifyDisplayHtml !!}</td>
                    <td>
                        @if($form->client?->email)
                            <div><strong style="color:#334155;">Email:</strong> {{ $form->client->email }}</div>
                        @endif
                        @if($form->client?->phone)
                            <div style="margin-top:4px;"><strong style="color:#334155;">Phone:</strong> {{ $form->client->phone }}</div>
                        @endif
                        @if(!$form->client?->email && !$form->client?->phone)
                            <span class="cell-muted">—</span>
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <div class="sec">
            <p class="sec-h">Shipping Info</p>
            <table class="grid">
                <tr>
                    <th style="width:25%;">SWB Type</th>
                    <th style="width:37.5%;">Freight on Board</th>
                    <th style="width:37.5%;">Status</th>
                </tr>
                <tr>
                    <td>SWB TELEX</td>
                    <td>{{ $form->freight_term ?? '—' }}</td>
                    <td>Clean on Board</td>
                </tr>
            </table>
            <table class="grid" style="margin-top:-1px;">
                <tr>
                    <th style="width:25%;">Vessel / Container</th>
                    <th style="width:25%;">Container Type</th>
                    <th style="width:25%;">HS Code</th>
                    <th style="width:25%;">Weight (KGS)</th>
                </tr>
                <tr>
                    <td>{{ $vesselRef }}</td>
                    <td>{{ $containerTypeCell }}</td>
                    <td>{{ $form->hs_code ?? '—' }}</td>
                    <td>{{ $weightLabel }}</td>
                </tr>
                <tr>
                    <th>Shipping Line</th>
                    <td colspan="3">{{ $form->shipping_line ?? '—' }}</td>
                </tr>
            </table>
        </div>

        <div class="sec">
            <p class="sec-h">Goods Details</p>
            <table class="grid">
                <tr>
                    <th style="width:32%;">Marks / Numbers</th>
                    <th>Description of Goods</th>
                </tr>
                <tr>
                    <td>{{ $form->sd_number ?? '—' }}</td>
                    <td class="block-text">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
                </tr>
            </table>
            <div class="notes">
                <strong>Total Gross Weight:</strong> {{ $form->total_gross_weight ?? '—' }} KG
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <strong>Total Net Weight:</strong> {{ $form->total_net_weight ?? '—' }} KG
                @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                    <br><br><strong>ACID Number:</strong> {{ $form->acid_number }}
                @endif
                @if(!empty($form->notes))
                    <br><br><strong>Notes:</strong> {{ $form->notes }}
                @endif
            </div>
        </div>

        <div class="footer">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                <p class="footer-h">Contact Information</p>
                <p><strong>Phone:</strong> 01200744888</p>
                <p><strong>Email:</strong> mabdrabboh@amazonmarine.ltd</p>
                <p><strong>Address:</strong> Villa 129, 2nd District New Cairo, Egypt</p>
                <p><strong>Website:</strong> www.amazonmarine.ltd</p>
            @endif
        </div>
    </div>
</body>
</html>
