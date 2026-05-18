{{-- Quotation PDF layout (aligned with invoice document structure) --}}
.pdf-quote-doc.pdf-inv-html {
    direction: ltr;
    text-align: left;
}
.pdf-quote-doc .pdf-inv-header-title-en {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: #ec7f00;
}
.pdf-quote-doc .pdf-inv-header-title-ar {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    font-weight: 700;
    color: #0f2d4a;
    direction: rtl;
    text-align: right;
}
.pdf-quote-header-meta {
    margin-top: 6px;
    text-align: right;
}
.pdf-quote-header-meta__row {
    margin-bottom: 3px;
    font-size: 9px;
    line-height: 1.35;
}
.pdf-quote-header-meta__label {
    color: #64748b;
    font-weight: 600;
    margin-right: 6px;
}
.pdf-quote-header-meta__val {
    color: #0f2d4a;
    font-weight: 700;
}
.pdf-inv-meta-row--quote .pdf-inv-meta-cell {
    width: 33%;
}
.pdf-inv-panel-wrap {
    border: 1px solid #dde3ed;
    border-radius: 8px;
    overflow: hidden;
    margin: 0 0 12px;
    background: #ffffff;
}
.pdf-inv-meta-row {
    width: 100%;
    border-collapse: collapse;
    background: #ffffff;
    border: none;
    margin: 0;
    table-layout: fixed;
}
.pdf-inv-meta-row tr td.pdf-inv-meta-cell {
    vertical-align: middle;
    padding: 8px 6px;
    border: none;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
}
.pdf-inv-meta-row tr td.pdf-inv-meta-sep {
    width: 1px;
    min-width: 1px;
    max-width: 1px;
    padding: 0 !important;
    background: #cbd5e1;
    vertical-align: middle;
    border: none;
    font-size: 0;
    line-height: 0;
}
.pdf-inv-meta-en {
    font-size: 7.5px;
    font-weight: 700;
    color: #ec7f00;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.1;
    margin: 0;
}
.pdf-inv-meta-ar {
    font-size: 7px;
    color: #64748b;
    line-height: 1.1;
    margin: 0 0 2px;
    direction: rtl;
    unicode-bidi: embed;
    text-align: center;
}
.pdf-inv-meta-val {
    font-size: 9.5px;
    font-weight: 700;
    color: #0f2d4a;
    line-height: 1.15;
    white-space: nowrap;
}
.pdf-inv-meta-val-mono {
    font-family: DejaVu Sans Mono, monospace;
    font-size: 9.5px;
}
.pdf-inv-parties {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    border: none;
    margin: 0;
    background: #ffffff;
}
.pdf-inv-parties td {
    vertical-align: top;
    padding: 16px 18px;
    border: none;
    background: #ffffff;
}
.pdf-inv-party-div {
    width: 1px;
    min-width: 1px;
    max-width: 1px;
    padding: 0 !important;
    background: #e2e8f0;
    vertical-align: stretch;
    border: none;
    font-size: 0;
    line-height: 0;
}
.pdf-inv-party-role {
    font-size: 10px;
    font-weight: 700;
    color: #ec7f00;
    text-transform: none;
    letter-spacing: 0.02em;
    margin: 0 0 3px;
    line-height: 1.25;
}
.pdf-inv-party-role-ar {
    font-size: 7.5px;
    font-weight: 500;
    color: #94a3b8;
    margin: 0 0 10px;
    line-height: 1.35;
    direction: rtl;
    unicode-bidi: embed;
}
.pdf-inv-party-right .pdf-inv-party-role-ar {
    text-align: right;
}
.pdf-inv-party-name {
    font-size: 13px;
    font-weight: 700;
    color: #0f2d4a;
    margin: 0 0 8px;
    line-height: 1.25;
}
.pdf-inv-party-company {
    margin: -4px 0 8px;
    font-weight: 700;
    font-size: 11px;
    color: #0f2d4a;
    line-height: 1.35;
}
.pdf-inv-party-detail {
    font-size: 9px;
    font-weight: 400;
    color: #64748b;
    line-height: 1.55;
}
.pdf-inv-party-detail strong {
    font-weight: 600;
    color: #64748b;
}
.pdf-inv-party-right {
    text-align: right;
}
.pdf-inv-party-right .pdf-inv-party-role,
.pdf-inv-party-right .pdf-inv-party-name,
.pdf-inv-party-right .pdf-inv-party-company,
.pdf-inv-party-right .pdf-inv-party-detail {
    text-align: right;
}
.pdf-inv-route-tpl-bar {
    width: 100%;
    border-collapse: collapse;
    background: #0f2d4a;
}
.pdf-inv-route-tpl-ports-cell {
    width: 52%;
    padding: 10px 10px 10px 18px;
}
.pdf-inv-route-tpl-metas-cell {
    width: 48%;
    padding: 10px 18px 10px 10px;
    text-align: right;
}
.pdf-inv-route-tpl-port-name {
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
}
.pdf-inv-route-tpl-port-lbl {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.4);
}
.pdf-inv-route-tpl-arrow {
    color: #ec7f00;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
}
.pdf-inv-route-tpl-rmeta-val {
    font-size: 11px;
    font-weight: 700;
    color: #ffffff;
}
.pdf-inv-route-tpl-rmeta-lbl {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.4);
}
.pdf-inv-route-tpl-rmeta--split {
    border-left: 1px solid #cbd5e1;
}
.pdf-quote-sailing-banner {
    background: #fff7ed;
    border: 1px solid #f5c77a;
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 14px;
}
.pdf-quote-sailing-banner__titles {
    margin-bottom: 6px;
}
.pdf-quote-sailing-banner__title-en {
    font-size: 11px;
    font-weight: 700;
    color: #ec7f00;
    margin-right: 8px;
}
.pdf-quote-sailing-banner__title-ar {
    font-size: 10px;
    font-weight: 600;
    color: #9a6200;
    direction: rtl;
}
.pdf-quote-sailing-banner__value {
    font-size: 11px;
    font-weight: 700;
    color: #0f2d4a;
    line-height: 1.45;
}
.pdf-inv-section-card {
    border: 1px solid #dde3ed;
    border-radius: 8px;
    margin-bottom: 14px;
    overflow: hidden;
}
.pdf-inv-sec-head {
    width: 100%;
    border-collapse: collapse;
    background: #0f2d4a;
}
.pdf-inv-sec-head td {
    padding: 8px 12px;
    background: #0f2d4a;
}
.pdf-inv-sec-title-en {
    font-size: 11px;
    font-weight: 700;
    color: #ffffff;
}
.pdf-inv-sec-title-ar {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    direction: rtl;
}
.pdf-inv-sec-total {
    text-align: right;
    font-size: 11px;
    font-weight: 700;
    color: #ec7f00;
    font-family: DejaVu Sans Mono, monospace;
}
.pdf-inv-table {
    width: 100%;
    border-collapse: collapse;
}
.pdf-inv-table thead th {
    padding: 8px;
    font-size: 8.5px;
    font-weight: 700;
    color: #64748b;
    border-bottom: 1px solid #dde3ed;
    text-transform: uppercase;
}
.pdf-inv-table tbody td {
    padding: 8px;
    font-size: 10px;
    border-bottom: 1px solid #f1f5f9;
}
.pdf-inv-table .pdf-inv-col-item {
    width: 42%;
}
.pdf-inv-table .pdf-inv-col-amt {
    width: 24%;
}
.pdf-inv-table .pdf-inv-col-cur {
    width: 13%;
}
.pdf-inv-table .pdf-inv-subtotal-row td {
    background: #fef3e8 !important;
    border-top: 3px solid #ec7f00;
    font-weight: 800;
    font-size: 11px;
    color: #0f2d4a;
    padding: 10px 10px !important;
    vertical-align: middle;
}
.pdf-inv-table .pdf-inv-subtotal-row td.pdf-inv-sub-amt {
    text-align: center;
    font-family: DejaVu Sans Mono, monospace;
    font-weight: 800;
    font-size: 12px;
    color: #ec7f00;
    letter-spacing: 0.02em;
}
.pdf-inv-table .pdf-inv-subtotal-row .pdf-inv-sub-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: #0f2d4a;
}
.pdf-inv-col-amt,
.pdf-inv-col-cur {
    text-align: center;
}
.notes-box {
    background: #fffbeb;
    border: 1px solid #f5c77a;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 0 0 14px;
    font-size: 10px;
    line-height: 1.55;
    color: #334155;
}
.notes-box .notes-title {
    font-size: 10.5px;
    font-weight: 700;
    color: #9a6200;
    margin-bottom: 6px;
}
.notes-box__ar {
    font-family: DejaVu Sans, Cairo, sans-serif;
    font-size: 9px;
    color: #9a6200;
    direction: rtl;
    display: block;
    margin-top: 4px;
    text-align: right;
    line-height: 1.55;
}
.pdf-inv-grand-wrap {
    background: #0f2d4a;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 14px;
}
.pdf-inv-grand-title {
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
}
.pdf-inv-grand-title-ar {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    direction: rtl;
}
.pdf-inv-grand-breakdown td {
    color: #ffffff;
    font-size: 10px;
    padding: 2px 0;
}
.pdf-inv-grand-cur .pdf-inv-gtr-val {
    text-align: right;
    font-weight: 700;
}
.pdf-inv-notes {
    border: 1px solid #dde3ed;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 12px;
    font-size: 10px;
}
.pdf-inv-terms-wrap {
    background: #f8fafc;
    border: 1px solid #dde3ed;
    border-radius: 8px;
    padding: 10px 14px 12px;
    margin-bottom: 8px;
}
.pdf-inv-terms-title {
    font-size: 11px;
    font-weight: 700;
    color: #0f2d4a;
    margin-bottom: 10px;
    text-align: left;
    letter-spacing: 0.02em;
    line-height: 1.45;
}
.pdf-inv-terms-list {
    margin: 0;
    padding: 0;
}
.pdf-inv-term-line {
    margin: 0 0 10px;
    padding: 0;
    font-size: 10px;
    line-height: 1.6;
    color: #475569;
    text-align: left;
    page-break-inside: avoid;
}
.pdf-inv-term-line:last-child {
    margin-bottom: 0;
}
.pdf-inv-term-num-plain {
    font-weight: 700;
    color: #0f2d4a;
    margin-right: 6px;
}
.pdf-inv-term-ar {
    font-size: 9px;
    color: #94a3b8;
    direction: rtl;
    text-align: right;
    margin-top: 4px;
    line-height: 1.55;
}

.pdf-quote-reefer-deferred-footnote-row td {
    border: none !important;
    padding: 4px 10px 8px !important;
    background: transparent !important;
}
.pdf-quote-reefer-deferred-footnote-cell {
    font-size: 10px;
    color: #94a3b8;
    text-align: right;
    vertical-align: middle;
}
.pdf-quote-reefer-deferred-footnote__plus {
    font-weight: 700;
    margin-right: 4px;
    color: #64748b;
}
.pdf-quote-reefer-deferred-footnote__power {
    font-style: italic;
    text-decoration: line-through;
    color: #b45309;
    opacity: 0.85;
}
.pdf-quote-ows-deferred-footnote__label {
    font-style: italic;
    text-decoration: line-through;
    color: #6d28d9;
    opacity: 0.9;
}
.pdf-quote-reefer-deferred-footnote__line {
    line-height: 1.45;
}
.pdf-quote-reefer-deferred-footnote__line--free {
    margin-top: 2px;
    font-style: italic;
    color: #94a3b8;
}
.pdf-quote-reefer-deferred-footnote__rate {
    font-style: italic;
    margin-left: 4px;
}
