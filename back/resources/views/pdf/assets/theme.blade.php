{{-- Unified PDF design system (mPDF): #FF8A00 primary, #1C1C1C header, #F5F5F5 fills, #DDDDDD borders, #333333 text. No var(). --}}
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
        padding: 0 12px 10px;
    }

    .pdf-header {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 14px;
        background-color: #1C1C1C;
        border-bottom: 3px solid #FF8A00;
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
        width: 90px;
        padding-right: 12px;
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
        color: #ffffff;
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
        width: 34%;
        text-align: right;
    }

    [dir="rtl"] .pdf-header__title-wrap {
        text-align: left;
    }

    .pdf-header__title {
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .pdf-header__subtitle {
        font-size: 9.5px;
        font-weight: 600;
        color: #e0e0e0;
        margin-top: 3px;
        letter-spacing: 0.04em;
    }

    .pdf-header__row--meta td {
        padding: 0 12px 12px;
        border: none;
    }

    .pdf-header-meta {
        width: 100%;
        border-collapse: collapse;
        background-color: #2a2a2a;
        border: 1px solid #444444;
        border-left: 4px solid #FF8A00;
    }

    .pdf-header-meta__cell {
        padding: 10px 12px;
        border: none;
        vertical-align: top;
        width: 50%;
    }

    .pdf-header-meta tr + tr .pdf-header-meta__cell {
        border-top: 1px solid #444444;
    }

    .pdf-header-meta .pdf-header-meta__cell + .pdf-header-meta__cell {
        border-left: 1px solid #444444;
    }

    [dir="rtl"] .pdf-header-meta .pdf-header-meta__cell + .pdf-header-meta__cell {
        border-left: none;
        border-right: 1px solid #444444;
    }

    .pdf-field {
        margin: 0;
    }

    .pdf-label {
        font-size: 8px;
        font-weight: 700;
        color: #aaaaaa;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 4px;
    }

    .pdf-value {
        font-size: 10.5px;
        font-weight: 700;
        color: #333333;
    }

    .pdf-header-meta .pdf-value {
        color: #f5f5f5;
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
        margin: 0 0 12px;
    }

    .pdf-section-title {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #ffffff;
        background-color: #FF8A00;
        margin: 0;
        padding: 8px 12px;
        line-height: 1.3;
    }

    .pdf-section-body {
        background-color: #ffffff;
        border: 1px solid #DDDDDD;
        border-top: none;
        padding: 0;
    }

    .pdf-grid {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .pdf-grid th,
    .pdf-grid td {
        border: 1px solid #DDDDDD;
        padding: 8px 10px;
        vertical-align: top;
    }

    .pdf-grid th {
        background-color: #F5F5F5;
        font-size: 8.5px;
        font-weight: 700;
        color: #666666;
        text-transform: uppercase;
        letter-spacing: 0.06em;
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
        background-color: #F9F9F9;
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
        border: 1px solid #DDDDDD;
        border-top: none;
        background-color: #F5F5F5;
        padding: 10px 12px;
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
        border: 1px solid #DDDDDD;
        padding: 0 8px 12px;
        background-color: #ffffff;
    }

    .pdf-invoice-header-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0;
        background-color: #1C1C1C;
        border-bottom: 3px solid #FF8A00;
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

    .pdf-invoice-meta .pdf-field .pdf-label {
        color: #aaaaaa;
    }

    .pdf-invoice-meta .pdf-field .pdf-value {
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
        padding: 14px 16px;
        background-color: #F5F5F5;
    }

    .pdf-party-inner > .pdf-field:first-child .pdf-value {
        font-size: 14px;
    }

    .pdf-party-box {
        border: 1px solid #DDDDDD;
        border-top: none;
        padding: 14px 16px;
        background-color: #F5F5F5;
    }

    .pdf-party-box .pdf-label {
        color: #666666;
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
        border: 1px solid #DDDDDD;
        padding: 9px 10px;
        vertical-align: top;
    }

    .pdf-table th {
        background-color: #F5F5F5;
        font-size: 8.5px;
        font-weight: 700;
        color: #666666;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-align: left;
    }

    [dir="rtl"] .pdf-table th {
        text-align: right;
    }

    .pdf-table--zebra tbody tr:nth-child(even) td {
        background-color: #F9F9F9;
    }

    .pdf-table tbody td {
        font-size: 10px;
        font-weight: 600;
        color: #333333;
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

    .pdf-total-box {
        margin-top: 8px;
        padding: 10px 16px;
        background-color: #FF8A00;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
    }

    .pdf-total-box td {
        color: #ffffff;
        border: none;
        padding: 0;
    }

    table.pdf-total-box {
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
        margin-top: 12px;
        padding: 12px 14px;
        background-color: #F5F5F5;
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
