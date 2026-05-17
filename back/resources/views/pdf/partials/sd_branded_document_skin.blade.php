        /* Hide global page banner — SD uses its own branded header bar */
        .pdf-page-header {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
        }

        .pdf-container {
            padding: 0 !important;
        }

        .pdf-sd-doc {
            font-size: 12px;
            color: #1a1a1a;
            border: 0.5px solid #dddddd;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
        }

        .pdf-sd-body {
            padding: 0 24px 20px;
        }

        /* —— Header (import navy / reefer green) —— */
        .pdf-sd-doc .pdf-header.pdf-header--sd-banner {
            margin-bottom: 0;
            padding: 18px 24px 14px;
            border-bottom: none;
            background: #0f2d4a;
        }

        .pdf-sd-doc--reefer .pdf-header.pdf-header--sd-banner {
            background: #0f2d4a;
        }

        .pdf-sd-doc .pdf-header--sd-banner,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__brand-line,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__brand-line strong,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__brand-tag,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__brand-contact,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__title,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__sd-big,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__meta-label,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__meta-val,
        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__meta-line {
            color: #ffffff;
        }

        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__table td {
            vertical-align: top;
            padding: 0 8px;
            border: none;
        }

        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__logo-cell {
            width: 72px;
        }

        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__logo-img {
            max-height: 48px;
            max-width: 64px;
            background: #ffffff;
            border-radius: 4px;
            padding: 4px;
        }

        .pdf-sd-doc .pdf-header--sd-banner .pdf-header__logo-fallback {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.35);
            color: #ffffff;
        }

        .pdf-sd-doc .pdf-header__brand-line,
        .pdf-sd-doc .pdf-header__brand-line strong {
            font-size: 18px;
            font-weight: 500;
            text-transform: none;
            letter-spacing: 0;
            line-height: 1.25;
        }

        .pdf-sd-doc .pdf-header__brand-tag {
            font-size: 11px;
            opacity: 0.7;
            text-transform: none;
            letter-spacing: 0;
            margin-top: 2px;
        }

        .pdf-sd-doc .pdf-header__brand-contact {
            display: block;
            margin-top: 6px;
            font-size: 11px;
            font-weight: 400;
            opacity: 0.7;
            line-height: 1.4;
        }

        .pdf-sd-doc .pdf-header__doc {
            text-align: right;
        }

        html[dir="rtl"] .pdf-sd-doc .pdf-header__doc {
            text-align: left;
        }

        .pdf-sd-doc .pdf-header__title {
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 4px;
        }

        .pdf-sd-doc .pdf-header__sd-big {
            font-size: 20px;
            font-weight: 500;
            margin: 4px 0 3px;
            line-height: 1.2;
        }

        .pdf-sd-doc .pdf-header__meta-line {
            font-size: 10px;
            opacity: 0.65;
            line-height: 1.4;
        }

        .pdf-sd-doc .pdf-header__date-page-row {
            border-bottom: none;
            padding: 0;
            margin: 0 0 6px;
            font-size: 10px;
        }

        .pdf-sd-header-badges {
            margin-top: 6px;
            line-height: 1.35;
        }

        .pdf-sd-badge {
            display: inline-block;
            font-size: 9px;
            font-weight: 500;
            padding: 3px 10px;
            border-radius: 3px;
            margin-inline-end: 6px;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
        }

        /* —— Sections (minimal titles like reference mockup) —— */
        .pdf-sd-doc .pdf-section {
            margin: 16px 0 0;
        }

        .pdf-sd-doc .pdf-section__heading {
            background: transparent;
            color: #666666;
            border: none;
            border-bottom: 0.5px solid #dddddd;
            border-radius: 0;
            padding: 0 0 5px;
            margin: 0 0 10px;
            font-size: 10px;
            font-weight: 500;
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }

        .pdf-sd-doc .pdf-section__heading--import-customs {
            color: #185fa5;
            border-bottom-color: #185fa5;
        }

        .pdf-sd-doc .pdf-section__heading--reefer-details {
            color: #0f6e56;
            border-bottom-color: #0f6e56;
        }

        /* —— Cell grid tables —— */
        .pdf-sd-doc .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            border: none;
        }

        .pdf-sd-doc .pdf-table th,
        .pdf-sd-doc .pdf-table td {
            border: 0.5px solid #dddddd;
            padding: 7px 10px;
            vertical-align: top;
            text-align: inherit;
            background: #ffffff;
        }

        .pdf-sd-doc .pdf-table th {
            font-size: 9px;
            font-weight: 500;
            color: #999999;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            background: #ffffff;
        }

        .pdf-sd-doc .pdf-table td {
            font-size: 12px;
            color: #1a1a1a;
            min-height: 40px;
        }

        .pdf-sd-doc .pdf-table tbody tr:nth-child(even) td {
            background: #ffffff;
        }

        .pdf-sd-doc .pdf-table th.pdf-sd-cell--import-label,
        .pdf-sd-doc .pdf-table td.pdf-sd-cell--import {
            background: #e6f1fb !important;
        }

        .pdf-sd-doc .pdf-table th.pdf-sd-cell--import-label {
            color: #185fa5 !important;
        }

        .pdf-sd-doc .pdf-table th.pdf-sd-cell--reefer-label,
        .pdf-sd-doc .pdf-table td.pdf-sd-cell--reefer {
            background: #e6f1fb !important;
        }

        .pdf-sd-doc .pdf-table th.pdf-sd-cell--reefer-label {
            color: #0f6e56 !important;
        }

        .pdf-sd-party-cell {
            min-height: 100px;
        }

        .pdf-sd-cargo-cell {
            min-height: 72px;
        }

        .pdf-sd-notes-cell {
            min-height: 56px;
        }

        .pdf-sd-client-meta {
            font-size: 9px;
            color: #888888;
            margin-top: 4px;
            line-height: 1.4;
        }

        .pdf-sd-ship-ref {
            font-size: 9px;
            color: #888888;
            margin-top: 4px;
            line-height: 1.35;
        }

        .pdf-sd-doc .pdf-label-strong {
            color: #666666;
            font-weight: 500;
        }

        .pdf-text-muted-italic {
            color: #888888;
            font-style: italic;
        }

        .pdf-w-75 {
            width: 75%;
        }

        /* —— In-document footer bar —— */
        .pdf-sd-footer-bar {
            background: #f4f4f2;
            border-top: 0.5px solid #dddddd;
            padding: 8px 24px;
            margin-top: 16px;
            font-size: 9px;
            color: #999999;
        }

        .pdf-sd-footer-bar__table {
            width: 100%;
            border-collapse: collapse;
        }

        .pdf-sd-footer-bar__table td {
            border: none;
            padding: 0;
            vertical-align: middle;
            font-size: 9px;
            color: #999999;
        }

        .pdf-sd-footer-bar__right {
            text-align: right;
        }

        html[dir="rtl"] .pdf-sd-footer-bar__right {
            text-align: left;
        }
