@php
    /** @var \App\Models\Shipment $shipment */
    /** @var array<string, mixed> $tiProfile */
    /** @var array<string, string> $labels */
    use App\Support\PdfLogo;

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

    $genYes = ($ti['generator'] ?? 'no') === 'yes';
    $genPill = $genYes ? $labels['ti_gen_yes'] ?? 'Yes' : $labels['ti_gen_no'] ?? 'No';

    $brokerName = null;
    $bid = $ti['approved_customs_broker_id'] ?? null;
    if ($bid) {
        $bv = \App\Models\Vendor::query()->find((int) $bid);
        $brokerName = $bv?->name;
    }

    $arrivalDay = '—';
    $arrivalMonth = '—';
    $arrivalTime = '—';
    $arrRaw = $ti['customer_arrival_at'] ?? null;
    if ($arrRaw) {
        try {
            $arrivalDt = \Illuminate\Support\Carbon::parse($arrRaw);
            $arrivalDay = $arrivalDt->format('d');
            $arrivalMonth = $arrivalDt->format('m');
            $arrivalTime = $arrivalDt->format('H:i');
        } catch (\Throwable $e) {
            $arrivalDay = (string) $arrRaw;
            $arrivalMonth = '—';
            $arrivalTime = '—';
        }
    }

    $mapsRaw = trim((string) ($ti['loading_maps_url'] ?? ''));
    $mapsIsLink = $mapsRaw !== '' && preg_match('#^https?://#i', $mapsRaw);

    $containerCount = $shipment->container_count;
    $containerSize = filled($shipment->container_size) ? (string) $shipment->container_size : '';
    $containerType = filled($shipment->container_type) ? (string) $shipment->container_type : '';
    $containerTagText = trim($containerSize . ($containerSize && $containerType ? ' ' : '') . $containerType);
    $hasContainerTag = $containerCount !== null && $containerCount !== '' && $containerTagText !== '';

    $tiRef = 'TI-' . now()->format('Y') . '-' . str_pad((string) $shipment->id, 4, '0', STR_PAD_LEFT);
    $tiGenerated = now()->format('d / m / Y');
    $logoSrc = PdfLogo::transportInstructionsImgSrc();
    $mapPinSrc = PdfLogo::mapPinImgSrc();
    $brand = $labels['brand'] ?? 'AMAZON MARINE';
    $brandTag = $labels['brand_tag'] ?? 'Ocean Freight & Logistics';
    $docTitle = $labels['title'] ?? ($labels['sec_ti_form'] ?? 'Transport instructions');
