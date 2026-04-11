{{-- Unified PDF theme for mPDF: avoid var(), logical properties, and complex gradients on blocks (mPDF border parser crashes on empty color strings). --}}
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
        font-family: 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5px;
        line-height: 1.45;
        color: #333333;
        background: #ffffff;
    }

    html[dir="rtl"] body.pdf-root {
        font-family: 'DejaVu Sans', 'Amiri', 'Tahoma', sans-serif;
    }

    .pdf-container {
        position: relative;
        min-height: 100%;
        padding: 0;
        overflow: hidden;
        background-color: #ffffff;
    }

    .pdf-decor {
        background-color: #ffffff;
    }

    .pdf-main {
        padding: 0 12px 8px;
    }

    .pdf-header {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 14px;
        background-color: #222222;
        border-bottom: 3px solid #FF8C00;
    }

    .pdf-header.pdf-header--custom {
        margin-bottom: 14px;
        background: transparent;
        border-bottom: none;
    }

    .pdf-header td {
        border: none;
        vertical-align: middle;
        padding: 12px 14px;
        color: #ffffff;
    }

    .pdf-header__logo-cell {
        width: 88px;
        vertical-align: middle;
    }

    .pdf-header__logo-img {
        height: 44px;
        width: auto;
        max-width: 84px;
        display: block;
    }

    .pdf-header__logo-fallback {
        width: 64px;
        height: 40px;
        background: #ffffff;
        border: 2px solid #FF8C00;
        text-align: center;
        line-height: 36px;
        font-size: 11px;
        font-weight: 700;
        color: #FF8C00;
    }

    .pdf-header__brand-line {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #ffffff;
    }

    .pdf-header__brand-sep {
        color: #FF8C00;
        font-weight: 400;
        padding: 0 0.35em;
    }

    .pdf-header__brand-tag {
        font-size: 9.5px;
        font-weight: 400;
        color: #e5e5e5;
    }

    .pdf-header__title-wrap {
        width: 34%;
        text-align: right;
    }

    [dir="rtl"] .pdf-header__title-wrap {
        text-align: left;
    }

    .pdf-header__title {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.04em;
    }

    .pdf-header__subtitle {
        font-size: 10px;
        font-weight: 600;
        color: #f0f0f0;
        margin-top: 3px;
    }

    .pdf-header-inner {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-header-inner td {
        padding: 0;
        border: none;
    }

    .pdf-meta-panel {
        width: 100%;
        border-collapse: collapse;
        background: #3a3a3a;
        border: 1px solid #FF8C00;
    }

    .pdf-meta-panel td {
        border: none;
        padding: 8px 12px;
        vertical-align: top;
        width: 50%;
        font-size: 10px;
        color: #ffffff;
    }

    .pdf-meta-panel tr + tr td {
        border-top: 1px solid #555555;
    }

    .pdf-meta-panel td + td {
        border-left: 1px solid #555555;
    }

    [dir="rtl"] .pdf-meta-panel td + td {
        border-left: none;
        border-right: 1px solid #555555;
    }

    .pdf-meta-icon {
        display: inline-block;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        background: #FF8C00;
        color: #ffffff;
        font-size: 8px;
        font-weight: 700;
        margin-right: 8px;
        vertical-align: middle;
    }

    [dir="rtl"] .pdf-meta-icon {
        margin-right: 0;
        margin-left: 8px;
    }

    .pdf-meta-strong {
        font-weight: 600;
        color: #ffffff;
    }

    .pdf-meta-val {
        color: #eeeeee;
    }

    .pdf-section {
        margin: 0 0 12px;
    }

    .pdf-section__title {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #ffffff;
        background-color: #FF8C00;
        margin: 0;
        padding: 7px 10px;
        border-left: 4px solid #2a2a2a;
    }

    [dir="rtl"] .pdf-section__title {
        border-left: none;
        border-right: 4px solid #2a2a2a;
    }

    .pdf-grid {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }

    .pdf-grid th,
    .pdf-grid td {
        border: 1px solid #444444;
        padding: 7px 8px;
        vertical-align: top;
    }

    .pdf-grid th {
        background-color: #F2F2F2;
        font-size: 9px;
        font-weight: 700;
        color: #333333;
        text-align: left;
    }

    [dir="rtl"] .pdf-grid th {
        text-align: right;
    }

    .pdf-grid td {
        font-size: 10px;
        color: #333333;
        background-color: #ffffff;
    }

    .pdf-grid--flush-top {
        margin-top: -1px;
    }

    .pdf-label-strong {
        font-weight: 600;
        color: #333333;
    }

    .pdf-muted {
        color: #666666;
    }

    .pdf-block-text {
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .pdf-notes-block {
        border: 1px solid #444444;
        border-top: none;
        background-color: #F2F2F2;
        padding: 8px 10px;
        font-size: 10px;
        line-height: 1.5;
        color: #333333;
    }

    .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 16px;
    }

    .pdf-table th,
    .pdf-table td {
        border: 1px solid #dddddd;
        padding: 8px 10px;
        vertical-align: top;
    }

    .pdf-table th {
        background-color: #F2F2F2;
        font-size: 9.5px;
        font-weight: 700;
        color: #333333;
        text-align: left;
    }

    [dir="rtl"] .pdf-table th {
        text-align: right;
    }

    .pdf-table--zebra tbody tr:nth-child(even) td {
        background-color: #fafafa;
    }

    .pdf-table tbody td {
        background-color: #ffffff;
    }

    .pdf-text-end {
        text-align: right;
    }

    [dir="rtl"] .pdf-text-end {
        text-align: left;
    }

    .pdf-invoice-shell {
        border: 1px solid #dddddd;
        padding: 22px;
        background-color: #ffffff;
    }

    .pdf-invoice-header-table {
        width: 100%;
        margin-bottom: 22px;
        border-collapse: collapse;
    }

    .pdf-invoice-header-table td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-invoice-company {
        width: 50%;
    }

    .pdf-invoice-company-name {
        font-size: 17px;
        font-weight: 700;
        color: #333333;
        margin-bottom: 4px;
    }

    .pdf-invoice-meta {
        width: 50%;
        text-align: right;
    }

    [dir="rtl"] .pdf-invoice-meta {
        text-align: left;
    }

    .pdf-invoice-doc-title {
        font-size: 26px;
        font-weight: 700;
        color: #FF8C00;
        margin-bottom: 8px;
        letter-spacing: 0.02em;
    }

    .pdf-party-table {
        width: 100%;
        margin-bottom: 20px;
        border-collapse: collapse;
    }

    .pdf-party-table td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-party-box {
        width: 100%;
        border: 1px solid #dddddd;
        padding: 14px;
        background-color: #F2F2F2;
    }

    .pdf-party-label {
        font-size: 9px;
        color: #666666;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 6px;
    }

    .pdf-party-name {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #333333;
    }

    .pdf-totals-wrap {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
    }

    .pdf-totals-wrap td {
        border: none;
        vertical-align: top;
        padding: 0;
    }

    .pdf-totals-inner {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-totals-inner td {
        padding: 5px 0;
        border: none;
    }

    .pdf-total-box {
        margin-top: 10px;
        padding: 12px 14px;
        background-color: #FF8C00;
        color: #ffffff;
        font-size: 15px;
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
        border-spacing: 0;
    }

    .pdf-notes-section {
        margin-top: 22px;
        padding-top: 14px;
        border-top: 1px dashed #dddddd;
    }

    .pdf-notes-section__title {
        font-weight: 700;
        margin-bottom: 6px;
        color: #666666;
        font-size: 10px;
        text-transform: uppercase;
    }

    .pdf-footer {
        margin-top: 14px;
        padding: 12px 14px;
        background-color: #F2F2F2;
        border-top: 3px solid #FF8C00;
        font-size: 9px;
        color: #666666;
    }

    .pdf-footer__heading {
        font-weight: 700;
        color: #333333;
        margin: 0 0 6px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .pdf-footer p {
        margin: 3px 0;
    }

    .pdf-footer__key {
        font-weight: 600;
        color: #333333;
    }

    .pdf-footer__generated {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #dddddd;
        font-size: 8.5px;
        color: #888888;
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

    .pdf-italic-muted {
        color: #333333;
        font-style: italic;
    }

    .pdf-item-desc-sub {
        font-size: 9px;
        color: #666666;
    }
</style>
