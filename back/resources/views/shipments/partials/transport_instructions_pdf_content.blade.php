@php
    /** @var \App\Models\Shipment $shipment */
    /** @var array<string, mixed> $tiProfile */
    /** @var array<string, string> $labels */
    $ti = is_array($tiProfile ?? null) ? $tiProfile : [];
    $tiVal = static function ($k) use ($ti) {
        $v = $ti[$k] ?? null;

        return $v !== null && $v !== '' ? $v : '—';
    };
    $doc = (string) ($ti['customs_document_type'] ?? '');
    $docLbl = match ($doc) {
        'certificate' => $labels['ti_doc_certificate'] ?? $doc,
        'bill_of_lading' => $labels['ti_doc_bl'] ?? $doc,
        'manifest' => $labels['ti_doc_manifest'] ?? $doc,
        default => '—',
    };
    $gen = ($ti['generator'] ?? 'no') === 'yes' ? ($labels['ti_gen_yes'] ?? 'Yes') : ($labels['ti_gen_no'] ?? 'No');
    $brokerName = '—';
    $bid = $ti['approved_customs_broker_id'] ?? null;
    if ($bid) {
        $bv = \App\Models\Vendor::query()->find((int) $bid);
        $brokerName = $bv?->name ?? '—';
    }
    $arrivalDisp = '—';
    $arrRaw = $ti['customer_arrival_at'] ?? null;
    if ($arrRaw) {
        try {
            $arrivalDisp = \Illuminate\Support\Carbon::parse($arrRaw)->format('d/m/Y H:i');
        } catch (\Throwable $e) {
            $arrivalDisp = (string) $arrRaw;
        }
    }
    $tiPdfRtl = (bool) preg_match('/\p{Arabic}/u', (string) ($labels['booking_number'] ?? ''));
    $mapsRaw = trim((string) ($ti['loading_maps_url'] ?? ''));
    $mapsIsLink = $mapsRaw !== '' && preg_match('#^https?://#i', $mapsRaw);
    $ccParts = array_filter([
        $shipment->container_count !== null && $shipment->container_count !== '' ? (string) $shipment->container_count : null,
        filled($shipment->container_size) ? (string) $shipment->container_size : null,
        filled($shipment->container_type) ? (string) $shipment->container_type : null,
    ]);
    $containerSummary = count($ccParts) ? implode(' · ', $ccParts) : '—';
