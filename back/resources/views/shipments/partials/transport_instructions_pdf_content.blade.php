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
    $genPill = $genYes ? ($labels['ti_gen_yes'] ?? 'Yes') : ($labels['ti_gen_no'] ?? 'No');

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
    $containerTagText = trim($containerSize.($containerSize && $containerType ? ' ' : '').$containerType);
    $hasContainerTag = $containerCount !== null && $containerCount !== '' && $containerTagText !== '';

    $tiRef = 'TI-'.now()->format('Y').'-'.str_pad((string) $shipment->id, 4, '0', STR_PAD_LEFT);
    $tiGenerated = now()->format('d / m / Y');
    $logoSrc = PdfLogo::imgSrc();
    $brand = $labels['brand'] ?? 'AMAZON MARINE';
    $brandTag = $labels['brand_tag'] ?? 'Ocean Freight & Logistics';
    $docTitle = $labels['title'] ?? ($labels['sec_ti_form'] ?? 'Transport instructions');
@endphp
<style type="text/css">
    .ti-v4-root {
        font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
        font-size: 10.5px;
        color: #0b1828;
        direction: rtl;
        line-height: 1.45;
    }
    .ti-v4-page {
        width: 100%;
        background: #ffffff;
        border-collapse: collapse;
    }
    .ti-v4-hd { background: #162035; }
    .ti-v4-hd-logo {
        background: #1b2a4a;
        border-left: 3px solid #f47b1a;
        padding: 16px 20px;
        width: 28%;
        vertical-align: middle;
    }
    .ti-v4-hd-logo-img { height: 48px; width: auto; max-width: 160px; display: block; }
    .ti-v4-hd-logo-name { font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: 0.05em; }
    .ti-v4-hd-logo-sub {
        font-size: 8px; color: rgba(255, 255, 255, 0.45);
        letter-spacing: 0.14em; text-transform: uppercase; margin-top: 4px;
    }
    .ti-v4-hd-info { padding: 14px 18px; vertical-align: middle; direction: ltr; text-align: left; }
    .ti-v4-hd-item { font-size: 9.5px; color: rgba(255, 255, 255, 0.65); padding: 2px 14px 2px 0; }
    .ti-v4-band { background: #f47b1a; padding: 8px 20px; }
    .ti-v4-band-title { font-size: 13px; font-weight: 700; color: #ffffff; }
    .ti-v4-band-meta { direction: ltr; text-align: left; }
    .ti-v4-chip {
        font-family: 'DejaVu Sans Mono', monospace;
        font-size: 9.5px; font-weight: 600; color: #ffffff;
        background: rgba(255, 255, 255, 0.18); border-radius: 4px;
        padding: 3px 9px; margin-left: 6px; display: inline-block;
    }
    .ti-v4-body { padding: 18px 22px 22px; vertical-align: top; }
    .ti-v4-sec { width: 100%; border-collapse: collapse; margin: 0 0 10px; }
    .ti-v4-sec-en {
        background: #162035; color: #ffffff; font-size: 9px; font-weight: 700;
        letter-spacing: 0.1em; text-transform: uppercase; padding: 5px 11px;
        border-radius: 4px 0 0 4px; white-space: nowrap; direction: ltr; text-align: left;
    }
    .ti-v4-sec-ar {
        background: #dde5f0; color: #1b2a4a; font-size: 11px; font-weight: 600;
        padding: 5px 12px; border-radius: 0 4px 4px 0; white-space: nowrap;
    }
    .ti-v4-sec-rule { border-bottom: 1.5px solid #e2e9f2; width: 100%; }
    .ti-v4-block {
        width: 100%; border-collapse: collapse; border: 1px solid #c8d4e6;
        border-radius: 7px; margin: 0 0 16px; overflow: hidden;
    }
    .ti-v4-bkey {
        background: #edf1f8; padding: 8px 12px; width: 22%; vertical-align: middle;
        border-bottom: 1px solid #e2e9f2; border-left: 1px solid #e2e9f2;
    }
    .ti-v4-bkey-first { border-left: none; }
    .ti-v4-bkey-en {
        font-size: 8.5px; font-weight: 700; color: #8699b8;
        letter-spacing: 0.08em; text-transform: uppercase; direction: ltr; text-align: left;
    }
    .ti-v4-bkey-ar { font-size: 11px; font-weight: 600; color: #4f6180; }
    .ti-v4-bval {
        background: #ffffff; padding: 8px 14px; font-size: 12.5px; font-weight: 500;
        color: #0b1828; vertical-align: middle; border-bottom: 1px solid #e2e9f2;
        word-wrap: break-word; unicode-bidi: plaintext;
    }
    .ti-v4-bval-mono { font-family: 'DejaVu Sans Mono', monospace; font-weight: 700; direction: ltr; text-align: left; }
    .ti-v4-bval-bold { font-size: 13.5px; font-weight: 700; }
    .ti-v4-bval-block { white-space: pre-wrap; line-height: 1.55; }
    .ti-v4-row-last .ti-v4-bkey, .ti-v4-row-last .ti-v4-bval { border-bottom: none; }
    .ti-v4-ctag-wrap { padding: 8px 14px; }
    .ti-v4-ctag {
        display: inline-block; background: #162035; color: #ffffff;
        font-size: 11.5px; font-weight: 600; padding: 4px 12px; border-radius: 20px;
    }
    .ti-v4-ctag-badge {
        background: rgba(255, 255, 255, 0.18); font-size: 9.5px; font-weight: 800;
        padding: 1px 6px; border-radius: 10px; margin-left: 6px;
    }
    .ti-v4-date {
        width: 100%; border-collapse: collapse; border: 1px solid #c8d4e6;
        border-radius: 7px; margin: 0 0 16px;
    }
    .ti-v4-dg-head {
        background: #edf1f8; padding: 7px 12px; text-align: center;
        border-bottom: 1px solid #e2e9f2; border-left: 1px solid #e2e9f2;
        width: 33.33%;
    }
    .ti-v4-dg-head-first { border-left: none; }
    .ti-v4-dg-val {
        padding: 12px; font-size: 24px; font-weight: 700; color: #162035;
        text-align: center; background: #ffffff; border-left: 1px solid #e2e9f2;
        width: 33.33%;
    }
    .ti-v4-dg-val-first { border-left: none; }
    .ti-v4-dg-val-mono { font-family: 'DejaVu Sans Mono', monospace; font-size: 20px; color: #1e3a6e; }
    .ti-v4-pill-yes {
        display: inline-block; font-size: 10.5px; font-weight: 700; padding: 3px 11px;
        border-radius: 20px; background: #dcfce7; color: #166534;
    }
    .ti-v4-pill-no {
        display: inline-block; font-size: 10.5px; font-weight: 700; padding: 3px 11px;
        border-radius: 20px; background: #fee2e2; color: #991b1b;
    }
    .ti-v4-pill-na {
        display: inline-block; font-size: 10.5px; font-weight: 500; padding: 3px 11px;
        border-radius: 20px; background: #edf1f8; color: #8699b8;
    }
    .ti-v4-map-link { color: #1e3a6e; font-size: 11px; direction: ltr; text-decoration: underline; }
    .ti-v4-ft { background: #162035; padding: 9px 22px; direction: ltr; }
    .ti-v4-ft-brand { font-size: 9px; color: rgba(255, 255, 255, 0.5); }
    .ti-v4-ft-brand strong { color: rgba(255, 255, 255, 0.82); font-weight: 600; }
    .ti-v4-ft-num {
        font-family: 'DejaVu Sans Mono', monospace; font-size: 9px;
        color: rgba(255, 255, 255, 0.42); text-align: right;
    }
</style>

<div class="ti-v4-root" dir="rtl" lang="ar">
    <table class="ti-v4-page" cellspacing="0" cellpadding="0" border="0" role="presentation">
        {{-- Header --}}
        <tr>
            <td class="ti-v4-hd">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-hd-logo">
                            @if($logoSrc)
                                <img class="ti-v4-hd-logo-img" src="{{ $logoSrc }}" alt="">
                            @else
                                <div class="ti-v4-hd-logo-name">{{ $brand }}</div>
                                <div class="ti-v4-hd-logo-sub">{{ $brandTag }}</div>
                            @endif
                        </td>
                        <td class="ti-v4-hd-info">
                            <span class="ti-v4-hd-item">www.amazonmarine.ltd</span>
                            <span class="ti-v4-hd-item">cs@amazonmarine.ltd</span><br>
                            <span class="ti-v4-hd-item">+2 02 2560 1776</span>
                            <span class="ti-v4-hd-item">+2 012 0074 4888</span><br>
                            <span class="ti-v4-hd-item">Fifth Settlement, New Cairo, Egypt</span>
                        </td>
                    </tr>
                </table>
                <table width="100%" cellspacing="0" cellpadding="0" border="0" class="ti-v4-band" role="presentation">
                    <tr>
                        <td class="ti-v4-band-title">{{ $docTitle }}</td>
                        <td class="ti-v4-band-meta" align="left">
                            <span class="ti-v4-chip">{{ $tiRef }}</span>
                            <span class="ti-v4-chip">{{ $tiGenerated }}</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- Body --}}
        <tr>
            <td class="ti-v4-body">
                {{-- 1 · Booking --}}
                <table class="ti-v4-sec" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Booking Info</td>
                        <td class="ti-v4-sec-ar">بيانات الحجز</td>
                        <td class="ti-v4-sec-rule">&nbsp;</td>
                    </tr>
                </table>
                <table class="ti-v4-block" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Booking No.</span><br>
                            <span class="ti-v4-bkey-ar">رقم الحجز</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-mono">{{ $shipment->booking_number ?? '—' }}</td>
                        <td class="ti-v4-bkey">
                            <span class="ti-v4-bkey-en">Shipping Line</span><br>
                            <span class="ti-v4-bkey-ar">الخط الملاحي</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold pdf-cell-dir-auto">{{ $shipment->shippingLine?->name ?? '—' }}</td>
                    </tr>
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Containers</span><br>
                            <span class="ti-v4-bkey-ar">الحاويات</span>
                        </td>
                        <td class="ti-v4-bval" colspan="3">
                            @if($hasContainerTag)
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
                <table class="ti-v4-sec" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Client Arrival</td>
                        <td class="ti-v4-sec-ar">موعد وصول العميل</td>
                        <td class="ti-v4-sec-rule">&nbsp;</td>
                    </tr>
                </table>
                <table class="ti-v4-date" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-dg-head ti-v4-dg-head-first">
                            <span class="ti-v4-bkey-en" style="display:block;text-align:center;">Day</span>
                            <span class="ti-v4-bkey-ar" style="display:block;text-align:center;">اليوم</span>
                        </td>
                        <td class="ti-v4-dg-head">
                            <span class="ti-v4-bkey-en" style="display:block;text-align:center;">Month</span>
                            <span class="ti-v4-bkey-ar" style="display:block;text-align:center;">الشهر</span>
                        </td>
                        <td class="ti-v4-dg-head">
                            <span class="ti-v4-bkey-en" style="display:block;text-align:center;">Time</span>
                            <span class="ti-v4-bkey-ar" style="display:block;text-align:center;">الساعة</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="ti-v4-dg-val ti-v4-dg-val-first">{{ $arrivalDay }}</td>
                        <td class="ti-v4-dg-val">{{ $arrivalMonth }}</td>
                        <td class="ti-v4-dg-val ti-v4-dg-val-mono">{{ $arrivalTime }}</td>
                    </tr>
                </table>

                {{-- 3 · Place of loading --}}
                <table class="ti-v4-sec" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Place of Loading</td>
                        <td class="ti-v4-sec-ar">مكان التحميل</td>
                        <td class="ti-v4-sec-rule">&nbsp;</td>
                    </tr>
                </table>
                <table class="ti-v4-block" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first" width="22%">
                            <span class="ti-v4-bkey-en">Location Name</span><br>
                            <span class="ti-v4-bkey-ar">اسم المكان</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold pdf-cell-dir-auto" colspan="3">{{ $tiVal('loading_place_name') }}</td>
                    </tr>
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Full Address</span><br>
                            <span class="ti-v4-bkey-ar">العنوان الكامل</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-block pdf-cell-dir-auto" colspan="3">{!! ($ti['loading_address'] ?? '') !== '' ? nl2br(e($ti['loading_address'])) : '—' !!}</td>
                    </tr>
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Google Maps</span><br>
                            <span class="ti-v4-bkey-ar">خرائط جوجل</span>
                        </td>
                        <td class="ti-v4-bval" colspan="3">
                            @if($mapsIsLink)
                                <a class="ti-v4-map-link" href="{{ e($mapsRaw) }}">{{ $labels['ti_maps_open'] ?? $mapsRaw }}</a>
                            @else
                                {{ $mapsRaw !== '' ? $mapsRaw : '—' }}
                            @endif
                        </td>
                    </tr>
                </table>

                {{-- 4 · Loading contact --}}
                <table class="ti-v4-sec" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Loading Contact</td>
                        <td class="ti-v4-sec-ar">مسؤول التحميل</td>
                        <td class="ti-v4-sec-rule">&nbsp;</td>
                    </tr>
                </table>
                <table class="ti-v4-block" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr class="ti-v4-row-last">
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Contact Name</span><br>
                            <span class="ti-v4-bkey-ar">اسم جهة الاتصال</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-bold pdf-cell-dir-auto">{{ $tiVal('loading_contact_name') }}</td>
                        <td class="ti-v4-bkey">
                            <span class="ti-v4-bkey-en">Contact Phone</span><br>
                            <span class="ti-v4-bkey-ar">هاتف جهة الاتصال</span>
                        </td>
                        <td class="ti-v4-bval ti-v4-bval-mono" style="text-align:right;">{{ $tiVal('loading_contact_phone') }}</td>
                    </tr>
                </table>

                {{-- 5 · Customs & equipment --}}
                <table class="ti-v4-sec" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-sec-en">Customs &amp; Equipment</td>
                        <td class="ti-v4-sec-ar">الجمارك والمعدات</td>
                        <td class="ti-v4-sec-rule">&nbsp;</td>
                    </tr>
                </table>
                <table class="ti-v4-block" cellspacing="0" cellpadding="0" border="0" role="presentation">
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
                            <span class="{{ $genYes ? 'ti-v4-pill-yes' : 'ti-v4-pill-no' }}">{{ $genPill }}</span>
                        </td>
                    </tr>
                    @if($genYes)
                        <tr>
                            <td class="ti-v4-bkey ti-v4-bkey-first">
                                <span class="ti-v4-bkey-en">Temperature</span><br>
                                <span class="ti-v4-bkey-ar">{{ $labels['ti_temp'] ?? 'درجة الحرارة' }}</span>
                            </td>
                            <td class="ti-v4-bval ti-v4-bval-mono pdf-cell-dir-auto" colspan="3">{{ $tiVal('generator_temperature') }}</td>
                        </tr>
                        <tr>
                            <td class="ti-v4-bkey ti-v4-bkey-first">
                                <span class="ti-v4-bkey-en">Driver Instructions</span><br>
                                <span class="ti-v4-bkey-ar">{{ $labels['ti_driver_notes'] ?? 'تعليمات السائق' }}</span>
                            </td>
                            <td class="ti-v4-bval ti-v4-bval-block pdf-cell-dir-auto" colspan="3">{!! ($ti['generator_driver_instructions'] ?? '') !== '' ? nl2br(e($ti['generator_driver_instructions'])) : '—' !!}</td>
                        </tr>
                    @endif
                    <tr>
                        <td class="ti-v4-bkey ti-v4-bkey-first">
                            <span class="ti-v4-bkey-en">Customs Broker</span><br>
                            <span class="ti-v4-bkey-ar">المخلص الجمركي</span>
                        </td>
                        <td class="ti-v4-bval pdf-cell-dir-auto" colspan="3">
                            @if(filled($brokerName))
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
                        <td class="ti-v4-bval ti-v4-bval-block pdf-cell-dir-auto" colspan="3">{!! ($ti['customs_notes'] ?? '') !== '' ? nl2br(e($ti['customs_notes'])) : '—' !!}</td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- Footer --}}
        <tr>
            <td class="ti-v4-ft">
                <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                    <tr>
                        <td class="ti-v4-ft-brand">
                            <strong>{{ $brand }}</strong> &nbsp;·&nbsp; cs@amazonmarine.ltd &nbsp;·&nbsp; www.amazonmarine.ltd
                        </td>
                        <td class="ti-v4-ft-num" align="right">PAGE 1 / 1 &nbsp;·&nbsp; {{ $tiRef }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</div>
