@extends('pdf.layouts.master')

@push('pdf_head')
    <style>
        @include('pdf.partials.sd_branded_document_skin')
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

        $directionNorm = trim((string) ($form->shipment_direction ?? ''));
        $isImport = strcasecmp($directionNorm, 'Import') === 0;
        $isReeferType = str_contains(strtolower($containerType), 'reefer');
        $headerVariant = $isReeferType ? 'reefer' : 'import';

        $acidDisplayRaw = trim((string) ($form->acid_number ?? ''));
        $acidDisplay = $acidDisplayRaw !== '' ? $acidDisplayRaw : '—';

        $formatReeferValue = static function ($value, string $unit): string {
            $raw = trim((string) $value);
            if ($raw === '') {
                return '—';
            }
            $normalized = rtrim(rtrim($raw, '0'), '.');
            if (preg_match('/' . preg_quote($unit, '/') . '/iu', $raw)) {
                return $raw;
            }

            return $normalized . ' ' . $unit;
        };

        $tempDisplay = $formatReeferValue($form->reefer_temp, $labels['unit_celsius'] ?? '°C');
        $ventDisplay = $formatReeferValue($form->reefer_vent, $labels['unit_cbm_h'] ?? 'CBM/H');
        $humDisplay = $formatReeferValue($form->reefer_hum, $labels['unit_percent'] ?? '%');

        $notesBody = trim((string) ($form->notes ?? ''));
        $notesBlockHtml = $notesBody !== '' ? nl2br(e($notesBody)) : '—';

        $clientName = $form->client?->name ?? '—';
        $salesRepName = $form->salesRep?->name ?? '—';
        $sdNum = $form->sd_number ?? 'SD-' . $form->id;
        $shipmentDirection = $directionNorm !== '' ? $directionNorm : '—';
        $freightTerm = trim((string) ($form->freight_term ?? ''));
        $freightTerm = $freightTerm !== '' ? $freightTerm : '—';
        $vesselDateStr = optional($form->requested_vessel_date)->format('d/m/Y') ?? '—';
        $documentDateStr = optional($form->created_at)->format('d/m/Y') ?? '—';

        $logoSrc = \App\Support\PdfLogo::imgSrc();
        $footerBadgeParts = array_filter([
            $isImport ? ($labels['badge_import'] ?? 'IMPORT') : null,
            $isReeferType ? ($labels['badge_reefer'] ?? 'REEFER') : null,
        ]);
        $footerBadgeText = $footerBadgeParts !== []
            ? implode(' | ', $footerBadgeParts) . ' | ' . $sdNum
            : $sdNum;
        $footerYear = now()->year;
    @endphp

    <div class="pdf-sd-doc pdf-sd-doc--{{ $headerVariant }}">

        @if (!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <header class="pdf-header pdf-header--branded pdf-header--sd pdf-header--sd-banner">
                <table class="pdf-header__table" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        @if ($logoSrc)
                            <td class="pdf-header__logo-cell">
                                <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                            </td>
                        @endif
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
                            <div class="pdf-header__meta-line">
                                {{ $labels['lbl_document_date'] }} {{ $documentDateStr }}
                                &nbsp;&nbsp; Page 1 of 1
                            </div>
                            @if ($isImport || $isReeferType)
                                <div class="pdf-sd-header-badges">
                                    @if ($isImport)
                                        <span class="pdf-sd-badge">{{ $labels['badge_import'] }}</span>
                                    @endif
                                    @if ($isReeferType)
                                        <span class="pdf-sd-badge">{{ $labels['badge_reefer'] }}</span>
                                    @endif
                                </div>
                            @endif
                        </td>
                    </tr>
                </table>
            </header>
        @endif

        <div class="pdf-sd-body">

        {{-- Client & Sales Representative --}}
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

        {{-- Shipment Basic Information --}}
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

        {{-- Party Information --}}
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

        {{-- Container Details --}}
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

        {{-- Cargo Information --}}
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

        {{-- Weight Details --}}
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

        @if ($isReeferType)
            <div class="pdf-section">
                <p class="pdf-section__heading pdf-section__heading--reefer-details">{{ $labels['sec_reefer_details'] }}</p>
                <table class="pdf-table">
                    <tr>
                        <th class="pdf-w-33 pdf-sd-cell--reefer-label">{{ $labels['lbl_temp_long'] }}</th>
                        <th class="pdf-w-33 pdf-sd-cell--reefer-label">{{ $labels['lbl_vent_long'] }}</th>
                        <th class="pdf-w-33 pdf-sd-cell--reefer-label">{{ $labels['lbl_humidity_long'] }}</th>
                    </tr>
                    <tr>
                        <td class="pdf-sd-cell--reefer">{{ $tempDisplay }}</td>
                        <td class="pdf-sd-cell--reefer">{{ $ventDisplay }}</td>
                        <td class="pdf-sd-cell--reefer">{{ $humDisplay }}</td>
                    </tr>
                </table>
            </div>
        @else
            <div class="pdf-section">
                <p class="pdf-section__heading">{{ $labels['sec_additional_details'] }}</p>
                <table class="pdf-table">
                    <tr>
                        <td class="pdf-block-text pdf-sd-notes-cell">—</td>
                    </tr>
                </table>
            </div>
        @endif

        @if ($isImport)
            <div class="pdf-section">
                <p class="pdf-section__heading pdf-section__heading--import-customs">{{ $labels['sec_import_customs'] }}</p>
                <table class="pdf-table">
                    <tr>
                        <th class="pdf-w-50 pdf-sd-cell--import-label">{{ $labels['lbl_acid_number'] }}</th>
                        <th class="pdf-w-50"></th>
                    </tr>
                    <tr>
                        <td class="pdf-sd-cell--import">{{ $acidDisplay }}</td>
                        <td></td>
                    </tr>
                </table>
            </div>
        @endif

        <div class="pdf-section">
            <p class="pdf-section__heading">{{ $labels['sec_additional_notes'] }}</p>
            <table class="pdf-table">
                <tr>
                    <th>{{ $labels['lbl_notes_instructions'] }}</th>
                </tr>
                <tr>
                    <td class="pdf-block-text pdf-sd-notes-cell">{!! $notesBlockHtml !!}</td>
                </tr>
            </table>
        </div>

        </div>

        <footer class="pdf-sd-footer-bar">
            <table class="pdf-sd-footer-bar__table" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                    <td>{{ $labels['brand'] }} &copy; {{ $footerYear }} &nbsp;|&nbsp; Version 1.0</td>
                    <td class="pdf-sd-footer-bar__right">{{ $footerBadgeText }}</td>
                </tr>
            </table>
        </footer>

        @if (!empty($footerHtml))
            <footer class="pdf-footer">
                {!! $footerHtml !!}
            </footer>
        @endif

    </div>
@endsection

