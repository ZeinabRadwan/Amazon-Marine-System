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
            padding: 12px 14px;
        }
        .header-logo img {
            width: 200px;
            max-width: 100%;
            height: auto;
            display: block;
        }
        /* Brand: one horizontal row, all white */
        .brand-row-table {
            border-collapse: collapse;
            width: auto;
        }
        .brand-row-table td {
            border: none;
            vertical-align: middle;
            padding: 0 0 0 12px;
        }
        .brand-inline {
            color: #ffffff;
            line-height: 1.4;
            white-space: normal;
        }
        .brand-inline .line-main {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: #ffffff;
        }
        .brand-inline .line-sub {
            font-size: 10px;
            font-weight: 400;
            color: #ffffff;
            margin-left: 0.4em;
        }
        .head-meta {
            text-align: left;
            vertical-align: top;
        }
        .doc-title {
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            margin: 0 0 8px;
            letter-spacing: 0.04em;
            text-align: left;
        }
        table.meta-grid {
            width: 100%;
            border-collapse: collapse;
            color: #ffffff;
            font-size: 9px;
        }
        table.meta-grid td {
            border: none;
            padding: 4px 8px 4px 0;
            vertical-align: top;
            width: 50%;
        }
        .meta-icon {
            display: inline-block;
            width: 13px;
            height: 13px;
            line-height: 13px;
            text-align: center;
            background: #f97316;
            color: #ffffff;
            font-size: 7px;
            font-weight: 700;
            margin-right: 6px;
            vertical-align: middle;
        }
        .meta-item strong {
            color: #ffffff;
            font-weight: 600;
        }
        .meta-val {
            color: #f8fafc;
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
                    <td style="width:55%;">
                        <table class="brand-row-table">
                            <tr>
                                <td style="padding-left:0;vertical-align:middle;width:200px;" class="header-logo">
                                    @if($logoSrc)
                                        <img src="{{ $logoSrc }}" alt="">
                                    @else
                                        <div style="width:200px;height:48px;background:#fff;border:1px solid #f97316;text-align:center;line-height:48px;font-size:9px;color:#1f2a60;">LOGO</div>
                                    @endif
                                </td>
                                <td style="vertical-align:middle;">
                                    <div class="brand-inline">
                                        <span class="line-main">AMAZON MARINE</span><span class="line-sub">Shipping and Logistics Solutions</span>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="head-meta" style="width:45%;">
                        <div class="doc-title">SD - Shipping Details Form</div>
                        <table class="meta-grid">
                            <tr>
                                <td>
                                    <span class="meta-icon">#</span>
                                    <span class="meta-item"><strong>SD No:</strong> <span class="meta-val">{{ $form->sd_number ?? ('SD-'.$form->id) }}</span></span>
                                </td>
                                <td>
                                    <span class="meta-icon">D</span>
                                    <span class="meta-item"><strong>SD Date:</strong> <span class="meta-val">{{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</span></span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span class="meta-icon">V</span>
                                    <span class="meta-item"><strong>Vessel Date:</strong> <span class="meta-val">{{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</span></span>
                                </td>
                                <td dir="auto" style="text-align:left;">
                                    <span class="meta-icon">C</span>
                                    <span class="meta-item"><strong>Client:</strong> <span class="meta-val">{{ $form->client?->name ?? '—' }}</span></span>
                                </td>
                            </tr>
                        </table>
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