@endphp
<style type="text/css">
    /* mPDF: avoid width:100% on a table cell beside other columns (causes page-wide shrink). Use pt for reliable sizing. */
    .ti-v4-root {
        font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
        font-size: 8pt;
        color: #0b1828;
        direction: rtl;
        line-height: 1.45;
    }

    .ti-v4-page {
        width: 100%;
        max-width: 100%;
        table-layout: fixed;
        background: #ffffff;
        border-collapse: collapse;
        border-spacing: 0;
        /* mPDF: line-height on the outer table creates a gap between <tr> rows */
        line-height: 0;
    }

    .ti-v4-page>tr>td,
    .ti-v4-page>tbody>tr>td {
        line-height: normal;
        vertical-align: top;
    }

    .ti-v4-main {
        padding: 0;
        background: #162035;
    }

    .ti-v4-hd {
        background: #162035;
        padding: 0;
        margin: 0;
    }

    .ti-v4-hd-row {
        width: 100%;
        border-collapse: collapse;
        direction: ltr;
    }

    .ti-v4-hd-logo {
        background: #1b2a4a;
        border-left: 3px solid #f47b1a;
        border-right: none;
        padding: 16px 20px;
        width: 40%;
        vertical-align: middle;
        text-align: left;
    }

    .ti-v4-hd-logo-img {
        height: 52px;
        width: auto;
        max-width: 160px;
        display: block;
    }

    .ti-v4-hd-logo-name {
        font-size: 20pt;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.05em;
    }

    .ti-v4-hd-logo-sub {
        font-size: 8pt;
        color: #999999;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        margin-top: 4px;
    }

    .ti-v4-hd-info {
        padding: 14px 12px;
        vertical-align: middle;
        direction: ltr;
        text-align: left;
    }

    .ti-v4-hd-list {
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .ti-v4-hd-item {
        font-size: 8pt;
        color: #ffffff;
        line-height: 1.4;
        margin: 0 0 7px;
        padding: 0 0 0 14px;
    }

    .ti-v4-hd-item-last {
        margin-bottom: 0;
    }

    .ti-v4-hd-bullet {
        color: #f47b1a;
        font-weight: 700;
        padding-right: 6px;
    }

    .ti-v4-band {
        background: #f47b1a;
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .ti-v4-band-title {
        font-size: 11pt;
        font-weight: 800;
        color: #ffffff;
        padding: 10px 20px;
        vertical-align: middle;
    }

    .ti-v4-band-meta {
        direction: ltr;
        text-align: left;
        padding: 8px 16px 8px 0;
        vertical-align: middle;
        white-space: nowrap;
    }

    .ti-v4-band-meta-table {
        border-collapse: separate;
        border-spacing: 10px 0;
        direction: ltr;
    }

    .ti-v4-chip {
        font-family: 'DejaVu Sans Mono', monospace;
        font-size: 8pt;
        font-weight: 600;
        color: #ffffff;
        background: #e8954d;
        padding: 4px 10px;
        white-space: nowrap;
    }

    .ti-v4-body {
        padding: 0 22px 22px;
        vertical-align: top;
        line-height: 1.45;
    }

    .ti-v4-sec {
        width: 100%;
        max-width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        margin: 0;
        border-bottom: 1.5px solid #e2e9f2;
    }

    .ti-v4-sec-en {
        background: #162035;
        color: #ffffff;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 6px 12px;
        width: 38%;
        direction: ltr;
        text-align: left;
        vertical-align: middle;
        margin:0;
    }

    .ti-v4-sec-ar {
        background: #dde5f0;
        color: #1b2a4a;
        font-size: 9pt;
        font-weight: 600;
        padding: 6px 12px;
        text-align: right;
        vertical-align: middle;
                margin:0;
    }

    .ti-v4-block {
        width: 100%;
        max-width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        border: 1px solid #c8d4e6;
        margin: 0;
    }

    .ti-v4-bkey {
        background: #edf1f8;
        padding: 9px 12px;
        width: 22%;
        vertical-align: middle;
        border-bottom: 1px solid #e2e9f2;
        border-left: 1px solid #e2e9f2;
    }

    .ti-v4-bkey-first {
        border-left: none;
    }

    .ti-v4-bkey-en {
        font-size: 6pt;
        font-weight: 700;
        color: #8699b8;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        direction: ltr;
        text-align: left;
    }

    .ti-v4-bkey-ar {
        font-size: 8pt;
        font-weight: 600;
        color: #4f6180;
    }

    .ti-v4-bval {
        background: #ffffff;
        padding: 9px 14px;
        font-size: 8pt;
        font-weight: 500;
        color: #0b1828;
        vertical-align: middle;
        border-bottom: 1px solid #e2e9f2;
        word-wrap: break-word;
        unicode-bidi: plaintext;
    }

    .ti-v4-bval-mono {
        font-family: 'DejaVu Sans Mono', monospace;
        font-weight: 700;
        font-size: 10pt;
        direction: ltr;
        text-align: left;
    }

    .ti-v4-bval-bold {
        font-size: 9pt;
        font-weight: 700;
    }

    .ti-v4-bval-block {
        white-space: pre-wrap;
        line-height: 1.55;
    }

    .ti-v4-row-last .ti-v4-bkey,
    .ti-v4-row-last .ti-v4-bval {
        border-bottom: none;
    }

    .ti-v4-block-arrival .ti-v4-bkey,
    .ti-v4-block-arrival .ti-v4-bval,
    .ti-v4-block-arrival .ti-v4-bkey-en,
    .ti-v4-block-arrival .ti-v4-bval-mono {
        text-align: center;
    }

    .ti-v4-ctag-wrap {
        padding: 8px 14px;
    }

    .ti-v4-ctag {
        background: #162035;
        color: #ffffff;
        font-size: 8pt;
        font-weight: 600;
        padding: 5px 14px;
    }

    .ti-v4-ctag-badge {
        background: #3d4f6e;
        font-size: 8pt;
        font-weight: 800;
        padding: 2px 7px;
        margin-left: 6px;
    }

    .ti-v4-pill-yes {
        font-size: 8pt;
        font-weight: 700;
        padding: 4px 12px;
        background: #dcfce7;
        color: #166534;
    }

    .ti-v4-pill-no {
        font-size: 8pt;
        font-weight: 700;
        padding: 4px 12px;
        background: #fee2e2;
        color: #991b1b;
    }

    .ti-v4-pill-na {
        font-size: 9pt;
        font-weight: 500;
        padding: 4px 12px;
        background: #edf1f8;
        color: #8699b8;
    }

    .ti-v4-map-link {
        display: inline-block;
        line-height: 0;
        text-decoration: none;
        direction: ltr;
    }

    .ti-v4-map-icon {
        width: 25px;
        height: 20px;
        border: 0;
        vertical-align: middle;
        background: #ffffff;
    }

    .ti-v4-map-link-text {
        font-size: 8pt;
        color: #1e3a6e;
        font-weight: 600;
        text-decoration: underline dashed #1e3a6e;
    }

    .ti-v4-ft {
        background: #162035;
        padding: 10px 22px;
        direction: ltr;
    }

    .ti-v4-ft-brand {
        font-size: 8pt;
        color: #ffffff;
    }

    .ti-v4-ft-brand strong {
        color: #ffffff;
        font-weight: 600;
    }

    .ti-v4-ft-num {
        font-family: 'DejaVu Sans Mono', monospace;
        font-size: 8pt;
        color: #ffffff;
        text-align: right;
    }
</style>

<div class="ti-v4-root" dir="rtl" lang="ar">
    <table class="ti-v4-page" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
        {{-- Header + body (single row avoids mPDF gap between adjacent <tr>) --}}
        <tr>
            <td class="ti-v4-main">
                <div class="ti-v4-hd">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" class="ti-v4-hd-row"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-hd-logo">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="width:60px; vertical-align:middle;">
                                        @if ($logoSrc)
                                            <img class="ti-v4-hd-logo-img" src="{{ $logoSrc }}" alt="">
                                        @endif
                                    </td>

                                    <td style="vertical-align:middle; padding-left:10px;">
                                        <div style="color:#ffffff; font-size:11pt; font-weight:800; line-height:1.2;">
                                            AMAZON MARINE
                                        </div>
                                        <div
                                            style="color:#cfd6e4; font-size:8pt; letter-spacing:0.12em; margin-top:2px;">
                                            Ocean Freight & Logistics
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td class="ti-v4-hd-info">
                            <ul class="ti-v4-hd-list">
                                <li class="ti-v4-hd-item">
                                    <span class="ti-v4-hd-bullet">•</span> www.amazonmarine.ltd
                                    <span class="ti-v4-hd-bullet">•</span> cs@amazonmarine.ltd
                                </li>
                                <li class="ti-v4-hd-item">
                                    <span class="ti-v4-hd-bullet">•</span> +20225601776
                                    <span class="ti-v4-hd-bullet">•</span> +201200744888
                                    <span class="ti-v4-hd-bullet">•</span>Fifth Settlement, New Cairo, Egypt
                                </li>
                            </ul>
                        </td>
                    </tr>
                </table>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" class="ti-v4-band"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-band-title">{{ $docTitle }}</td>
                        <td class="ti-v4-band-meta" align="left">
                            <table cellspacing="0" cellpadding="0" border="0" class="ti-v4-band-meta-table"
                                role="presentation">
                                <tr>
                                    <td class="ti-v4-chip">{{ $tiRef }}</td>
                                    <td class="ti-v4-chip">{{ $tiGenerated }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                </div>

                <div class="ti-v4-body">
                {{-- 1 · Booking --}}
                <table class="ti-v4-sec" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Booking Info</td>
                        <td class="ti-v4-sec-ar">بيانات الحجز</td>
                    </tr>
                </table>
                <table class="ti-v4-block" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Booking No</span><br>
                            <span class="ti-v4-bkey-ar">رقم الحجز</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-mono">{{ $shipment->booking_number ?? '—' }}</td>
                        <td class="ti-v4-bkey">
                            <span class="ti-v4-bkey-en">Shipping Line</span><br>
                            <span class="ti-v4-bkey-ar">الخط الملاحي</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold pdf-cell-dir-auto">
                            {{ $shipment->shippingLine?->name ?? '—' }}</td>
                    </tr>
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Containers</span><br>
                            <span class="ti-v4-bkey-ar">الحاويات</span>
                        </td>
                        <td class="ti-v4-bval" colspan="3">
                            @if ($hasContainerTag)
                                <span class="ti-v4-ctag-wrap">
                                    <span class="ti-v4-ctag">
                                        <span class="ti-v4-ctag-badge">{{ $containerCount }}×</span>
                                        {{ $containerTagText }}
                                    </span>
                                </span>
                            @else
                                —
                            @endif
                        </td>
                    </tr>
                </table>

                {{-- 2 · Client arrival --}}
                <table class="ti-v4-sec" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Client Arrival</td>
                        <td class="ti-v4-sec-ar">موعد وصول العميل</td>
                    </tr>
                </table>
                <table class="ti-v4-block ti-v4-block-arrival" width="100%" cellspacing="0" cellpadding="0"
                    border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first" width="33%">
                            <span class="ti-v4-bkey-en">Day</span><br>
                            <span class="ti-v4-bkey-ar">اليوم</span>
                        </td>
                        <td class="ti-v4-bkey" width="33%">
                            <span class="ti-v4-bkey-en">Month</span><br>
                            <span class="ti-v4-bkey-ar">الشهر</span>
                        </td>
                        <td class="ti-v4-bkey" width="34%">
                            <span class="ti-v4-bkey-en">Time</span><br>
                            <span class="ti-v4-bkey-ar">الساعة</span>
                        </td>
                    </tr>
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bval ti-v4-bval-mono" width="33%">{{ $arrivalDay }}</td>
                        <td class="ti-v4-bval ti-v4-bval-mono" width="33%">{{ $arrivalMonth }}</td>
                        <td class="ti-v4-bval ti-v4-bval-mono" width="34%">{{ $arrivalTime }}</td>
                    </tr>
                </table>

                {{-- 3 · Place of loading --}}
                <table class="ti-v4-sec" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Place of Loading</td>
                        <td class="ti-v4-sec-ar">مكان التحميل</td>
                    </tr>
                </table>
                <table class="ti-v4-block" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first" width="22%">
                            <span class="ti-v4-bkey-en">Location Name</span><br>
                            <span class="ti-v4-bkey-ar">اسم المكان</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold pdf-cell-dir-auto" colspan="3">
                            {{ $tiVal('loading_place_name') }}</td>
                    </tr>
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Full Address</span><br>
                            <span class="ti-v4-bkey-ar">العنوان الكامل</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-block pdf-cell-dir-auto" colspan="3">
                            {!! ($ti['loading_address'] ?? '') !== '' ? nl2br(e($ti['loading_address'])) : '—' !!}</td>
                    </tr>
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Google Maps</span><br>
                            <span class="ti-v4-bkey-ar">خرائط جوجل</span>
                        </td>
                        <td class="ti-v4-bval" colspan="3">
                            @if ($mapsIsLink)
                                <a class="ti-v4-map-link" href="{{ e($mapsRaw) }}">
                                    @if ($mapPinSrc)
                                        <img class="ti-v4-map-icon" src="{{ $mapPinSrc }}" width="18" height="18"
                                            alt="">
                                        <span class="ti-v4-map-link-text">{{ $labels['ti_maps_open'] ?? $mapsRaw }}</span>
                                    @else
                                        <span class="ti-v4-map-link-fallback">&#9679;</span>
                                    @endif
                                </a>
                            @else
                                {{ $mapsRaw !== '' ? $mapsRaw : '—' }}
                            @endif
                        </td>
                    </tr>
                </table>

                {{-- 4 · Loading contact --}}
                <table class="ti-v4-sec" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Loading Contact</td>
                        <td class="ti-v4-sec-ar">مسؤول التحميل</td>
                    </tr>
                </table>
                <table class="ti-v4-block" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Contact Name</span><br>
                            <span class="ti-v4-bkey-ar">اسم جهة الاتصال</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold pdf-cell-dir-auto">{{ $tiVal('loading_contact_name') }}
                        </td>
                        <td class="ti-v4-bkey">
                            <span class="ti-v4-bkey-en">Contact Phone</span><br>
                            <span class="ti-v4-bkey-ar">هاتف جهة الاتصال</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-mono" style="text-align:right;">
                            {{ $tiVal('loading_contact_phone') }}</td>
                    </tr>
                </table>

                {{-- 5 · Customs & equipment --}}
                <table class="ti-v4-sec" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Customs &amp; Equipment</td>
                        <td class="ti-v4-sec-ar">الجمارك والمعدات</td>
                    </tr>
                </table>
                <table class="ti-v4-block" width="100%" cellspacing="0" cellpadding="0" border="0"
                    role="presentation">
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Customs Doc. Type</span><br>
                            <span class="ti-v4-bkey-ar">نوع المستند الجمركي</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold">{{ $docLbl }}</td>
                        <td class="ti-v4-bkey">
                            <span class="ti-v4-bkey-en">Generator</span><br>
                            <span class="ti-v4-bkey-ar">مولد كهربائي</span>
                        </td>
                        <td class="ti-v4-bval">
                            <span
                                class="{{ $genYes ? 'ti-v4-pill-yes' : 'ti-v4-pill-no' }}">{{ $genPill }}</span>
                        </td>
                    </tr>
                    @if ($genYes)
                        <tr>
                            <td class="ti-v4-bkey ti-v4-bkey-first">
                                <span class="ti-v4-bkey-en">Temperature</span><br>
                                <span class="ti-v4-bkey-ar">{{ $labels['ti_temp'] ?? 'درجة الحرارة' }}</span>
                            </td>
                            <td class="ti-v4-bval ti-v4-bval-mono pdf-cell-dir-auto" colspan="3"
                                style="text-align:right;">
                                {{ $tiVal('generator_temperature') }}</td>
                        </tr>
                        <tr>
                            <td class="ti-v4-bkey ti-v4-bkey-first">
                                <span class="ti-v4-bkey-en">Driver Instructions</span><br>
                                <span
                                    class="ti-v4-bkey-ar">{{ $labels['ti_driver_notes'] ?? 'تعليمات السائق' }}</span>
                            </td>
                            <td class="ti-v4-bval ti-v4-bval-block pdf-cell-dir-auto" colspan="3">
                                {!! ($ti['generator_driver_instructions'] ?? '') !== '' ? nl2br(e($ti['generator_driver_instructions'])) : '—' !!}</td>
                        </tr>
                    @endif
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Customs Broker</span><br>
                            <span class="ti-v4-bkey-ar">المخلص الجمركي</span>
                        </td>
                        <td class="ti-v4-bval pdf-cell-dir-auto" colspan="3">
                            @if (filled($brokerName))
                                {{ $brokerName }}
                            @else
                                <span class="ti-v4-pill-na">{{ $labels['ti_broker_na'] ?? 'لم يُحدد' }}</span>
                            @endif
                        </td>
                    </tr>
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Customs Notes</span><br>
                            <span class="ti-v4-bkey-ar">ملاحظات جمركية</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-block pdf-cell-dir-auto" colspan="3">
                            {!! ($ti['customs_notes'] ?? '') !== '' ? nl2br(e($ti['customs_notes'])) : '—' !!}</td>
                    </tr>
                </table>
                </div>
            </td>
        </tr>

        {{-- Footer --}}
        <tr>
            <td class="ti-v4-ft">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-ft-brand">
                            <strong>AMAZON MARINE</strong> &nbsp;·&nbsp; cs@amazonmarine.ltd &nbsp;·&nbsp;
                            www.amazonmarine.ltd
                        </td>
                        <td class="ti-v4-ft-num" align="right">PAGE 1 / 1 &nbsp;·&nbsp; {{ $tiRef }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</div>