@endphp
<style type="text/css">
    .ti-pdf-root {
        font-size: 10.5px;
        color: #11354d;
        line-height: 1.45;
    }
    .ti-pdf-root .ti-card {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 0 0 18px;
        border: 1px solid #e8eaef;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
    }
    .ti-pdf-root .ti-card:last-child {
        margin-bottom: 0;
    }
    .ti-pdf-root .ti-card__head {
        background: #eef2f7;
        font-weight: 700;
        font-size: 10px;
        padding: 9px 14px;
        border-bottom: 1px solid #e8eaef;
        text-align: start;
        color: #11354d;
    }
    .ti-pdf-root .ti-card__body {
        padding: 14px 16px;
        background: #ffffff;
        vertical-align: top;
    }
    .ti-pdf-root .ti-grid2 {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }
    .ti-pdf-root .ti-grid2 td {
        width: 50%;
        vertical-align: top;
        padding: 0 0 10px;
        padding-inline-end: 12px;
        border: none;
    }
    .ti-pdf-root .ti-grid2 td:last-child {
        padding-inline-end: 0;
    }
    .ti-pdf-root .ti-stack {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }
    .ti-pdf-root .ti-stack tr + tr .ti-kv-lbl {
        padding-top: 10px;
    }
    .ti-pdf-root .ti-kv-lbl {
        font-weight: 700;
        font-size: 9.5px;
        color: #11354d;
        padding: 0 0 3px;
        text-align: start;
        vertical-align: top;
        border: none;
        width: 32%;
    }
    .ti-pdf-root .ti-kv-val {
        font-size: 10.5px;
        font-weight: 600;
        color: #11354d;
        padding: 0 0 10px;
        text-align: start;
        vertical-align: top;
        border: none;
        unicode-bidi: plaintext;
    }
    .ti-pdf-root .ti-kv-val--block {
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    .ti-pdf-root .ti-kv-val--ltr {
        direction: ltr;
        unicode-bidi: embed;
        text-align: left;
    }
    .ti-pdf-root .ti-sub {
        font-size: 9.5px;
        font-weight: 700;
        color: #11354d;
        padding: 0 0 4px;
        text-align: start;
    }
    .ti-pdf-root .ti-maps a {
        color: #0b5cab;
        text-decoration: underline;
        font-weight: 600;
    }
</style>
<div class="ti-pdf-root" dir="{{ $tiPdfRtl ? 'rtl' : 'ltr' }}" lang="{{ $tiPdfRtl ? 'ar' : 'en' }}">

    {{-- Section 1: Shipment information --}}
    <table class="ti-card" cellspacing="0" cellpadding="0" border="0" role="presentation">
        <tr>
            <td class="ti-card__head">{{ $labels['sec_ti_1_shipment'] ?? $labels['sec_ti_summary'] }}</td>
        </tr>
        <tr>
            <td class="ti-card__body">
                <table class="ti-grid2" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td>
                            <div class="ti-sub">{{ $labels['booking_number'] }}</div>
                            <div class="ti-kv-val ti-kv-val--ltr">{{ $shipment->booking_number ?? '—' }}</div>
                        </td>
                        <td>
                            <div class="ti-sub">{{ $labels['shipping_line'] }}</div>
                            <div class="ti-kv-val pdf-cell-dir-auto">{{ $shipment->shippingLine?->name ?? '—' }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding-top: 4px;">
                            <div class="ti-sub">{{ $labels['ti_container_summary'] ?? ($tiPdfRtl ? 'ملخص الحاوية' : 'Container summary') }}</div>
                            <div class="ti-kv-val pdf-cell-dir-auto" style="padding-bottom: 0;">{{ $containerSummary }}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Section 2: Delivery details --}}
    <table class="ti-card" cellspacing="0" cellpadding="0" border="0" role="presentation">
        <tr>
            <td class="ti-card__head">{{ $labels['sec_ti_2_delivery'] ?? $labels['sec_ti_form'] }}</td>
        </tr>
        <tr>
            <td class="ti-card__body">
                <table class="ti-stack" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_arrival'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val ti-kv-val--ltr" colspan="2" style="padding-bottom: 12px;">{{ $arrivalDisp }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_loading_place'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val pdf-cell-dir-auto" colspan="2" style="padding-bottom: 12px;">{{ $tiVal('loading_place_name') }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_loading_address'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val ti-kv-val--block pdf-cell-dir-auto" colspan="2" style="padding-bottom: 12px;">{!! ($ti['loading_address'] ?? '') !== '' ? nl2br(e($ti['loading_address'])) : '—' !!}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_loading_maps'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val ti-maps pdf-cell-dir-auto" colspan="2" style="padding-bottom: 0;">
                            @if($mapsIsLink)
                                <a href="{{ e($mapsRaw) }}">{{ $labels['ti_maps_open'] ?? $mapsRaw }}</a>
                            @else
                                {{ $mapsRaw !== '' ? $mapsRaw : '—' }}
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Section 3: Contact details --}}
    <table class="ti-card" cellspacing="0" cellpadding="0" border="0" role="presentation">
        <tr>
            <td class="ti-card__head">{{ $labels['sec_ti_3_contact'] ?? $labels['sec_ti_form'] }}</td>
        </tr>
        <tr>
            <td class="ti-card__body">
                <table class="ti-stack" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_contact_name'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val pdf-cell-dir-auto" colspan="2" style="padding-bottom: 12px;">{{ $tiVal('loading_contact_name') }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_contact_phone'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val ti-kv-val--ltr" colspan="2" style="padding-bottom: 0;">{{ $tiVal('loading_contact_phone') }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Section 4: Customs --}}
    <table class="ti-card" cellspacing="0" cellpadding="0" border="0" role="presentation">
        <tr>
            <td class="ti-card__head">{{ $labels['sec_ti_4_customs'] ?? $labels['sec_ti_form'] }}</td>
        </tr>
        <tr>
            <td class="ti-card__body">
                <table class="ti-stack" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_customs_doc'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val" colspan="2" style="padding-bottom: 12px;">{{ $docLbl }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_broker'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val pdf-cell-dir-auto" colspan="2" style="padding-bottom: 12px;">{{ $brokerName }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_customs_notes'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val ti-kv-val--block pdf-cell-dir-auto" colspan="2" style="padding-bottom: 0;">{!! ($ti['customs_notes'] ?? '') !== '' ? nl2br(e($ti['customs_notes'])) : '—' !!}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- Section 5: Generator & temperature --}}
    <table class="ti-card" cellspacing="0" cellpadding="0" border="0" role="presentation">
        <tr>
            <td class="ti-card__head">{{ $labels['sec_ti_5_generator'] ?? $labels['ti_generator'] }}</td>
        </tr>
        <tr>
            <td class="ti-card__body">
                <table class="ti-stack" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_generator'] }}</td>
                    </tr>
                    <tr>
                        <td class="ti-kv-val" colspan="2" style="padding-bottom: {{ ($ti['generator'] ?? 'no') === 'yes' ? '12px' : '0' }};">{{ $gen }}</td>
                    </tr>
                    @if(($ti['generator'] ?? 'no') === 'yes')
                        <tr>
                            <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_temp'] }}</td>
                        </tr>
                        <tr>
                            <td class="ti-kv-val ti-kv-val--ltr pdf-cell-dir-auto" colspan="2" style="padding-bottom: 12px;">{{ $tiVal('generator_temperature') }}</td>
                        </tr>
                        <tr>
                            <td class="ti-kv-lbl" colspan="2">{{ $labels['ti_driver_notes'] }}</td>
                        </tr>
                        <tr>
                            <td class="ti-kv-val ti-kv-val--block pdf-cell-dir-auto" colspan="2" style="padding-bottom: 0;">{!! ($ti['generator_driver_instructions'] ?? '') !== '' ? nl2br(e($ti['generator_driver_instructions'])) : '—' !!}</td>
                        </tr>
                    @endif
                </table>
            </td>
        </tr>
    </table>
</div>
