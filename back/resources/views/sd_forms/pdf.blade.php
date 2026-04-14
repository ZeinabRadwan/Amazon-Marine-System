@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        .pdf-sd-party-cell,
        .pdf-sd-cargo-cell,
        .pdf-sd-notes-cell {
            vertical-align: top;
        }

        .pdf-sd-party-cell {
            min-height: 90px;
        }

        .pdf-sd-cargo-cell {
            min-height: 74px;
        }

        .pdf-sd-notes-cell {
            min-height: 58px;
        }

        .pdf-sd-client-meta {
            font-size: 8.5px;
            color: #64748b;
            margin-top: 6px;
            line-height: 1.45;
        }

        .pdf-sd-ship-ref {
            font-size: 8.5px;
            color: #64748b;
            margin-top: 6px;
            line-height: 1.4;
        }

        .pdf-w-75 {
            width: 75%;
        }

        .pdf-header--sd .pdf-header__brand-line,
        .pdf-header--sd .pdf-header__brand-tag {
            text-transform: none;
            letter-spacing: 0.04em;
        }

        .pdf-sd-doc {
            background: #f4f6f9;
            padding: 6px 4px 12px;
        }

        .pdf-sd-doc .pdf-section {
            margin-bottom: 18px;
        }

        .pdf-sd-doc .pdf-header__title {
            text-transform: uppercase;
            letter-spacing: 0.11em;
            font-size: 13px;
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-section__heading,
        .pdf-sd-doc .pdf-table th,
        .pdf-sd-doc .pdf-header__meta-label,
        .pdf-sd-doc .pdf-footer__title,
        .pdf-sd-doc .pdf-label-strong {
            text-transform: uppercase;
        }

        .pdf-header__brand-contact {
            display: block;
            margin-top: 7px;
            font-size: 8.5px;
            font-weight: 600;
            color: #475569;
            line-height: 1.45;
        }

        .pdf-header__sd-big {
            font-size: 14px;
            font-weight: 700;
            color: #0f2d4a;
            margin: 8px 0 10px;
            line-height: 1.15;
            letter-spacing: 0.06em;
        }

        .pdf-header__date-page-row {
            display: block;
            font-size: 10px;
            line-height: 1.5;
            margin: 0;
            padding: 7px 10px;
            background: #ffffff;
            border: 1px solid #dce3eb;
            border-radius: 6px;
            text-align: inherit;
        }

        /* SD form: cool neutral canvas, navy structure, orange accents (stripe + first header row). */
        .pdf-sd-doc .pdf-header {
            background: #ffffff;
            border: 1px solid #dce3eb;
            border-bottom: 2px solid #0f2d4a;
            padding: 8px 6px 14px;
            margin-bottom: 18px;
            border-radius: 0 0 12px 12px;
        }

        .pdf-sd-doc .pdf-header__table td {
            padding: 6px 6px;
        }

        .pdf-sd-doc .pdf-header__brand-line,
        .pdf-sd-doc .pdf-header__brand-line strong {
            color: #0f2d4a;
            font-size: 15px;
        }

        .pdf-sd-doc .pdf-header__brand-tag {
            color: #334e68;
            opacity: 1;
            font-size: 9px;
        }

        .pdf-sd-doc .pdf-header__sd-big,
        .pdf-sd-doc .pdf-header__meta-label,
        .pdf-sd-doc .pdf-header__meta-val {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__logo-fallback {
            background: #ffffff;
            border: 2px solid #0f2d4a;
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-section__heading {
            background: #ffffff;
            color: #0f2d4a;
            border-top: 1px solid #dce3eb;
            border-right: 1px solid #dce3eb;
            border-left: 4px solid #ec7f00;
            border-bottom: 1px solid #e8eef5;
            padding: 10px 14px 9px;
            font-size: 10px;
            letter-spacing: 0.11em;
            border-radius: 10px 10px 0 0;
            margin: 0;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading {
            border-left: 1px solid #dce3eb;
            border-right: 4px solid #ec7f00;
            border-top: 1px solid #dce3eb;
        }

        .pdf-sd-doc .pdf-table {
            border: 1px solid #dce3eb;
            border-top: none;
            border-radius: 0 0 10px 10px;
            overflow: hidden;
        }

        .pdf-sd-doc .pdf-table th {
            background: #0f2d4a;
            color: #ffffff;
            padding: 10px 12px;
            font-size: 8.75px;
            letter-spacing: 0.07em;
            font-weight: 700;
        }

        .pdf-sd-doc .pdf-table tr:first-child th {
            border-bottom: 2px solid #ec7f00;
        }

        .pdf-sd-doc .pdf-table td {
            background: #ffffff;
            color: #1e293b;
            padding: 10px 12px;
            line-height: 1.52;
            font-size: 10.25px;
        }

        .pdf-sd-doc .pdf-table tbody tr:nth-child(even) td {
            background: #f8fafc;
        }

        .pdf-sd-doc .pdf-table th,
        .pdf-sd-doc .pdf-table td {
            border-color: #dce3eb;
        }

        .pdf-sd-doc .pdf-label-strong {
            color: #123a57;
        }

        .pdf-sd-doc .pdf-text-muted-italic {
            color: #64748b;
        }

        .pdf-sd-doc .pdf-footer {
            background: #ffffff;
            border: 1px solid #dce3eb;
            border-top: 2px solid #0f2d4a;
            color: #334155;
            border-radius: 10px;
            margin-top: 10px;
        }

        .pdf-sd-doc .pdf-footer__title {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-footer--contact .pdf-footer__title {
            border-bottom-color: #ec7f00;
        }

        .pdf-sd-doc .pdf-footer strong {
            color: #0f2d4a;
        }
    </style>
@endpush

@section('pdf_title')
{{ $labels['doc_title'] }} · {{ $form->sd_number ?? ('SD-'.$form->id) }}
@endsection

@section('content')
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
            $notifyDisplayHtml = '<span class="pdf-text-muted-italic">'.$labels['same_as_consignee'].'</span>';
        } else {
            $notifyDisplayHtml = '—';
        }

        $consigneeHtml = $consignee === '—' ? '—' : nl2br(e($consigneeRaw));

        $shipperRaw = trim((string) ($form->shipper_info ?? ''));
        $shipperHtml = $shipperRaw !== '' ? nl2br(e($shipperRaw)) : '—';

        $containerType = trim((string) ($form->container_type ?? ''));
        $containerTypeCell = $containerType !== '' ? $containerType : '—';
        $containerSizeCell = trim((string) ($form->container_size ?? '')) !== '' ? trim((string) $form->container_size) : '—';
        $numContainersCell = $form->num_containers !== null ? (string) $form->num_containers : '—';

        $bl = trim((string) ($form->linkedShipment?->bl_number ?? ''));
        $bk = trim((string) ($form->linkedShipment?->booking_number ?? ''));
        if ($bl !== '') {
            $vesselRef = $bl;
        } elseif ($bk !== '') {
            $vesselRef = $bk;
        } else {
            $vesselRef = '';
        }

        $shippingLineName = trim((string) ($form->shippingLine?->name ?? ''));
        if ($shippingLineName === '') {
            $shippingLineName = trim((string) ($form->shipping_line ?? ''));
        }
        $shippingLineName = $shippingLineName !== '' ? $shippingLineName : '—';

        $grossW = $form->total_gross_weight;
        $netW = $form->total_net_weight;
        $grossDisplay = $grossW !== null && (string) $grossW !== '' ? rtrim(rtrim((string) $grossW, '0'), '.').' KG' : '—';
        $netDisplay = $netW !== null && (string) $netW !== '' ? rtrim(rtrim((string) $netW, '0'), '.').' KG' : '—';

        $reeferBits = [];
        if ($form->reefer_temp !== null && (string) $form->reefer_temp !== '') {
            $reeferBits[] = $labels['lbl_temp'].': '.$form->reefer_temp;
        }
        if (trim((string) ($form->reefer_vent ?? '')) !== '') {
            $reeferBits[] = $labels['lbl_vent'].': '.$form->reefer_vent;
        }
        if ($form->reefer_hum !== null && (string) $form->reefer_hum !== '') {
            $reeferBits[] = $labels['lbl_humidity'].': '.$form->reefer_hum;
        }
        $reeferLine = $reeferBits !== [] ? implode(' · ', $reeferBits) : '';

        $notesBody = trim((string) ($form->notes ?? ''));
        $extraLines = [];
        if ($form->shipment_direction === 'Import' && ! empty($form->acid_number)) {
            $extraLines[] = '<span class="pdf-label-strong">'.$labels['acid'].':</span> '.e($form->acid_number);
        }
        if ($reeferLine !== '') {
            $extraLines[] = '<span class="pdf-label-strong">'.$labels['lbl_reefer'].':</span> '.e($reeferLine);
        }
        $notesHtmlParts = [];
        if ($notesBody !== '') {
            $notesHtmlParts[] = nl2br(e($notesBody));
        }
        if ($extraLines !== []) {
            $notesHtmlParts[] = implode('<br>', $extraLines);
        }
        $notesBlockHtml = $notesHtmlParts !== [] ? implode('<br><br>', $notesHtmlParts) : '—';

        $clientName = $form->client?->name ?? '—';
        $salesRepName = $form->salesRep?->name ?? '—';
        $sdNum = $form->sd_number ?? ('SD-'.$form->id);
        $shipmentDirection = trim((string) ($form->shipment_direction ?? ''));
        $shipmentDirection = $shipmentDirection !== '' ? $shipmentDirection : '—';
        $freightTerm = trim((string) ($form->freight_term ?? ''));
        $freightTerm = $freightTerm !== '' ? $freightTerm : '—';
        $vesselDateStr = optional($form->requested_vessel_date)->format('d/m/Y') ?? '—';
        $documentDateStr = optional($form->created_at)->format('d/m/Y') ?? '—';

        $logoSrc = \App\Support\PdfLogo::imgSrc();
    @endphp

    <div class="pdf-sd-doc">

    @if(!empty($headerHtml))
        {!! $headerHtml !!}
    @else
        <header class="pdf-header pdf-header--branded pdf-header--sd">
            <table class="pdf-header__table">
                <tr>
                    <td class="pdf-header__logo">
                        @if($logoSrc)
                            <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                        @else
                            <div class="pdf-header__logo-fallback">MH</div>
                        @endif
                    </td>
                    <td class="pdf-header__brand-cell">
                        <div class="pdf-header__brand-stack">
                            <div class="pdf-header__brand-line"><strong>{{ $labels['brand'] }}</strong></div>
                            <div class="pdf-header__brand-tag">{{ $labels['brand_tag'] }}</div>
                            <span class="pdf-header__brand-contact">{{ $labels['brand_contact'] }}</span>
                        </div>
                    </td>
                    <td class="pdf-header__doc">
                        <p class="pdf-header__title">{{ $labels['doc_title'] }}</p>
                        <div class="pdf-header__sd-big">{{ $sdNum }}</div>
                        <div class="pdf-header__meta-list">
                            <div class="pdf-header__date-page-row">
                                <span class="pdf-header__meta-label">{{ $labels['lbl_document_date'] }}</span>
                                <span class="pdf-header__meta-val">{{ $documentDateStr }}</span>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>
        </header>
    @endif

    {{-- 1. Client & Sales Representative --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_1_client_sales'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-40">{{ $labels['lbl_client_name'] }}</th>
                <th class="pdf-w-40">{{ $labels['lbl_sales_rep'] }}</th>
                <th class="pdf-w-20">{{ $labels['lbl_sd_number'] }}</th>
            </tr>
            <tr>
                <td class="pdf-cell-dir-auto">
                    {{ $clientName }}
                    @if($form->client?->email || $form->client?->phone)
                        <div class="pdf-sd-client-meta">
                            @if($form->client?->email)
                                <div><span class="pdf-label-strong">{{ $labels['email'] }}</span> {{ $form->client->email }}</div>
                            @endif
                            @if($form->client?->phone)
                                <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['phone'] }}</span> {{ $form->client->phone }}</div>
                            @endif
                        </div>
                    @endif
                </td>
                <td class="pdf-cell-dir-auto">{{ $salesRepName }}</td>
                <td>{{ $sdNum }}</td>
            </tr>
        </table>
    </div>

    {{-- 2. Shipment Basic Information --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_2_shipment_basic'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-25">{{ $labels['lbl_pol_full'] }}</th>
                <th class="pdf-w-25">{{ $labels['lbl_pod_full'] }}</th>
                <th class="pdf-w-25">{{ $labels['final_destination'] }}</th>
                <th class="pdf-w-25">{{ $labels['lbl_shipment_direction'] }}</th>
            </tr>
            <tr>
                <td>{{ $pol }}</td>
                <td>{{ $pod }}</td>
                <td>{{ $finalDestination }}</td>
                <td>{{ $shipmentDirection }}</td>
            </tr>
            <tr>
                <th colspan="2">{{ $labels['shipping_line'] }}</th>
                <th>{{ $labels['lbl_requested_vessel_date'] }}</th>
                <th>{{ $labels['freight_on_board'] }}</th>
            </tr>
            <tr>
                <td colspan="2">
                    {{ $shippingLineName }}
                    @if($vesselRef !== '')
                        <div class="pdf-sd-ship-ref"><span class="pdf-label-strong">{{ $labels['lbl_shipping_ref'] }}:</span> {{ $vesselRef }}</div>
                    @endif
                </td>
                <td>{{ $vesselDateStr }}</td>
                <td>{{ $freightTerm }}</td>
            </tr>
        </table>
    </div>

    {{-- 3. Parties Information --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_3_parties'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-40">{{ $labels['lbl_shipper_info'] }}</th>
                <th class="pdf-w-40">{{ $labels['lbl_consignee_info'] }}</th>
                <th class="pdf-w-20">{{ $labels['notify_party'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text pdf-sd-party-cell">{!! $shipperHtml !!}</td>
                <td class="pdf-block-text pdf-sd-party-cell">{!! $consigneeHtml !!}</td>
                <td class="pdf-block-text pdf-sd-party-cell">{!! $notifyDisplayHtml !!}</td>
            </tr>
        </table>
    </div>

    {{-- 4. Container Details --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_4_container'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-33">{{ $labels['container_type'] }}</th>
                <th class="pdf-w-33">{{ $labels['lbl_container_size'] }}</th>
                <th class="pdf-w-33">{{ $labels['lbl_num_containers'] }}</th>
            </tr>
            <tr>
                <td>{{ $containerTypeCell }}</td>
                <td>{{ $containerSizeCell }}</td>
                <td>{{ $numContainersCell }}</td>
            </tr>
        </table>
    </div>

    {{-- 5. Cargo Information --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_5_cargo'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-75">{{ $labels['lbl_cargo_description'] }}</th>
                <th class="pdf-w-25">{{ $labels['hs_code'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text pdf-sd-cargo-cell">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
                <td class="pdf-sd-cargo-cell">{{ $form->hs_code ?? '—' }}</td>
            </tr>
        </table>
    </div>

    {{-- 6. Weight Details --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_6_weight'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-50">{{ $labels['lbl_total_gross_kg'] }}</th>
                <th class="pdf-w-50">{{ $labels['lbl_total_net_kg'] }}</th>
            </tr>
            <tr>
                <td>{{ $grossDisplay }}</td>
                <td>{{ $netDisplay }}</td>
            </tr>
        </table>
    </div>

    {{-- 7. Additional Notes --}}
    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_7_notes'] }}</p>
        <table class="pdf-table">
            <tr>
                <th>{{ $labels['lbl_notes_instructions'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text pdf-sd-notes-cell">{!! $notesBlockHtml !!}</td>
            </tr>
        </table>
    </div>

    @if(!empty($footerHtml))
        <footer class="pdf-footer">
            {!! $footerHtml !!}
        </footer>
    @endif

    </div>
@endsection

@push('pdf_footer_fullbleed')
    @if($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
        <table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-footer-fullbleed__cell">
                    <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
                </td>
            </tr>
        </table>
    @endif
@endpush
