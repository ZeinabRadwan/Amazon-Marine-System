@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        .pdf-sd-party-cell,
        .pdf-sd-cargo-cell,
        .pdf-sd-notes-cell {
            vertical-align: top;
        }

        .pdf-sd-party-cell {
            min-height: 88px;
        }

        .pdf-sd-cargo-cell {
            min-height: 72px;
        }

        .pdf-sd-notes-cell {
            min-height: 56px;
        }

        .pdf-sd-client-meta {
            font-size: 8.5px;
            color: #666666;
            margin-top: 5px;
            line-height: 1.4;
        }

        .pdf-sd-ship-ref {
            font-size: 8.5px;
            color: #666666;
            margin-top: 5px;
            line-height: 1.35;
        }

        .pdf-w-75 {
            width: 75%;
        }

        .pdf-header--sd .pdf-header__brand-line,
        .pdf-header--sd .pdf-header__brand-tag {
            text-transform: none;
            letter-spacing: 0.06em;
        }

        .pdf-sd-doc .pdf-header__title {
            text-transform: uppercase;
            letter-spacing: 0.06em;
            font-size: 14px;
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
            margin-top: 6px;
            font-size: 8.5px;
            font-weight: 600;
            color: #11354d;
            line-height: 1.4;
            opacity: 0.9;
        }

        .pdf-header__sd-big {
            font-size: 15px;
            font-weight: 700;
            color: #11354d;
            margin: 6px 0 8px;
            line-height: 1.2;
        }

        .pdf-header__date-page-row {
            display: block;
            font-size: 10px;
            line-height: 1.55;
            margin: 0 0 5px;
            padding: 0 0 5px;
            border-bottom: 1px solid #e2e8f0;
            text-align: inherit;
        }

        /*
             | SD form only: white surfaces, navy (#0f2d4a) as primary, orange (#ec7f00) only as
             | thin accents (section stripe). Scoped to .pdf-sd-doc — does not alter shared theme
             | or the full-bleed header/footer images outside this wrapper.
             */
        .pdf-sd-doc .pdf-header {
            background: #ffffff;
            border-bottom: 3px solid #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__brand-line,
        .pdf-sd-doc .pdf-header__brand-line strong {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__brand-tag {
            color: #11354d;
            opacity: 0.9;
        }

        .pdf-sd-doc .pdf-header__title {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__sd-big,
        .pdf-sd-doc .pdf-header__meta-label,
        .pdf-sd-doc .pdf-header__meta-val {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__logo-fallback {
            background: #ffffff;
            border-color: #0f2d4a;
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__brand-contact {
            color: #11354d;
        }

        .pdf-sd-doc .pdf-section__heading {
            background: #0f2d4a;
            color: #ffffff;
            border-left: 4px solid #ec7f00;
            font-weight: 700;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading {
            border-left: none;
            border-right: 4px solid #ec7f00;
        }

        .pdf-sd-doc .pdf-table th {
            background: #eaf0f6;
            /* light blue-gray */
            color: #0f2d4a;
            /* navy text */
            font-weight: 600;
        }

        .pdf-sd-doc .pdf-table td {
            background: #ffffff;
            color: #333333;
        }

        .pdf-sd-doc .pdf-table tbody tr:nth-child(even) td {
            background: #f8f9fb;
        }

        .pdf-sd-doc .pdf-table {
            border-color: #e2e8f0;
        }

        .pdf-sd-doc .pdf-table th,
        .pdf-sd-doc .pdf-table td {
            border-color: #e2e8f0;
        }

        .pdf-sd-doc .pdf-label-strong {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-footer {
            background: #ffffff;
            border-top: 3px solid #0f2d4a;
            color: #333333;
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

        .pdf-sd-header-badges {
            margin-top: 6px;
            line-height: 1.35;
        }

        .pdf-sd-badge {
            display: inline-block;
            font-size: 8px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 3px;
            margin-inline-end: 6px;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }

        .pdf-sd-badge--import {
            background: #0f2d4a;
            color: #ffffff;
        }

        .pdf-sd-badge--reefer {
            background: #0d3d2e;
            color: #ffffff;
        }

        .pdf-sd-doc .pdf-section__heading--import-customs {
            border-left-color: #185fa5;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading--import-customs {
            border-right-color: #185fa5;
        }

        .pdf-sd-doc .pdf-section__heading--reefer-details {
            border-left-color: #0f6e56;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading--reefer-details {
            border-right-color: #0f6e56;
        }

        .pdf-sd-doc .pdf-table td.pdf-sd-cell--import {
            background: #e6f1fb !important;
        }

        .pdf-sd-doc .pdf-table td.pdf-sd-cell--reefer {
            background: #e1f5ee !important;
        }
    </style>
@endpush

@section('pdf_title')
    {{ $labels['doc_title'] }} · {{ $form->sd_number ?? 'SD-' . $form->id }}
@endsection

@section('content')
    @php
        $pol = $form->pol?->name ?? ($form->pol_text ?? '—');
        $pod = $form->pod?->name ?? ($form->pod_text ?? '—');
        $finalDestination = $form->final_destination ?? '—';
        $consigneeRaw = trim((string) ($form->consignee_info ?? ''));
        $consignee = $consigneeRaw !== '' ? $consigneeRaw : '—';

        $notifyMode = strtolower((string) ($form->notify_party_mode ?? ''));
        $notifyDetailsRaw = trim((string) ($form->notify_party_details ?? ''));

        if ($notifyDetailsRaw !== '') {
            $notifyDisplayHtml = nl2br(e($notifyDetailsRaw));
        } elseif ($notifyMode === 'same') {
            $notifyDisplayHtml = '<span class="pdf-text-muted-italic">' . $labels['same_as_consignee'] . '</span>';
        } else {
            $notifyDisplayHtml = '—';
        }

        $consigneeHtml = $consignee === '—' ? '—' : nl2br(e($consigneeRaw));

        $shipperRaw = trim((string) ($form->shipper_info ?? ''));
        $shipperHtml = $shipperRaw !== '' ? nl2br(e($shipperRaw)) : '—';

        $containerType = trim((string) ($form->container_type ?? ''));
        $containerTypeCell = $containerType !== '' ? $containerType : '—';
        $containerSizeCell =
            trim((string) ($form->container_size ?? '')) !== '' ? trim((string) $form->container_size) : '—';
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
        $grossDisplay =
            $grossW !== null && (string) $grossW !== '' ? rtrim(rtrim((string) $grossW, '0'), '.') . ' KG' : '—';
        $netDisplay = $netW !== null && (string) $netW !== '' ? rtrim(rtrim((string) $netW, '0'), '.') . ' KG' : '—';

        $reeferBits = [];
        if ($form->reefer_temp !== null && (string) $form->reefer_temp !== '') {
            $reeferBits[] = $labels['lbl_temp'] . ': ' . $form->reefer_temp;
        }
        if (trim((string) ($form->reefer_vent ?? '')) !== '') {
            $reeferBits[] = $labels['lbl_vent'] . ': ' . $form->reefer_vent;
        }
        if ($form->reefer_hum !== null && (string) $form->reefer_hum !== '') {
            $reeferBits[] = $labels['lbl_humidity'] . ': ' . $form->reefer_hum;
        }
        $reeferLine = $reeferBits !== [] ? implode(' · ', $reeferBits) : '';

        $directionNorm = trim((string) ($form->shipment_direction ?? ''));
        $isImport = strcasecmp($directionNorm, 'Import') === 0;
        $ctLower = strtolower($containerType);
        $isReeferType = str_contains($ctLower, 'reefer');
        $hasReeferData = ($form->reefer_temp !== null && (string) $form->reefer_temp !== '')
            || trim((string) ($form->reefer_vent ?? '')) !== ''
            || ($form->reefer_hum !== null && (string) $form->reefer_hum !== '');
        $isReefer = $isReeferType || $hasReeferData;

        $sectionNum = 7;
        $importSectionNum = null;
        $reeferSectionNum = null;
        if ($isImport) {
            $importSectionNum = $sectionNum++;
        }
        if ($isReefer) {
            $reeferSectionNum = $sectionNum++;
        }
        $notesSectionNum = $sectionNum;

        $acidDisplayRaw = trim((string) ($form->acid_number ?? ''));
        $acidDisplay = $acidDisplayRaw !== '' ? $acidDisplayRaw : '—';

        $tempDisplay = ($form->reefer_temp !== null && (string) $form->reefer_temp !== '')
            ? rtrim(rtrim((string) $form->reefer_temp, '0'), '.') . ' °C'
            : '—';
        $ventDisplay = trim((string) ($form->reefer_vent ?? '')) !== '' ? (string) $form->reefer_vent : '—';
        $humDisplay = ($form->reefer_hum !== null && (string) $form->reefer_hum !== '')
            ? rtrim(rtrim((string) $form->reefer_hum, '0'), '.') . ' %'
            : '—';

        $notesBody = trim((string) ($form->notes ?? ''));
        $extraLines = [];
        if (! $isImport && ! empty($form->acid_number)) {
            $extraLines[] = '<span class="pdf-label-strong">' . $labels['acid'] . ':</span> ' . e($form->acid_number);
        }
        if (! $isReefer && $reeferLine !== '') {
            $extraLines[] = '<span class="pdf-label-strong">' . $labels['lbl_reefer'] . ':</span> ' . e($reeferLine);
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
        $sdNum = $form->sd_number ?? 'SD-' . $form->id;
        $shipmentDirection = $directionNorm !== '' ? $directionNorm : '—';
        $freightTerm = trim((string) ($form->freight_term ?? ''));
        $freightTerm = $freightTerm !== '' ? $freightTerm : '—';
        $vesselDateStr = optional($form->requested_vessel_date)->format('d/m/Y') ?? '—';
        $documentDateStr = optional($form->created_at)->format('d/m/Y') ?? '—';

        $logoSrc = \App\Support\PdfLogo::imgSrc();
    @endphp

    <div class="pdf-sd-doc">

        @if (!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <header class="pdf-header pdf-header--branded pdf-header--sd">
                <table class="pdf-header__table">
                    <tr>
                        <td class="pdf-header__logo">
                            @if ($logoSrc)
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
                            @if($isImport || $isReefer)
                                <div class="pdf-sd-header-badges">
                                    @if($isImport)
                                        <span class="pdf-sd-badge pdf-sd-badge--import">{{ $labels['badge_import'] }}</span>
                                    @endif
                                    @if($isReefer)
                                        <span class="pdf-sd-badge pdf-sd-badge--reefer">{{ $labels['badge_reefer'] }}</span>
                                    @endif
                                </div>
                            @endif
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
                        @if ($form->client?->email || $form->client?->phone)
                            <div class="pdf-sd-client-meta">
                                @if ($form->client?->email)
                                    <div><span class="pdf-label-strong">{{ $labels['email'] }}</span>
                                        {{ $form->client->email }}</div>
                                @endif
                                @if ($form->client?->phone)
                                    <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['phone'] }}</span>
                                        {{ $form->client->phone }}</div>
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
                        @if ($vesselRef !== '')
                            <div class="pdf-sd-ship-ref"><span
                                    class="pdf-label-strong">{{ $labels['lbl_shipping_ref'] }}:</span> {{ $vesselRef }}
                            </div>
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

    @if($isImport)
        <div class="pdf-section">
            <p class="pdf-section__heading pdf-section__heading--import-customs">{{ $importSectionNum }}. {{ $labels['sec_import_customs'] }}</p>
            <table class="pdf-table">
                <tr>
                    <th colspan="2">{{ $labels['lbl_acid_number'] }}</th>
                </tr>
                <tr>
                    <td colspan="2" class="pdf-block-text pdf-sd-cell--import">{{ $acidDisplay }}</td>
                </tr>
            </table>
        </div>
    @endif

    @if($isReefer)
        <div class="pdf-section">
            <p class="pdf-section__heading pdf-section__heading--reefer-details">{{ $reeferSectionNum }}. {{ $labels['sec_reefer_details'] }}</p>
            <table class="pdf-table">
                <tr>
                    <th class="pdf-w-33">{{ $labels['lbl_temp_long'] }}</th>
                    <th class="pdf-w-33">{{ $labels['lbl_vent_long'] }}</th>
                    <th class="pdf-w-33">{{ $labels['lbl_humidity_long'] }}</th>
                </tr>
                <tr>
                    <td class="pdf-sd-cell--reefer">{{ $tempDisplay }}</td>
                    <td class="pdf-sd-cell--reefer">{{ $ventDisplay }}</td>
                    <td class="pdf-sd-cell--reefer">{{ $humDisplay }}</td>
                </tr>
            </table>
        </div>
    @endif

    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $notesSectionNum }}. {{ $labels['sec_additional_notes'] }}</p>
        <table class="pdf-table">
            <tr>
                <th>{{ $labels['lbl_notes_instructions'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text pdf-sd-notes-cell">{!! $notesBlockHtml !!}</td>
            </tr>
        </table>
    </div>

        @if (!empty($footerHtml))
            <footer class="pdf-footer">
                {!! $footerHtml !!}
            </footer>
        @endif

    </div>
@endsection

@push('pdf_footer_fullbleed')
    @if ($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
        <table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0"
            role="presentation">
            <tr>
                <td class="pdf-footer-fullbleed__cell">
                    <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
                </td>
            </tr>
        </table>
    @endif
@endpush
