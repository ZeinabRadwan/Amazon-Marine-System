{{-- Corporate PDF design (mPDF): #1C1C1C header, #FF8A00 accent, #2A2A2A meta, zebra #F7F7F7. Utilities: .pdf-card .pdf-dark-header .pdf-section-header .pdf-summary-box. No var(). --}}
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

    html[dir="rtl"] body.pdf-root {
        font-family: 'Inter', 'Poppins', 'DejaVu Sans', 'Amiri', 'Tahoma', sans-serif;
    }

    .pdf-container {
        position: relative;
        width: 100%;
        padding: 0;
        background-color: #ffffff;
    }

    .pdf-main {
        padding: 0 14px 14px;
    }

    .pdf-header,
    .pdf-dark-header {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 16px;
        background-color: #1C1C1C;
        border-bottom: 4px solid #FF8A00;
    }

    .pdf-header.pdf-header--custom {
        margin-bottom: 14px;
        background-color: transparent;
        border-bottom: none;
    }

    .pdf-header__row--brand td {
        padding: 12px 14px 10px;
        border: none;
        vertical-align: middle;
    }

    .pdf-header-inner {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-header-inner td {
        border: none;
        vertical-align: middle;
        padding: 0;
    }

    .pdf-header__logo-cell {
        width: 92px;
        padding-right: 14px;
    }

    [dir="rtl"] .pdf-header__logo-cell {
        padding-right: 0;
        padding-left: 14px;
    }

    .pdf-header__logo-img {
        height: 46px;
        width: auto;
        max-width: 86px;
        display: block;
    }

    .pdf-header__logo-fallback {
        width: 56px;
        height: 38px;
        background-color: #ffffff;
        border: 2px solid #FF8A00;
        text-align: center;
        line-height: 34px;
        font-size: 10px;
        font-weight: 700;
        color: #FF8A00;
    }

    .pdf-header__brand-cell {
        width: 58%;
        color: #ffffff;
        vertical-align: middle;
    }

    .pdf-header__brand-line {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #ffffff;
    }

    .pdf-header__brand-sep {
        color: #FF8A00;
        padding: 0 0.35em;
        font-weight: 400;
    }

    .pdf-header__brand-tag {
        font-size: 9.5px;
        font-weight: 400;
        color: #cccccc;
    }

    .pdf-header__title-wrap {
        width: 32%;
        text-align: right;
        vertical-align: middle;
    }

    [dir="rtl"] .pdf-header__title-wrap {
        text-align: left;
    }

    .pdf-header__title {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .pdf-header__subtitle {
        font-size: 9px;
        font-weight: 600;
        color: #cccccc;
        margin-top: 4px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .pdf-header__row--meta td {
        padding: 0 12px 12px;
        border: none;
    }

    .pdf-header-meta {
        width: 100%;
        border-collapse: collapse;
        background-color: #2A2A2A;
        border: 1px solid #3D3D3D;
        border-left: 5px solid #FF8A00;
        border-radius: 3px;
    }

    .pdf-header-meta__cell {
        padding: 12px 14px;
        border: none;
        vertical-align: top;
        width: 50%;
    }

    .pdf-header-meta tr + tr .pdf-header-meta__cell {
        border-top: 1px solid #404040;
    }

    .pdf-header-meta .pdf-header-meta__cell + .pdf-header-meta__cell {
        border-left: 1px solid #404040;
    }

    [dir="rtl"] .pdf-header-meta .pdf-header-meta__cell + .pdf-header-meta__cell {
        border-left: none;
        border-right: 1px solid #404040;
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
        border: 1px solid #FF8A00;
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
        background-color: #FF8A00;
        margin: 0;
        padding: 10px 14px;
        line-height: 1.35;
        border-radius: 3px 3px 0 0;
    }

    .pdf-section-body,
    .pdf-card {
        background-color: #ffffff;
        border: 1px solid #E0E0E0;
        border-top: none;
        padding: 14px 16px;
        border-radius: 0 0 3px 3px;
    }

    .pdf-grid {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .pdf-grid th,
    .pdf-grid td {
        border: 1px solid #D8D8D8;
        padding: 9px 11px;
        vertical-align: top;
    }

    .pdf-grid th {
        background-color: #FF8A00;
        font-size: 8px;
        font-weight: 700;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-align: left;
    }

    [dir="rtl"] .pdf-grid th {
        text-align: right;
    }

    .pdf-grid td {
        font-size: 10px;
        font-weight: 600;
        color: #333333;
        background-color: #ffffff;
    }

    .pdf-grid tbody tr:nth-child(even) td {
        background-color: #F7F7F7;
    }

    .pdf-grid--flush-top {
        margin-top: -1px;
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
        background-color: #1C1C1C;
        border-bottom: 4px solid #FF8A00;
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
        color: #FF8A00;
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

    .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .pdf-table th,
    .pdf-table td {
        border: 1px solid #D8D8D8;
        padding: 9px 11px;
        vertical-align: top;
    }

    .pdf-table th {
        background-color: #FF8A00;
        font-size: 8px;
        font-weight: 700;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-align: left;
    }

    [dir="rtl"] .pdf-table th {
        text-align: right;
    }

    .pdf-table--zebra tbody tr:nth-child(even) td {
        background-color: #F7F7F7;
    }

    .pdf-table tbody td {
        font-size: 10px;
        font-weight: 600;
        color: #333333;
        background-color: #ffffff;
    }

    .pdf-table--zebra tbody tr:nth-child(odd) td {
        background-color: #ffffff;
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
        background-color: #FF8A00;
        color: #ffffff;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.04em;
        border: 1px solid #E67300;
        border-left: 5px solid #E67300;
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
        margin-top: 16px;
        padding: 14px 16px;
        background-color: #F0F0F0;
        border-top: 2px solid #FF8A00;
        font-size: 9px;
        color: #555555;
    }

    .pdf-footer__heading {
        font-weight: 700;
        color: #333333;
        margin: 0 0 8px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .pdf-footer__row {
        margin: 4px 0;
    }

    .pdf-footer .pdf-label {
        color: #888888;
        display: inline-block;
        min-width: 52px;
        margin-bottom: 0;
        font-size: 8.5px;
    }

    .pdf-footer .pdf-value {
        color: #333333;
        font-weight: 600;
        font-size: 9.5px;
        display: inline;
    }

    .pdf-footer__generated {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #DDDDDD;
        font-size: 8px;
        color: #999999;
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
</style>
