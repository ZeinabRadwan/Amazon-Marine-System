        .pdf-sd-party-cell,
        .pdf-sd-cargo-cell,
        .pdf-sd-notes-cell {
            vertical-align: top;
        }

        .pdf-sd-party-cell {
            min-height: 88px;
        }

        .pdf-sd-cargo-cell {
            min-height: 72px;
        }

        .pdf-sd-notes-cell {
            min-height: 56px;
        }

        .pdf-sd-client-meta {
            font-size: 8.5px;
            color: #666666;
            margin-top: 5px;
            line-height: 1.4;
        }

        .pdf-sd-ship-ref {
            font-size: 8.5px;
            color: #666666;
            margin-top: 5px;
            line-height: 1.35;
        }

        .pdf-w-75 {
            width: 75%;
        }

        .pdf-header--sd .pdf-header__brand-line,
        .pdf-header--sd .pdf-header__brand-tag {
            text-transform: none;
            letter-spacing: 0.06em;
        }

        .pdf-sd-doc .pdf-header__title {
            text-transform: uppercase;
            letter-spacing: 0.06em;
            font-size: 14px;
        }

        .pdf-sd-doc .pdf-section__heading,
        .pdf-sd-doc .pdf-table th,
        .pdf-sd-doc .pdf-header__meta-label,
        .pdf-sd-doc .pdf-footer__title,
        .pdf-sd-doc .pdf-label-strong {
            text-transform: uppercase;
        }

        .pdf-header__brand-contact {
            display: block;
            margin-top: 6px;
            font-size: 8.5px;
            font-weight: 600;
            color: #11354d;
            line-height: 1.4;
            opacity: 0.9;
        }

        .pdf-header__sd-big {
            font-size: 15px;
            font-weight: 700;
            color: #11354d;
            margin: 6px 0 8px;
            line-height: 1.2;
        }

        .pdf-header__date-page-row {
            display: block;
            font-size: 10px;
            line-height: 1.55;
            margin: 0 0 5px;
            padding: 0 0 5px;
            border-bottom: 1px solid #e2e8f0;
            text-align: inherit;
        }

        /* Navy + orange accent — shared by SD Form and Quotation PDFs (.pdf-sd-doc wrapper) */
        .pdf-sd-doc .pdf-header {
            background: #ffffff;
            border-bottom: 3px solid #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__brand-line,
        .pdf-sd-doc .pdf-header__brand-line strong {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__brand-tag {
            color: #11354d;
            opacity: 0.9;
        }

        .pdf-sd-doc .pdf-header__title {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__sd-big,
        .pdf-sd-doc .pdf-header__meta-label,
        .pdf-sd-doc .pdf-header__meta-val {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__logo-fallback {
            background: #ffffff;
            border-color: #0f2d4a;
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header__brand-contact {
            color: #11354d;
        }

        .pdf-sd-doc .pdf-section__heading {
            background: #0f2d4a;
            color: #ffffff;
            border-left: 4px solid #ec7f00;
            font-weight: 700;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading {
            border-left: none;
            border-right: 4px solid #ec7f00;
        }

        .pdf-sd-doc .pdf-table th {
            background: #eaf0f6;
            color: #0f2d4a;
            font-weight: 600;
        }

        .pdf-sd-doc .pdf-table td {
            background: #ffffff;
            color: #333333;
        }

        .pdf-sd-doc .pdf-table tbody tr:nth-child(even) td {
            background: #f8f9fb;
        }

        .pdf-sd-doc .pdf-table {
            border-color: #e2e8f0;
        }

        .pdf-sd-doc .pdf-table th,
        .pdf-sd-doc .pdf-table td {
            border-color: #e2e8f0;
        }

        .pdf-sd-doc .pdf-label-strong {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-footer {
            background: #ffffff;
            border-top: 3px solid #0f2d4a;
            color: #333333;
        }

        .pdf-sd-doc .pdf-footer__title {
            color: #0f2d4a;
        }

        .pdf-sd-doc .pdf-footer--contact .pdf-footer__title {
            border-bottom-color: #ec7f00;
        }

        .pdf-sd-doc .pdf-footer strong {
            color: #0f2d4a;
        }

        .pdf-sd-header-badges {
            margin-top: 6px;
            line-height: 1.35;
        }

        .pdf-sd-badge {
            display: inline-block;
            font-size: 8px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 3px;
            margin-inline-end: 6px;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }

        .pdf-sd-badge--import {
            background: #0f2d4a;
            color: #ffffff;
        }

        .pdf-sd-badge--reefer {
            background: #0d3d2e;
            color: #ffffff;
        }

        .pdf-sd-doc .pdf-section__heading--import-customs {
            border-left-color: #185fa5;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading--import-customs {
            border-right-color: #185fa5;
        }

        .pdf-sd-doc .pdf-section__heading--reefer-details {
            border-left-color: #0f6e56;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-section__heading--reefer-details {
            border-right-color: #0f6e56;
        }

        .pdf-sd-doc .pdf-table td.pdf-sd-cell--import {
            background: #e6f1fb !important;
        }

        .pdf-sd-doc .pdf-table td.pdf-sd-cell--reefer {
            background: #e1f5ee !important;
        }
