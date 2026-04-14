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

        $logoSrc = \App\Support\PdfLogo::imgSrc();
    @endphp

    @if(!empty($headerHtml))
        {!! $headerHtml !!}
    @else
        <header class="pdf-header pdf-header--branded">
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
                        </div>
                    </td>
                    <td class="pdf-header__doc">
                        <p class="pdf-header__title">{{ $labels['doc_title'] }}</p>
                        <div class="pdf-header__meta-list">
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['sd_no'] }}</span>
                                <span class="pdf-header__meta-val">{{ $sdNum }}</span>
                            </div>
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['sd_date'] }}</span>
                                <span class="pdf-header__meta-val">{{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</span>
                            </div>
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['vessel_date'] }}</span>
                                <span class="pdf-header__meta-val">{{ $vesselDateStr }}</span>
                            </div>
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['client'] }}</span>
                                <span class="pdf-header__meta-val pdf-cell-dir-auto">{{ $clientName }}</span>
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

    <footer class="pdf-footer @if(empty($footerHtml)) pdf-footer--contact @endif">
        @if(!empty($footerHtml))
            {!! $footerHtml !!}
        @else
            <p class="pdf-footer__title">{{ $labels['footer_contact'] }}</p>
            <table class="footer-contact-grid" width="100%" cellspacing="0" cellpadding="0" border="0" dir="ltr" role="presentation">
                <colgroup>
                    <col width="25%" />
                    <col width="25%" />
                    <col width="25%" />
                    <col width="25%" />
                </colgroup>
                <tr>
                    <td class="footer-contact-grid__cell footer-contact-grid__cell--first" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74 0-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.2c.27-.27.35-.66.24-1.02A17.32 17.32 0 0 1 4.5 3 2 2 0 0 0 2.5 5v3a19.79 19.79 0 0 0 3.07 8.63 19.51 19.51 0 0 0 6 6 19.79 19.79 0 0 0 8.63 3.07 2 2 0 0 0 2-2v-1.5c0-1.1-.9-2-2-2z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">01200744888</td>
                            </tr>
                        </table>
                    </td>
                    <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 7.55L4.06 6h15.88L12 11.55zM20 18V8.44l-8 5.06-8-5.06V18h16z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">mabdrabboh@amazonmarine.ltd</td>
                            </tr>
                        </table>
                    </td>
                    <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">Villa 129, 2nd District New Cairo, Egypt</td>
                            </tr>
                        </table>
                    </td>
                    <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M5 4h14v11H5V4zm1 2h12v7H6V6zm3 12h6v2H9v-2z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">www.amazonmarine.ltd</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        @endif
    </footer>
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
