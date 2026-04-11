{{-- Self-contained mPDF export (single file). App PDFs use pdf/layouts/master + pdf/assets/theme; this file remains a standalone bundle. --}}
@php
    $lang = $lang ?? 'en';
    $dir = $lang === 'ar' ? 'rtl' : 'ltr';
    $htmlLang = $lang === 'ar' ? 'ar' : 'en';
    $pdfPageTitle = $pdfPageTitle ?? '';
@endphp
<!DOCTYPE html>
<html lang="{{ $htmlLang }}" dir="{{ $dir }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $pdfPageTitle }}</title>
@php
    $amiriPath = resource_path('fonts/Amiri-Regular.ttf');
    $amiriUrl = is_file($amiriPath) ? 'file://'.str_replace('\\', '/', $amiriPath) : '';
@endphp
<style>
    @if($amiriUrl !== '')
    @font-face {
        font-family: 'Amiri';
        src: url('{{ $amiriUrl }}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    @endif

    * { box-sizing: border-box; }

    .pdf-root {
        margin: 0;
        padding: 0;
        font-family: 'Inter', 'Poppins', 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5px;
        line-height: 1.45;
        color: #333333;
        background-color: #ffffff;
    }

    html[dir="rtl"] .pdf-root {
        font-family: 'Inter', 'Poppins', 'DejaVu Sans', 'Amiri', 'Tahoma', sans-serif;
    }

    .pdf-container {
        position: relative;
        width: 100%;
        padding: 0;
        background-color: #ffffff;
    }

    .pdf-main {
        max-width: 100%;
    }

    /* Default document header: dual top stripe + light card (mPDF-safe, no transforms). */
    .pdf-root--preview .pdf-header,
    .pdf-root--preview .pdf-dark-header {
        max-width: 100%;
        margin: 0 0 18px;
    }

    .pdf-root--preview .pdf-header.pdf-header--custom {
        margin-bottom: 14px;
    }

    .pdf-root--preview .pdf-header-shell {
        position: relative;
        background-color: #ffffff;
        color: #11354d;
        border: 1px solid #e2e8f0;
        overflow: hidden;
    }

    .pdf-root--preview .pdf-header-strip {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        padding: 0;
    }

    .pdf-root--preview .pdf-header-strip__cell {
        height: 5px;
        line-height: 5px;
        font-size: 1px;
        padding: 0;
        border: none;
    }

    .pdf-root--preview .pdf-header-strip__navy {
        width: 68%;
        background-color: #11354d;
    }

    .pdf-root--preview .pdf-header-strip__accent {
        width: 32%;
        background-color: #ec7f00;
    }

    .pdf-root--preview .pdf-header-table {
        position: relative;
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-root--preview .pdf-header-table td {
        border: none;
        padding: 14px 18px 16px;
    }

    .pdf-root--preview .pdf-header-col--brand {
        vertical-align: middle;
        background-color: #f8fafc;
        border-right: 1px solid #e2e8f0;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-col--brand {
        border-right: none;
        border-left: 1px solid #e2e8f0;
    }

    .pdf-root--preview .pdf-header-col--doc {
        text-align: right;
        vertical-align: top;
        background-color: #ffffff;
    }

    .pdf-root--preview .pdf-header-col--doc .pdf-header-doc-title,
    .pdf-root--preview .pdf-header-col--doc .pdf-header-doc-sub {
        text-align: right;
    }

    .pdf-root--preview .pdf-header-col--doc .pdf-header-meta-grid {
        margin-left: auto;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-col--doc {
        text-align: left;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-col--doc .pdf-header-doc-title,
    [dir="rtl"] .pdf-root--preview .pdf-header-col--doc .pdf-header-doc-sub {
        text-align: left;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-col--doc .pdf-header-meta-grid {
        margin-left: 0;
        margin-right: auto;
    }

    .pdf-root--preview .pdf-header-brand-row {
        border-collapse: collapse;
    }

    .pdf-root--preview .pdf-header-brand-logo-cell {
        padding: 0 14px 0 0;
        vertical-align: middle;
        width: 1%;
        white-space: nowrap;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-brand-logo-cell {
        padding: 0 0 0 14px;
    }

    .pdf-root--preview .pdf-header-brand-text-cell {
        vertical-align: middle;
        padding: 0;
    }

    .pdf-root--preview .pdf-header-logo-img {
        height: 70px;
        width: auto;
        max-width: 108px;
        display: block;
        padding: 6px 8px;
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
    }

    .pdf-root--preview .pdf-header-logo-fallback {
        width: 52px;
        height: 44px;
        background-color: #fff7ed;
        border: 1px solid #fdba74;
        text-align: center;
        line-height: 42px;
        font-size: 11px;
        font-weight: 700;
        color: #c2410c;
    }

    .pdf-root--preview .pdf-header-brand-name {
        display: block;
        font-size: 15px;
        font-weight: 800;
        color: #ec7f00;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        line-height: 1.25;
        margin: 0 0 4px;
        padding: 0;
        max-width: 100%;
    }

    .pdf-root--preview .pdf-header-tagline {
        display: block;
        margin-top: 6px;
        font-size: 8.5px;
        font-weight: 600;
        letter-spacing: 0.14em;
        color: #11354d;
        text-transform: uppercase;
        line-height: 1.45;
        opacity: 0.78;
    }

    .pdf-root--preview .pdf-header-doc-title {
        font-family: 'Inter', 'DejaVu Sans', Arial, Helvetica, sans-serif;
        font-size: 17px;
        font-weight: 800;
        color: #11354d;
        margin: 0 0 4px;
        line-height: 1.15;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border-bottom: 3px solid #ec7f00;
        padding-bottom: 8px;
        display: block;
        width: 100%;
        box-sizing: border-box;
    }

    .pdf-root--preview .pdf-header-doc-sub {
        font-size: 9px;
        font-weight: 700;
        color: #64748b;
        margin: 8px 0 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .pdf-root--preview .pdf-header-meta-grid {
        width: 100%;
        max-width: 280px;
        border-collapse: collapse;
        border: 1px solid #e2e8f0;
    }

    .pdf-root--preview .pdf-header-meta-grid tr:nth-child(odd) td {
        background-color: #f8fafc;
    }

    .pdf-root--preview .pdf-header-meta-grid tr:nth-child(even) td {
        background-color: #ffffff;
    }

    .pdf-root--preview .pdf-header-meta-grid td {
        padding: 6px 10px;
        vertical-align: middle;
        border-bottom: 1px solid #e2e8f0;
    }

    .pdf-root--preview .pdf-header-meta-grid tr:last-child td {
        border-bottom: none;
    }

    .pdf-root--preview .pdf-header-meta-label {
        text-align: left;
        font-size: 7.5px;
        font-weight: 700;
        color: #64748b;
        padding-right: 10px;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-meta-label {
        text-align: right;
        padding-right: 0;
        padding-left: 10px;
    }

    .pdf-root--preview .pdf-header-meta-value {
        text-align: right;
        font-size: 10px;
        font-weight: 700;
        color: #11354d;
    }

    [dir="rtl"] .pdf-root--preview .pdf-header-meta-value {
        text-align: left;
    }

    .pdf-root--preview .pdf-header-meta-value--hl {
        font-weight: 800;
        color: #9a3412;
        background-color: #fff7ed;
    }

    .pdf-field {
        margin: 0;
    }

    .pdf-label {
        font-size: 7.5px;
        font-weight: 700;
        color: #AAAAAA;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 5px;
    }

    .pdf-value {
        font-size: 10.5px;
        font-weight: 700;
    }

    .pdf-field--light .pdf-label,
    .pdf-section-body .pdf-field:not(.pdf-field--dark) .pdf-label {
        color: #AAAAAA;
    }

    .pdf-field--light .pdf-value,
    .pdf-section-body .pdf-field:not(.pdf-field--dark) .pdf-value {
        color: #333333;
    }

    .pdf-field--dark .pdf-label {
        color: #AAAAAA;
    }

    .pdf-field--dark .pdf-value {
        color: #FFFFFF;
    }

    .pdf-highlight-box {
        display: inline-block;
        padding: 4px 12px;
        margin-top: 2px;
        background-color: #3d3319;
        border: 1px solid #ec7f00;
        color: #ffffff;
        font-weight: 700;
    }

    .pdf-section-body .pdf-highlight-box {
        color: #ffffff;
    }

    .pdf-section {
        margin: 0 0 18px;
    }

    .pdf-section-title,
    .pdf-section-header {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #ffffff;
        background-color: #11354d;
        margin: 0;
        padding: 10px 14px;
        line-height: 1.35;
        border-radius: 3px 3px 0 0;
    }

    .pdf-section-body,
    .pdf-card {
        background-color: #ffffff;
    }

    /* Modern data tables (mPDF-safe: no ::after; white gaps between header cells). */
    .pdf-grid,
    .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0 0;
        background-color: #ffffff;
    }

    .pdf-section-body > .pdf-grid:first-child,
    .pdf-section-body > .pdf-table:first-child {
        margin-top: 0;
    }

    .pdf-grid--flush-top {
        margin-top: -1px;
    }

    .pdf-grid th,
    .pdf-grid td,
    .pdf-table th,
    .pdf-table td {
        vertical-align: top;
        border-left: none;
        border-right: none;
        border-top: none;
    }

    .pdf-grid th,
    .pdf-table thead th {
        background-color: #ec7f00;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        text-align: left;
        padding: 12px 15px;
        border-bottom: none;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .pdf-table thead th + th,
    .pdf-grid tr th + th {
        border-left: 3px solid #ffffff;
    }

    [dir="rtl"] .pdf-grid th,
    [dir="rtl"] .pdf-table thead th {
        text-align: right;
    }

    .pdf-grid td,
    .pdf-table tbody td {
        padding: 12px 15px;
        border-bottom: 1px solid #eeeeee;
        color: #333333;
        font-size: 12px;
        font-weight: 600;
        background-color: #ffffff;
    }

    .pdf-table tbody tr:nth-child(even) td,
    .pdf-grid tr:nth-child(even) td {
        background-color: #f9f9f9;
    }

    .pdf-table tbody tr:nth-child(odd) td,
    .pdf-grid tr:nth-child(odd) td {
        background-color: #ffffff;
    }

    .pdf-table tbody tr:last-child td,
    .pdf-grid tr:last-child td {
        border-bottom: 2px solid #ec7f00;
    }

    .pdf-table thead th:nth-child(n+2),
    .pdf-table tbody td:nth-child(n+2) {
        text-align: right;
    }

    [dir="rtl"] .pdf-table thead th:nth-child(1),
    [dir="rtl"] .pdf-table tbody td:nth-child(1) {
        text-align: right;
    }

    [dir="rtl"] .pdf-table thead th:nth-child(n+2),
    [dir="rtl"] .pdf-table tbody td:nth-child(n+2) {
        text-align: left;
    }

    .pdf-block-text {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-weight: 600;
    }

    .pdf-notes-block {
        border: 1px solid #E0E0E0;
        border-top: none;
        background-color: #F7F7F7;
        padding: 12px 14px;
        font-size: 10px;
        line-height: 1.5;
        color: #333333;
    }

    .pdf-notes-block .pdf-label-inline {
        font-size: 8.5px;
        font-weight: 700;
        color: #666666;
        text-transform: uppercase;
    }

    .pdf-muted {
        color: #999999;
        font-weight: 600;
    }

    .pdf-invoice-shell {
        border: 1px solid #E0E0E0;
        padding: 0 10px 14px;
        background-color: #ffffff;
    }

    .pdf-invoice-header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0;
        background-color: #11354d;
        border-bottom: 4px solid #ec7f00;
    }

    .pdf-invoice-header-table td {
        padding: 14px 16px;
        border: none;
        vertical-align: top;
        color: #ffffff;
    }

    .pdf-invoice-company-name {
        font-size: 16px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 4px;
    }

    .pdf-invoice-company-line {
        font-size: 9.5px;
        color: #cccccc;
    }

    .pdf-invoice-meta {
        text-align: right;
    }

    [dir="rtl"] .pdf-invoice-meta {
        text-align: left;
    }

    .pdf-invoice-doc-title {
        font-size: 22px;
        font-weight: 700;
        color: #ec7f00;
        margin-bottom: 10px;
        letter-spacing: 0.04em;
    }

    .pdf-invoice-meta .pdf-field .pdf-label,
    .pdf-invoice-meta .pdf-field--light .pdf-label {
        color: #AAAAAA;
    }

    .pdf-invoice-meta .pdf-field .pdf-value,
    .pdf-invoice-meta .pdf-field--light .pdf-value {
        color: #ffffff;
    }

    .pdf-invoice-meta > div {
        margin-bottom: 8px;
    }

    .pdf-party-table {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-party-inner {
        padding: 0;
        margin: 0;
        background-color: transparent;
    }

    .pdf-party-inner > .pdf-field:first-child .pdf-value {
        font-size: 14px;
    }

    .pdf-party-box {
        border: 1px solid #E0E0E0;
        border-top: none;
        padding: 14px 16px;
        background-color: #ffffff;
    }

    .pdf-party-box .pdf-label {
        color: #AAAAAA;
    }

    .pdf-party-box .pdf-value {
        color: #333333;
        font-size: 13px;
    }

    .pdf-text-end {
        text-align: right;
    }

    [dir="rtl"] .pdf-text-end {
        text-align: left;
    }

    .pdf-totals-wrap {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-totals-wrap td {
        border: none;
        padding: 12px 16px;
        vertical-align: top;
    }

    .pdf-totals-inner td {
        padding: 5px 0;
        border: none;
        border-bottom: 1px solid #DDDDDD;
        font-size: 10px;
        font-weight: 600;
        color: #555555;
    }

    .pdf-total-box,
    .pdf-summary-box {
        margin-top: 12px;
        padding: 14px 18px;
        background-color: #ec7f00;
        color: #ffffff;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.04em;
        border: 1px solid #ec7f00;
        border-left: 5px solid #ec7f00;
    }

    .pdf-total-box td,
    .pdf-summary-box td {
        color: #ffffff;
        border: none;
        padding: 0;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.04em;
    }

    .pdf-total-box td:first-child,
    .pdf-summary-box td:first-child {
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .pdf-total-box td.pdf-text-end,
    .pdf-summary-box td.pdf-text-end {
        text-transform: none;
    }

    table.pdf-total-box,
    table.pdf-summary-box {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-notes-section {
        padding: 14px 16px;
        border-top: 1px solid #DDDDDD;
    }

    .pdf-notes-section__title {
        font-size: 9px;
        font-weight: 700;
        color: #666666;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
    }

    .pdf-footer {
        margin-top: 18px;
        padding: 0;
        width: 100%;
        position: relative;
    }

    .pdf-footer-table {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-footer-row-main td {
        border: none;
        vertical-align: top;
    }

    .pdf-footer-left-pane {
        background-color: #f0f0f0;
        padding: 12px 28px 14px;
    }

    .pdf-footer-right-pane {
        background-color: #11354d;
        padding: 14px 28px 12px;
        text-align: right;
        vertical-align: bottom;
    }

    [dir="rtl"] .pdf-footer-right-pane {
        text-align: left;
    }

    .pdf-footer-info {
        font-size: 10px;
        color: #444444;
        line-height: 1.6;
    }

    .pdf-footer-info strong {
        font-weight: 700;
        color: #333333;
    }

    .pdf-footer-site {
        font-weight: 700;
        color: #ffffff;
        font-size: 11px;
        line-height: 1.3;
        padding-top: 8px;
    }

    .pdf-footer-row-accent td {
        border: none;
        padding: 0;
        height: 15px;
        font-size: 1px;
        line-height: 15px;
    }

    .pdf-footer-orange-bar {
        background-color: #ec7f00;
        width: 60%;
    }

    .pdf-footer-navy-bar {
        background-color: #11354d;
        width: 40%;
    }

    .pdf-footer-row-generated td {
        border: none;
        padding: 0;
    }

    .pdf-footer-generated-cell {
        background-color: #f5f5f5;
        padding: 8px 28px 10px;
        font-size: 8px;
        color: #888888;
        border-top: 1px solid #e0e0e0;
    }

    .pdf-footer-fullbleed {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        padding: 0;
    }

    .pdf-footer-fullbleed__cell {
        padding: 0;
        margin: 0;
        border: none;
        vertical-align: top;
        width: 100%;
        line-height: 0;
    }

    .pdf-footer-fullbleed__img {
        width: 100%;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0;
        padding: 0;
        border: none;
    }

    .pdf-col-20 { width: 20%; }
    .pdf-col-22 { width: 22%; }
    .pdf-col-25 { width: 25%; }
    .pdf-col-32 { width: 32%; }
    .pdf-col-33 { width: 33.33%; }
    .pdf-col-37 { width: 37.5%; }
    .pdf-col-40 { width: 40%; }
    .pdf-col-60 { width: 60%; }
    .pdf-col-68 { width: 68%; }

    .pdf-item-desc-sub {
        font-size: 8.5px;
        color: #888888;
        font-weight: 600;
        margin-top: 2px;
    }

    .pdf-italic-muted {
        color: #666666;
        font-style: italic;
        font-weight: 600;
    }

    .pdf-page-header {
        position: relative;
        z-index: 1;
        width: 100%;
        padding: 0;
        line-height: 0;
        overflow: hidden;
        font-size: 0;
    }

    .pdf-page-header__cell {
        padding: 0;
        margin: 0;
        border: none;
        line-height: 0;
        vertical-align: top;
    }

    .pdf-page-header__img {
        width: 100%;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0;
        padding: 0;
        border: none;
    }
</style>
</head>
<body style="margin:0;padding:0;">
    <div class="pdf-root pdf-root--preview">
        @php $pdfHeaderBanner = \App\Support\PdfLogo::headerImgSrc(); @endphp
        @if($pdfHeaderBanner)
        <table class="pdf-page-header" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-page-header__cell">
                    <img class="pdf-page-header__img" src="{{ $pdfHeaderBanner }}" alt="">
                </td>
            </tr>
        </table>
        @endif
        <div class="pdf-container">
            <div class="pdf-main">@if(isset($form))
@php
        $L = $labels ?? trans('pdf.sd_form', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');

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
            $notifyDisplayHtml = '<span class="pdf-italic-muted">'.$L['notify_same_as_consignee'].'</span>';
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

        $logoSrc = \App\Support\PdfLogo::imgSrc();

        $metaCells = [
            ['label' => $L['sd_no'], 'value' => $form->sd_number ?? ('SD-'.$form->id), 'highlight' => true],
            ['label' => $L['sd_date'], 'value' => optional($form->created_at)->format('d/m/Y') ?? '—', 'highlight' => false],
            ['label' => $L['vessel_date'], 'value' => optional($form->requested_vessel_date)->format('d/m/Y') ?? '—', 'highlight' => false],
            ['label' => $L['client'], 'value' => $form->client?->name ?? '—', 'highlight' => false],
        ];
    @endphp

    @if(!empty($headerHtml))
        <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
    @else
        <div class="pdf-header pdf-dark-header">
    <div class="pdf-header-shell">
        <table class="pdf-header-strip" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-header-strip__navy pdf-header-strip__cell">&nbsp;</td>
                <td class="pdf-header-strip__accent pdf-header-strip__cell">&nbsp;</td>
            </tr>
        </table>
        <table class="pdf-header-table" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td class="pdf-header-col pdf-header-col--brand" width="52%" valign="middle">
                    <table class="pdf-header-brand-row" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td class="pdf-header-brand-logo-cell" valign="middle">
                                @if(!empty($logoSrc))
                                    <img class="pdf-header-logo-img" src="{{ $logoSrc }}" alt="">
                                @else
                                    <div class="pdf-header-logo-fallback">{{ $mhPlaceholder ?? 'MH' }}</div>
                                @endif
                            </td>
                            <td class="pdf-header-brand-text-cell" valign="middle">
                                @if(!empty($brand))
                                    <div class="pdf-header-brand-name">{{ $brand }}</div>
                                @endif
                                <div class="pdf-header-tagline">{{ $tagline }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="pdf-header-col pdf-header-col--doc" width="48%" valign="top">
                    <div class="pdf-header-doc-title">{{ $documentTitle }}</div>
                    @if(filled($documentSubtitle))
                        <div class="pdf-header-doc-sub">{{ $documentSubtitle }}</div>
                    @endif
                    <table class="pdf-header-meta-grid" cellpadding="0" cellspacing="0" border="0" width="100%">
                        @foreach($metaCells as $cell)
                            <tr>
                                <td class="pdf-header-meta-label">{{ ($cell['label'] ?? '').':' }}</td>
                                <td class="pdf-header-meta-value {{ !empty($cell['highlight']) ? 'pdf-header-meta-value--hl' : '' }}">{{ $cell['value'] ?? '—' }}</td>
                            </tr>
                        @endforeach
                    </table>
                </td>
            </tr>
        </table>
    </div>
</div>@endif

    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_shipment_info'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-33">{{ $L['pol'] }}</th>
                <th class="pdf-col-33">{{ $L['pod'] }}</th>
                <th class="pdf-col-33">{{ $L['final_destination'] }}</th>
            </tr>
            <tr>
                <td>{{ $pol }}</td>
                <td>{{ $pod }}</td>
                <td>{{ $finalDestination }}</td>
            </tr>
            <tr>
                <th>{{ $L['consignee'] }}</th>
                <th>{{ $L['notify_party'] }}</th>
                <th>{{ $L['contact_details'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text">{!! $consigneeHtml !!}</td>
                <td class="pdf-block-text">{!! $notifyDisplayHtml !!}</td>
                <td>
                    @if($form->client?->email)
                        <div class="pdf-field pdf-field--light">
                            <div class="pdf-label">{{ $L['email'] }}</div>
                            <div class="pdf-value">{{ $form->client->email }}</div>
                        </div>
                    @endif
                    @if($form->client?->phone)
                        <div class="pdf-field pdf-field--light">
                            <div class="pdf-label">{{ $L['phone'] }}</div>
                            <div class="pdf-value">{{ $form->client->phone }}</div>
                        </div>
                    @endif
                    @if(!$form->client?->email && !$form->client?->phone)
                        <span class="pdf-muted">—</span>
                    @endif
                </td>
            </tr>
        </table>
        </div>
</div>


    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_shipping_info'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-25">{{ $L['swb_type'] }}</th>
                <th class="pdf-col-37">{{ $L['fob'] }}</th>
                <th class="pdf-col-37">{{ $L['status'] }}</th>
            </tr>
            <tr>
                <td>{{ $L['swb_telex'] }}</td>
                <td>{{ $form->freight_term ?? '—' }}</td>
                <td>{{ $L['clean_on_board'] }}</td>
            </tr>
        </table>
        <table class="pdf-grid pdf-grid--flush-top" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-25">{{ $L['vessel_container'] }}</th>
                <th class="pdf-col-25">{{ $L['container_type'] }}</th>
                <th class="pdf-col-25">{{ $L['hs_code'] }}</th>
                <th class="pdf-col-25">{{ $L['weight_kgs'] }}</th>
            </tr>
            <tr>
                <td>{{ $vesselRef }}</td>
                <td>{{ $containerTypeCell }}</td>
                <td>{{ $form->hs_code ?? '—' }}</td>
                <td>{{ $weightLabel }}</td>
            </tr>
            <tr>
                <th>{{ $L['shipping_line'] }}</th>
                <td colspan="3">{{ $form->shipping_line ?? '—' }}</td>
            </tr>
        </table>
        </div>
</div>


    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_goods'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-32">{{ $L['marks_numbers'] }}</th>
                <th class="pdf-col-68">{{ $L['description_goods'] }}</th>
            </tr>
            <tr>
                <td><span class="pdf-highlight-box">{{ $form->sd_number ?? '—' }}</span></td>
                <td class="pdf-block-text">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes-block">
            <span class="pdf-label-inline">{{ $L['total_gross'] }}</span> {{ $form->total_gross_weight ?? '—' }} {{ $L['kg'] }}
            &nbsp;|&nbsp;
            <span class="pdf-label-inline">{{ $L['total_net'] }}</span> {{ $form->total_net_weight ?? '—' }} {{ $L['kg'] }}
            @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                <br><br><span class="pdf-label-inline">{{ $L['acid'] }}</span> {{ $form->acid_number }}
            @endif
            @if(!empty($form->notes))
                <br><br><span class="pdf-label-inline">{{ $L['notes'] }}</span> {{ $form->notes }}
            @endif
        </div>
        </div>
</div>

@elseif(isset($shipment))
@php
        $L = $labels ?? trans('pdf.shipment', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');

        $logoSrc = \App\Support\PdfLogo::imgSrc();
        $sdNo = $shipment->sdForm?->sd_number ?? ($shipment->sd_form_id ? 'SD-'.$shipment->sd_form_id : '—');
        $genAt = now()->format('d/m/Y H:i');
        $bookingD = optional($shipment->booking_date)->format('d/m/Y') ?? '—';
        $loadingD = optional($shipment->loading_date)->format('d/m/Y') ?? '—';

        $metaCells = [
            ['label' => $L['id'], 'value' => '#'.$shipment->id, 'highlight' => true],
            ['label' => $L['generated'], 'value' => $genAt, 'highlight' => false],
            ['label' => $L['client'], 'value' => $shipment->client?->company_name ?? $shipment->client?->name ?? '—', 'highlight' => false],
            ['label' => $L['status'], 'value' => $shipment->status ?? '—', 'highlight' => true],
        ];
    @endphp

    @if(!empty($headerHtml))
        <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
    @else
        <div class="pdf-header pdf-dark-header">
    <div class="pdf-header-shell">
        <table class="pdf-header-strip" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-header-strip__navy pdf-header-strip__cell">&nbsp;</td>
                <td class="pdf-header-strip__accent pdf-header-strip__cell">&nbsp;</td>
            </tr>
        </table>
        <table class="pdf-header-table" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td class="pdf-header-col pdf-header-col--brand" width="52%" valign="middle">
                    <table class="pdf-header-brand-row" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td class="pdf-header-brand-logo-cell" valign="middle">
                                @if(!empty($logoSrc))
                                    <img class="pdf-header-logo-img" src="{{ $logoSrc }}" alt="">
                                @else
                                    <div class="pdf-header-logo-fallback">{{ $mhPlaceholder ?? 'MH' }}</div>
                                @endif
                            </td>
                            <td class="pdf-header-brand-text-cell" valign="middle">
                                @if(!empty($brand))
                                    <div class="pdf-header-brand-name">{{ $brand }}</div>
                                @endif
                                <div class="pdf-header-tagline">{{ $tagline }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="pdf-header-col pdf-header-col--doc" width="48%" valign="top">
                    <div class="pdf-header-doc-title">{{ $documentTitle }}</div>
                    @if(filled($documentSubtitle))
                        <div class="pdf-header-doc-sub">{{ $documentSubtitle }}</div>
                    @endif
                    <table class="pdf-header-meta-grid" cellpadding="0" cellspacing="0" border="0" width="100%">
                        @foreach($metaCells as $cell)
                            <tr>
                                <td class="pdf-header-meta-label">{{ ($cell['label'] ?? '').':' }}</td>
                                <td class="pdf-header-meta-value {{ !empty($cell['highlight']) ? 'pdf-header-meta-value--hl' : '' }}">{{ $cell['value'] ?? '—' }}</td>
                            </tr>
                        @endforeach
                    </table>
                </td>
            </tr>
        </table>
    </div>
</div>@endif

    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_shipment'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-33">{{ $L['sales_rep'] }}</th>
                <th class="pdf-col-33">{{ $L['sd_form'] }}</th>
                <th class="pdf-col-33">{{ $L['status'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->salesRep?->name ?? '—' }}</td>
                <td>{{ $sdNo }}</td>
                <td>{{ $shipment->status ?? '—' }}</td>
            </tr>
        </table>
        </div>
</div>


    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_booking'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-33">{{ $L['booking_date'] }}</th>
                <th class="pdf-col-33">{{ $L['booking_number'] }}</th>
                <th class="pdf-col-33">{{ $L['bl_number'] }}</th>
            </tr>
            <tr>
                <td>{{ $bookingD }}</td>
                <td>{{ $shipment->booking_number ?? '—' }}</td>
                <td>{{ $shipment->bl_number ?? '—' }}</td>
            </tr>
        </table>
        </div>
</div>


    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_shipping'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-20">{{ $L['mode'] }}</th>
                <th class="pdf-col-20">{{ $L['shipment_type'] }}</th>
                <th class="pdf-col-20">{{ $L['direction'] }}</th>
                <th class="pdf-col-20">{{ $L['shipping_line'] }}</th>
                <th class="pdf-col-20">{{ $L['line_vendor'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->mode ?? '—' }}</td>
                <td>{{ $shipment->shipment_type ?? '—' }}</td>
                <td>{{ $shipment->shipment_direction ?? '—' }}</td>
                <td>{{ $shipment->shippingLine?->name ?? '—' }}</td>
                <td>{{ $shipment->lineVendor?->name ?? '—' }}</td>
            </tr>
            @if($shipment->shipment_direction === 'Import' || filled($shipment->acid_number))
                <tr>
                    <th>{{ $L['acid'] }}</th>
                    <td colspan="4">{{ $shipment->acid_number ?? '—' }}</td>
                </tr>
            @endif
        </table>
        <table class="pdf-grid pdf-grid--flush-top" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-25">{{ $L['container_type'] }}</th>
                <th class="pdf-col-25">{{ $L['container_size'] }}</th>
                <th class="pdf-col-25">{{ $L['container_count'] }}</th>
                <th class="pdf-col-25">{{ $L['loading_place'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->container_type ?? '—' }}</td>
                <td>{{ $shipment->container_size ?? '—' }}</td>
                <td>{{ $shipment->container_count ?? '—' }}</td>
                <td>{{ $shipment->loading_place ?? '—' }}</td>
            </tr>
        </table>
        </div>
</div>


    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_ports'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-33">{{ $L['pol'] }}</th>
                <th class="pdf-col-33">{{ $L['pod'] }}</th>
                <th class="pdf-col-33">{{ $L['loading_date'] }}</th>
            </tr>
            <tr>
                <td>{{ $shipment->originPort?->name ?? '—' }}</td>
                <td>{{ $shipment->destinationPort?->name ?? '—' }}</td>
                <td>{{ $loadingD }}</td>
            </tr>
        </table>
        </div>
</div>


    <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['sec_goods'] }}</div>
    <div class="pdf-section-body pdf-card">

        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-22">{{ $L['id'] }}</th>
                <th class="pdf-col-68">{{ $L['cargo'] }}</th>
            </tr>
            <tr>
                <td><span class="pdf-highlight-box">#{{ $shipment->id }}</span></td>
                <td class="pdf-block-text">{!! $shipment->cargo_description ? nl2br(e($shipment->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes-block">
            @if(filled($notesColumn))
                <span class="pdf-label-inline">{{ $L['notes'] }}</span><br>
                <span class="pdf-block-text">{!! nl2br(e($notesColumn)) !!}</span>
            @else
                <span class="pdf-label-inline">{{ $L['notes'] }}</span> <span class="pdf-muted">—</span>
            @endif
            @if(filled($shipment->route_text))
                <br><br><span class="pdf-label-inline">{{ $L['route'] }}</span><br>
                <span class="pdf-block-text">{{ $shipment->route_text }}</span>
            @endif
        </div>
        </div>
</div>

@elseif(isset($invoice))
@php
        $L = $labels ?? trans('pdf.invoice', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');

        $logoSrc = \App\Support\PdfLogo::imgSrc();

        $metaCells = [
            ['label' => $L['no'], 'value' => $invoice->invoice_number, 'highlight' => true],
            ['label' => $L['date'], 'value' => $invoice->issue_date?->toDateString() ?? '—', 'highlight' => false],
            ['label' => $L['due_date'], 'value' => $invoice->due_date?->toDateString() ?? '—', 'highlight' => false],
            ['label' => $L['shipment_bl'], 'value' => $invoice->shipment?->bl_number ?? '—', 'highlight' => false],
        ];
    @endphp

    <div class="pdf-invoice-shell">
        @if(!empty($headerHtml))
            <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
        @else
            <div class="pdf-header pdf-dark-header">
    <div class="pdf-header-shell">
        <table class="pdf-header-strip" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-header-strip__navy pdf-header-strip__cell">&nbsp;</td>
                <td class="pdf-header-strip__accent pdf-header-strip__cell">&nbsp;</td>
            </tr>
        </table>
        <table class="pdf-header-table" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td class="pdf-header-col pdf-header-col--brand" width="52%" valign="middle">
                    <table class="pdf-header-brand-row" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td class="pdf-header-brand-logo-cell" valign="middle">
                                @if(!empty($logoSrc))
                                    <img class="pdf-header-logo-img" src="{{ $logoSrc }}" alt="">
                                @else
                                    <div class="pdf-header-logo-fallback">{{ $mhPlaceholder ?? 'MH' }}</div>
                                @endif
                            </td>
                            <td class="pdf-header-brand-text-cell" valign="middle">
                                @if(!empty($brand))
                                    <div class="pdf-header-brand-name">{{ $brand }}</div>
                                @endif
                                <div class="pdf-header-tagline">{{ $tagline }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="pdf-header-col pdf-header-col--doc" width="48%" valign="top">
                    <div class="pdf-header-doc-title">{{ $documentTitle }}</div>
                    @if(filled($documentSubtitle))
                        <div class="pdf-header-doc-sub">{{ $documentSubtitle }}</div>
                    @endif
                    <table class="pdf-header-meta-grid" cellpadding="0" cellspacing="0" border="0" width="100%">
                        @foreach($metaCells as $cell)
                            <tr>
                                <td class="pdf-header-meta-label">{{ ($cell['label'] ?? '').':' }}</td>
                                <td class="pdf-header-meta-value {{ !empty($cell['highlight']) ? 'pdf-header-meta-value--hl' : '' }}">{{ $cell['value'] ?? '—' }}</td>
                            </tr>
                        @endforeach
                    </table>
                </td>
            </tr>
        </table>
    </div>
</div>@endif

        <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['billed_to'] }}</div>
    <div class="pdf-section-body pdf-card">

            <div class="pdf-party-inner">
                <div class="pdf-field pdf-field--light">
                    <div class="pdf-value">{{ $invoice->client?->name ?? '—' }}</div>
                </div>
                @if($invoice->client?->address)
                    <div class="pdf-field pdf-field--light">
                        <div class="pdf-label">{{ $c['address'] ?? 'Address' }}</div>
                        <div class="pdf-value">{{ $invoice->client->address }}</div>
                    </div>
                @endif
                @if($invoice->client?->phone)
                    <div class="pdf-field pdf-field--light">
                        <div class="pdf-label">{{ $c['phone'] }}</div>
                        <div class="pdf-value">{{ $invoice->client->phone }}</div>
                    </div>
                @endif
            </div>
            </div>
</div>


        <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['lines_section'] }}</div>
    <div class="pdf-section-body pdf-card">

            <table class="pdf-table pdf-table--zebra" cellpadding="0" cellspacing="0" border="0">
                <thead>
                    <tr>
                        <th class="pdf-col-60">{{ $L['col_description'] }}</th>
                        <th class="pdf-text-end">{{ $L['col_qty'] }}</th>
                        <th class="pdf-text-end">{{ $L['col_unit_price'] }}</th>
                        <th class="pdf-text-end">{{ $L['col_total'] }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($invoice->items as $item)
                        <tr>
                            <td>
                                {{ $item->description }}
                                @if($item->item && $item->item->name !== $item->description)
                                    <div class="pdf-item-desc-sub">({{ $item->item->name }})</div>
                                @endif
                            </td>
                            <td class="pdf-text-end">{{ $item->quantity }}</td>
                            <td class="pdf-text-end">{{ number_format($item->unit_price, 2) }}</td>
                            <td class="pdf-text-end">{{ number_format($item->line_total, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            </div>
</div>


        <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['totals_section'] }}</div>
    <div class="pdf-section-body pdf-card">

            <table class="pdf-totals-wrap" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td colspan="2">
                        <table class="pdf-totals-inner" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td>{{ $L['subtotal'] }}</td>
                                <td class="pdf-text-end">{{ number_format($invoice->total_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                            @if($invoice->is_vat_invoice)
                                <tr>
                                    <td>{{ $L['vat'] }}</td>
                                    <td class="pdf-text-end">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</td>
                                </tr>
                            @endif
                        </table>
                        <table class="pdf-total-box pdf-summary-box" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td>{{ $L['total'] }}</td>
                                <td class="pdf-text-end">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            </div>
</div>


        @if($invoice->notes)
            <div class="pdf-section">
    <div class="pdf-section-title pdf-section-header">{{ $L['notes'] }}</div>
    <div class="pdf-section-body pdf-card">

                <div class="pdf-party-inner">
                    {{ $invoice->notes }}
                </div>
                </div>
</div>

        @endif
    </div>
@else
@php abort(500); @endphp
@endif

            </div>
            <div class="pdf-footer" role="contentinfo">@if(isset($form))
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
@php
    $loc = $lang ?? 'en';
    $c = trans('pdf.common', [], $loc);
@endphp
<table class="pdf-footer-table" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr class="pdf-footer-row-main">
        <td class="pdf-footer-left-pane" width="60%" valign="top">
            <div class="pdf-footer-info">
                <strong>{{ $c['phone'] }}</strong> {{ $c['phone_value'] }}
                &nbsp;&nbsp;
                <strong>{{ $c['email'] }}</strong> {{ $c['email_value'] }}<br>
                <strong>{{ $c['address'] }}</strong> {{ $c['address_value'] }}
            </div>
        </td>
        <td class="pdf-footer-right-pane" width="40%" valign="bottom">
            <div class="pdf-footer-site">{{ $c['website_value'] }}</div>
        </td>
    </tr>
    <tr class="pdf-footer-row-accent">
        <td class="pdf-footer-orange-bar" width="60%">&nbsp;</td>
        <td class="pdf-footer-navy-bar" width="40%">&nbsp;</td>
    </tr>
</table>
    @endif
@elseif(isset($shipment))
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
@php
    $loc = $lang ?? 'en';
    $c = trans('pdf.common', [], $loc);
@endphp
<table class="pdf-footer-table" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr class="pdf-footer-row-main">
        <td class="pdf-footer-left-pane" width="60%" valign="top">
            <div class="pdf-footer-info">
                <strong>{{ $c['phone'] }}</strong> {{ $c['phone_value'] }}
                &nbsp;&nbsp;
                <strong>{{ $c['email'] }}</strong> {{ $c['email_value'] }}<br>
                <strong>{{ $c['address'] }}</strong> {{ $c['address_value'] }}
            </div>
        </td>
        <td class="pdf-footer-right-pane" width="40%" valign="bottom">
            <div class="pdf-footer-site">{{ $c['website_value'] }}</div>
        </td>
    </tr>
    <tr class="pdf-footer-row-accent">
        <td class="pdf-footer-orange-bar" width="60%">&nbsp;</td>
        <td class="pdf-footer-navy-bar" width="40%">&nbsp;</td>
    </tr>
</table>
    @endif
@elseif(isset($invoice))
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
@php
    $loc = $lang ?? 'en';
    $c = trans('pdf.common', [], $loc);
@endphp
<table class="pdf-footer-table" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr class="pdf-footer-row-main">
        <td class="pdf-footer-left-pane" width="60%" valign="top">
            <div class="pdf-footer-info">
                <strong>{{ $c['phone'] }}</strong> {{ $c['phone_value'] }}
                &nbsp;&nbsp;
                <strong>{{ $c['email'] }}</strong> {{ $c['email_value'] }}<br>
                <strong>{{ $c['address'] }}</strong> {{ $c['address_value'] }}
            </div>
        </td>
        <td class="pdf-footer-right-pane" width="40%" valign="bottom">
            <div class="pdf-footer-site">{{ $c['website_value'] }}</div>
        </td>
    </tr>
    <tr class="pdf-footer-row-accent">
        <td class="pdf-footer-orange-bar" width="60%">&nbsp;</td>
        <td class="pdf-footer-navy-bar" width="40%">&nbsp;</td>
    </tr>
    <tr class="pdf-footer-row-generated">
        <td class="pdf-footer-generated-cell" colspan="2" valign="top">
            {{ __('pdf.common.generated_footer', ['datetime' => now()->format('Y-m-d H:i:s')], $loc) }}
        </td>
    </tr>
</table>
    @endif
@endif
            </div>
@php $pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc(); @endphp
@if($pdfFooterBanner)
<table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
    <tr>
        <td class="pdf-footer-fullbleed__cell">
            <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
        </td>
    </tr>
</table>
@endif
        </div>
    </div>
</div>
</body>
</html>