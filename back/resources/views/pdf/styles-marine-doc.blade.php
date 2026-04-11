{{-- Shipment / SD form layout. Use hex literals only: mPDF does not resolve CSS var() in borders (crashes in _setBorderLine). --}}
<style>
    .wrap { padding: 0; }
    table.header-band {
        width: 100%;
        border-collapse: collapse;
        background: #1f2a60;
        margin: 0 0 14px;
    }
    table.header-band > tbody > tr > td {
        border: none;
        vertical-align: top;
        padding: 0;
    }
    .header-row1 td {
        border: none;
        vertical-align: middle;
        padding: 14px 16px 10px;
    }
    .header-logo img {
        height: 48px;
        width: auto;
        max-width: 88px;
        display: block;
    }
    .brand-line {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #ffffff;
        line-height: 1.35;
    }
    .brand-sep {
        color: #f97316;
        font-weight: 400;
        padding: 0 0.35em;
    }
    .brand-tag {
        font-size: 10px;
        font-weight: 400;
        letter-spacing: 0.02em;
        color: #ffffff;
    }
    .doc-title {
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.03em;
        text-align: right;
        line-height: 1.3;
    }
    td.header-row2 {
        border: none;
        padding: 0 16px 14px !important;
        vertical-align: top;
    }
    table.meta-panel {
        width: 100%;
        border-collapse: collapse;
        background: #243056;
        border: 1px solid #f97316;
    }
    table.meta-panel td {
        border: none;
        padding: 8px 12px;
        vertical-align: top;
        width: 50%;
        font-size: 10px;
        color: #ffffff;
    }
    table.meta-panel tr + tr td {
        border-top: 1px solid #364785;
    }
    table.meta-panel td + td {
        border-left: 1px solid #364785;
    }
    .meta-icon {
        display: inline-block;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        background: #f97316;
        color: #ffffff;
        font-size: 8px;
        font-weight: 700;
        margin-right: 8px;
        vertical-align: middle;
    }
    .meta-item strong {
        color: #ffffff;
        font-weight: 600;
    }
    .meta-val {
        color: #f1f5f9;
    }
    .body-pad {
        padding: 0 14px 16px;
    }
    .sec {
        margin: 0 0 10px;
    }
    .sec-h {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #ffffff;
        background: #f97316;
        margin: 0;
        padding: 6px 10px;
        border-left: 4px solid #1f2a60;
    }
    table.grid {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
    }
    table.grid th,
    table.grid td {
        border: 1px solid #1f2a60;
        padding: 6px 8px;
        vertical-align: top;
    }
    table.grid th {
        background: #ffffff;
        font-size: 9px;
        font-weight: 700;
        color: #1f2a60;
        text-align: left;
    }
    table.grid td {
        font-size: 10px;
        color: #0f172a;
        background: #eef1f6;
    }
    .lbl {
        color: #1f2a60;
        font-weight: 600;
    }
    .cell-muted {
        color: #94a3b8;
    }
    .block-text {
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    .notes {
        border-left: 1px solid #1f2a60;
        border-right: 1px solid #1f2a60;
        border-bottom: 1px solid #1f2a60;
        background: #eef1f6;
        padding: 8px 10px;
        margin-top: 0;
        font-size: 10px;
        line-height: 1.5;
        color: #0f172a;
    }
    .footer {
        margin-top: 12px;
        padding: 10px 14px;
        background: #f1f5f9;
        border-top: 3px solid #f97316;
        font-size: 9px;
        color: #475569;
    }
    .footer-h {
        font-weight: 700;
        color: #1f2a60;
        margin: 0 0 5px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }
    .footer p { margin: 2px 0; }
    .footer strong { color: #0f172a; }
    .sd-notify-same {
        color: #1f2a60;
        font-style: italic;
    }

    .header-row1 .header-brand-cell {
        border: none;
        vertical-align: middle;
        padding-left: 10px;
        padding-right: 12px;
    }
    .header-row1 .header-doc-title-cell {
        width: 32%;
        border: none;
        vertical-align: middle;
        text-align: right;
    }
    html[dir="rtl"] .doc-title {
        text-align: left;
    }
    html[dir="rtl"] .header-row1 .header-brand-cell {
        padding-left: 12px;
        padding-right: 10px;
    }
    html[dir="rtl"] .header-row1 .header-doc-title-cell {
        text-align: left !important;
    }
    html[dir="rtl"] .meta-icon {
        margin-right: 0;
        margin-left: 8px;
    }
    html[dir="rtl"] table.meta-panel td + td {
        border-left: none;
        border-right: 1px solid #364785;
    }
    html[dir="rtl"] .sec-h {
        border-left: none;
        border-right: 4px solid #1f2a60;
    }
    html[dir="rtl"] table.grid th,
    html[dir="rtl"] table.grid td {
        text-align: right;
    }
</style>
