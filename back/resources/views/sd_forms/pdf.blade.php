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
            color: #0f172a;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
            line-height: 1.45;
            background: #ffffff;
        }
        .wrap {
            padding: 0;
        }
        /* Navy header band */
        table.header-band {
            width: 100%;
            border-collapse: collapse;
            background: #1f2a60;
            margin: 0 0 14px;
        }
        table.header-band td {
            border: none;
            vertical-align: middle;
            padding: 12px 16px;
        }
        .logo-badge-wrap {
            width: 44px;
            height: 44px;
            background: #ffffff;
            text-align: center;
            vertical-align: middle;
            border: 2px solid #f97316;
            border-radius: 50%;
            overflow: hidden;
        }
        .logo-badge-wrap img {
            width: 30px;
            height: auto;
            max-height: 32px;
            display: block;
            margin: 6px auto 0;
        }
        .brand-block .name {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: #ffffff;
            margin: 0 0 2px;
        }
        .brand-block .tag {
            font-size: 9px;
            color: #e2e8f0;
            margin: 0;
            letter-spacing: 0.04em;
        }
        .head-meta {
            text-align: right;
        }
        .doc-title {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 6px;
            letter-spacing: 0.03em;
        }
        .meta-line {
            margin: 0 0 2px;
            font-size: 9.5px;
            color: #f1f5f9;
        }
        .meta-line strong {
            color: #ffffff;
            font-weight: 600;
        }
        .body-pad {
            padding: 0 14px 16px;
        }
        /* Orange section bars */
        .sec {
            margin: 0 0 10px;
        }
        .sec-h {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #ffffff;
            background: #f97316;
            margin: 0 0 0;
            padding: 6px 10px;
            border-left: 4px solid #1f2a60;
        }
        table.grid {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
        }
        table.grid th,
        table.grid td {
            border: 1px solid #1f2a60;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.grid th {
            background: #ffffff;
            font-size: 9px;
            font-weight: 700;
            color: #1f2a60;
            text-align: left;
        }
        table.grid td {
            font-size: 10px;
            color: #0f172a;
            background: #eef1f6;
        }
        .lbl {
            color: #1f2a60;
            font-weight: 600;
        }
        .cell-muted {
            color: #94a3b8;
        }
        .block-text {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .notes {
            border: 1px solid #1f2a60;
            border-top: none;
            background: #eef1f6;
            padding: 8px 10px;
            margin-top: 0;
            font-size: 10px;
            line-height: 1.5;
            color: #0f172a;
        }
        .footer {
            margin-top: 12px;
            padding: 10px 14px;
            background: #f1f5f9;
            border-top: 3px solid #f97316;
            font-size: 9px;
            color: #475569;
        }
        .footer-h {
            font-weight: 700;
            color: #1f2a60;
            margin: 0 0 5px;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .footer p { margin: 2px 0; }
        .footer strong { color: #0f172a; }
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
            $notifyDisplayHtml = '<span style="color:#1f2a60;font-style:italic;">Same as consignee</span>';
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
            <table class="header-band">
                <tr>
                    <td style="width:62%;">
                        <table style="width:auto;border-collapse:collapse;">
                            <tr>
                                <td style="border:none;padding:0 12px 0 0;vertical-align:middle;">
                                    <div class="logo-badge-wrap">
                                        @if($logoSrc)
                                            <img src="{{ $logoSrc }}" alt="">
                                        @else
                                            <span style="font-size:8px;color:#64748b;line-height:42px;">AM</span>
                                        @endif
                                    </div>
                                </td>
                                <td class="brand-block" style="border:none;padding:0;vertical-align:middle;">
                                    <p class="name">AMAZON MARINE</p>
                                    <p class="tag">Shipping and Logistics Solutions</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="head-meta" style="width:38%;">
                        <div class="doc-title">SD - Shipping Details Form</div>
                        <p class="meta-line"><strong>SD No:</strong> {{ $form->sd_number ?? ('SD-'.$form->id) }}</p>
                        <p class="meta-line"><strong>SD Date:</strong> {{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</p>
                        <p class="meta-line"><strong>Vessel Date:</strong> {{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</p>
                        <p class="meta-line"><strong>Client:</strong> {{ $form->client?->name ?? '—' }}</p>
                    </td>
                </tr>
            </table>
        @endif

        <div class="body-pad">
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
                            <div><span class="lbl">Email:</span> {{ $form->client->email }}</div>
                        @endif
                        @if($form->client?->phone)
                            <div style="margin-top:3px;"><span class="lbl">Phone:</span> {{ $form->client->phone }}</div>
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
                &nbsp;&nbsp;|&nbsp;&nbsp;
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
    </div>
</body>
</html>
