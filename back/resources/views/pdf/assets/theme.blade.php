{{-- Unified PDF theme: invoice, shipment, SD form PDFs. Use literal colors/sizes below — mPDF does not resolve var() in borders (empty color → crash in _setBorderLine). :root kept for reference only. --}}
<style>
    @font-face {
        font-family: 'Amiri';
        src: url('{{ str_replace('\\', '/', resource_path('fonts/Amiri-Regular.ttf')) }}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }

    :root {
        --pdf-primary: #ec7f00;
        --pdf-primary-dark: #bd6b02;
        --pdf-secondary-bg: #F2F2F2;
        --pdf-text: #333333;
        --pdf-text-muted: #666666;
        --pdf-border: #dddddd;
        --pdf-white: #ffffff;
        --pdf-table-header-bg: #11354d;
        --pdf-table-header-fg: #ffffff;
        --pdf-radius: 8px;
        --pdf-radius-lg: 12px;
    }

    * {
        box-sizing: border-box;
    }

    html {
        margin: 0;
        padding: 0;
    }

    body.pdf-body {
        margin: 0;
        padding: 0;
        font-size: 10.5px;
        line-height: 1.45;
        color: #333333;
        background: #ffffff;
        position: relative;
    }

    html[dir="ltr"] body.pdf-body {
        font-family: 'DejaVu Sans', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        direction: ltr;
        text-align: left;
    }

    html[dir="rtl"] body.pdf-body {
        font-family: 'Amiri', 'DejaVu Sans', sans-serif;
        direction: rtl;
        text-align: right;
    }

    /* Full-bleed strip above padded content (file: public/images/header.png) */
    .pdf-page-header {
        position: relative;
        z-index: 1;
        width: 100%;
        margin: 0 0 16px;
        padding: 0;
        line-height: 0;
        overflow: hidden;
        font-size: 0;
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

    .pdf-container {
        position: relative;
        z-index: 1;
        max-width: 100%;
        padding: 0 12px 16px;
    }

    .pdf-header {
        width: 100%;
        margin-bottom: 14px;
        border-bottom: 3px solid #ec7f00;
        padding-bottom: 10px;
        background: #ffffff;
    }

    .pdf-header__table {
        width: 100%;
        border-collapse: collapse;
    }

    .pdf-header__table td {
        vertical-align: middle;
        border: none;
        padding: 8px 4px;
    }

    .pdf-header__logo {
        width: 96px;
    }

    .pdf-header__logo-img {
        height: 48px;
        width: auto;
        max-width: 88px;
        display: block;
    }

    .pdf-header__logo-fallback {
        width: 72px;
        height: 40px;
        background: #F2F2F2;
        border: 2px solid #ec7f00;
        text-align: center;
        line-height: 36px;
        font-size: 8px;
        font-weight: 700;
        color: #333333;
    }

    .pdf-header__brand-cell {
        vertical-align: middle;
    }

    .pdf-header__brand-stack {
        line-height: 1.25;
    }

    .pdf-header__brand-line {
        display: block;
        font-size: 14px;
        font-family: 'DejaVu Sans', sans-serif;
        font-weight: bold;
        letter-spacing: 0.14em;
        color: #ec7f00;
        text-transform: uppercase;
        margin: 0 0 4px;
        padding: 0;
        max-width: 100%;
    }

    .pdf-header__brand-line strong {
        font-weight: bold;
        color: inherit;
        letter-spacing: inherit;
    }

    .pdf-header__brand-tag {
        display: block;
        margin: 6px 0 0;
        font-size: 8.5px;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: #11354d;
        text-transform: uppercase;
        opacity: 0.78;
        line-height: 1.45;
    }

    .pdf-header__doc {
        width: 34%;
        text-align: end;
    }

    html[dir="rtl"] .pdf-header__doc {
        text-align: start;
    }

    .pdf-header__title {
        font-size: 16px;
        font-weight: 700;
        color: #ec7f00;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin: 0;
        line-height: 1.2;
    }

    .pdf-header__meta-list {
        margin: 10px 0 0;
        padding: 0;
        text-align: inherit;
        width: 100%;
    }

    .pdf-header__meta-row {
        display: block;
        font-size: 10px;
        line-height: 1.55;
        margin: 0 0 5px;
        padding: 0 0 5px;
        border-bottom: 1px solid #e2e8f0;
        text-align: inherit;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .pdf-header__meta-row:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }

    .pdf-header__meta-label {
        font-weight: 700;
        color: #11354d;
    }

    .pdf-header__meta-val {
        font-weight: 600;
        color: #11354d;
        margin-inline-start: 0.35em;
    }

    .pdf-header__subtitle {
        font-size: 10px;
        font-weight: 600;
        color: #666666;
        margin-top: 4px;
        line-height: 1.3;
    }

    .pdf-meta-panel {
        width: 100%;
        border-collapse: collapse;
        background: #F2F2F2;
        border: 1px solid #dddddd;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 8px;
    }

    .pdf-meta-panel td {
        border: none;
        padding: 8px 12px;
        vertical-align: top;
        width: 50%;
        font-size: 10px;
        color: #333333;
    }

    .pdf-meta-panel tr + tr td {
        border-top: 1px solid #dddddd;
    }

    .pdf-meta-panel td + td {
        border-left: 1px solid #dddddd;
    }

    html[dir="rtl"] .pdf-meta-panel td + td {
        border-left: none;
        border-right: 1px solid #dddddd;
    }

    .pdf-meta-badge {
        display: inline-block;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        background: #ec7f00;
        color: #ffffff;
        font-size: 8px;
        font-weight: 700;
        margin-inline-end: 8px;
        vertical-align: middle;
        border-radius: 3px;
    }

    .pdf-meta-strong {
        font-weight: 600;
        color: #333333;
    }

    .pdf-meta-val {
        color: #666666;
    }

    .pdf-meta-sep {
        color: #666666;
        padding: 0 0.25em;
    }

    .pdf-cell-dir-auto {
        unicode-bidi: plaintext;
    }

    .pdf-section {
        margin: 0 0 12px;
    }

    .pdf-section__heading {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #ffffff;
        background: #ec7f00;
        margin: 0;
        padding: 7px 12px;
        border-radius: 8px 8px 0 0;
        border-left: 4px solid #11354d;
    }

    html[dir="rtl"] .pdf-section__heading {
        border-left: none;
        border-right: 4px solid #11354d;
    }

    .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        border: 1px solid #dddddd;
        border-top: none;
    }

    .pdf-table--standalone {
        border-top: 1px solid #dddddd;
        border-radius: 8px;
        overflow: hidden;
    }

    .pdf-table--flush-top {
        margin-top: -1px;
        border-radius: 0 0 8px 8px;
    }

    .pdf-table th,
    .pdf-table td {
        border: 1px solid #dddddd;
        padding: 8px 10px;
        vertical-align: top;
        text-align: inherit;
    }

    .pdf-table th {
        background: #11354d;
        color: #ffffff;
        font-size: 9px;
        font-weight: 700;
    }

    .pdf-table td {
        font-size: 10px;
        color: #333333;
        background: #ffffff;
    }

    .pdf-table tbody tr:nth-child(even) td {
        background: #F2F2F2;
    }

    .pdf-table--invoice-items th {
        background: #ec7f00;
        color: #ffffff;
    }

    .pdf-table--invoice-items tbody tr:nth-child(even) td {
        background: #F2F2F2;
    }

    .pdf-text-end {
        text-align: end;
    }

    html[dir="rtl"] .pdf-text-end {
        text-align: start;
    }

    .pdf-text-muted {
        color: #666666;
        font-size: 9px;
    }

    .pdf-text-muted-italic {
        color: #333333;
        font-style: italic;
        font-size: 10px;
    }

    .pdf-block-text {
        white-space: pre-wrap;
        word-wrap: break-word;
    }

    .pdf-label-strong {
        font-weight: 600;
        color: #333333;
    }

    .pdf-notes {
        border: 1px solid #dddddd;
        border-top: none;
        background: #F2F2F2;
        padding: 10px 12px;
        font-size: 10px;
        line-height: 1.5;
        color: #333333;
        border-radius: 0 0 8px 8px;
    }

    .pdf-footer {
        margin-top: 14px;
        padding: 12px 14px;
        background: #F2F2F2;
        border-top: 3px solid #ec7f00;
        font-size: 9px;
        color: #666666;
        border-radius: 0 0 8px 8px;
    }

    .pdf-footer__title {
        font-weight: 700;
        color: #333333;
        margin: 0 0 6px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .pdf-footer p {
        margin: 3px 0;
    }

    .pdf-footer strong {
        color: #333333;
    }

    /* Renders after .pdf-container (stack): true page-width footer graphic for mPDF */
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

    .pdf-total-box {
        margin-top: 12px;
        padding: 12px 16px;
        background: #ec7f00;
        color: #ffffff;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        text-align: end;
    }

    html[dir="rtl"] .pdf-total-box {
        text-align: start;
    }

    .pdf-total-box__label {
        display: block;
        font-size: 10px;
        font-weight: 600;
        opacity: 0.95;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .pdf-total-box__amount {
        font-size: 16px;
        letter-spacing: 0.02em;
    }

    .pdf-summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
    }

    .pdf-summary-table td {
        padding: 5px 0;
        border: none;
        font-size: 10px;
    }

    .pdf-summary-table .pdf-summary-row--grand td {
        font-weight: 700;
        font-size: 12px;
        padding-top: 10px;
        border-top: 2px solid #ec7f00;
    }

    .pdf-invoice-top {
        width: 100%;
        margin-bottom: 20px;
        border-collapse: collapse;
    }

    .pdf-invoice-top td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-invoice-brand {
        width: 50%;
    }

    .pdf-invoice-meta {
        width: 50%;
        text-align: end;
    }

    html[dir="rtl"] .pdf-invoice-meta {
        text-align: start;
    }

    .pdf-invoice-title {
        font-size: 22px;
        font-weight: 700;
        color: #ec7f00;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .pdf-party-grid {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }

    .pdf-party-grid td {
        vertical-align: top;
        border: none;
        padding: 0;
    }

    .pdf-party-grid__gap {
        width: 4%;
    }

    .pdf-party-card {
        width: 48%;
        border: 1px solid #dddddd;
        padding: 14px;
        background: #F2F2F2;
        border-radius: 8px;
    }

    .pdf-party-card--placeholder {
        visibility: hidden;
    }

    .pdf-party-card__label {
        font-size: 9px;
        color: #666666;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 6px;
    }

    .pdf-party-card__name {
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #333333;
    }

    .pdf-wrapper {
        border: 1px solid #dddddd;
        padding: 24px;
        border-radius: 12px;
        background: #ffffff;
    }

    .pdf-notes-block {
        margin-top: 24px;
        padding-top: 14px;
        border-top: 1px dashed #dddddd;
    }

    .pdf-notes-block__title {
        font-weight: 700;
        margin-bottom: 6px;
        color: #666666;
        font-size: 10px;
        text-transform: uppercase;
    }

    .pdf-footer--fixed {
        position: fixed;
        bottom: 24px;
        left: 24px;
        right: 24px;
        font-size: 9px;
        color: #666666;
        text-align: center;
    }

    .pdf-w-13 { width: 13%; }
    .pdf-w-14 { width: 14%; }
    .pdf-w-20 { width: 20%; }
    .pdf-w-22 { width: 22%; }
    .pdf-w-25 { width: 25%; }
    .pdf-w-32 { width: 32%; }
    .pdf-w-33 { width: 33.33%; }
    .pdf-w-34 { width: 34%; }
    .pdf-w-37 { width: 37.5%; }
    .pdf-w-40 { width: 40%; }
    .pdf-w-48 { width: 48%; }
    .pdf-w-50 { width: 50%; }
    .pdf-w-60 { width: 60%; }
    .pdf-w-spacer { width: 60%; }
    .pdf-w-totals { width: 40%; }

    .pdf-mt-sm { margin-top: 6px; }

    .pdf-brand-placeholder {
        font-size: 16px;
        font-weight: 700;
        color: #333333;
    }

    .pdf-brand-sub {
        font-size: 10px;
        color: #666666;
    }
</style>
