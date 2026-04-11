@extends('pdf.layouts.master')

@section('pdf_title')
{{ $labels['doc_title'] }} · {{ $form->sd_number ?? ('SD-'.$form->id) }}
@endsection

@section('content')
    @php
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
            $notifyDisplayHtml = '<span class="pdf-text-muted-italic">'.$labels['same_as_consignee'].'</span>';
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

        $weightLabel = $labels['weight_prefix'].($form->total_gross_weight ?? '—');

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
    @endphp

    @if(!empty($headerHtml))
        {!! $headerHtml !!}
    @else
        <header class="pdf-header pdf-header--branded">
            <table class="pdf-header__table">
                <tr>
                    <td class="pdf-header__logo">
                        @if($logoSrc)
                            <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                        @else
                            <div class="pdf-header__logo-fallback">MH</div>
                        @endif
                    </td>
                    <td class="pdf-header__brand-cell">
                        <div class="pdf-header__brand-stack">
                            <div class="pdf-header__brand-line"><strong>{{ $labels['brand'] }}</strong></div>
                            <div class="pdf-header__brand-tag">{{ $labels['brand_tag'] }}</div>
                        </div>
                    </td>
                    <td class="pdf-header__doc">
                        <p class="pdf-header__title">{{ $labels['doc_title'] }}</p>
                        <div class="pdf-header__meta-list">
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['sd_no'] }}</span>
                                <span class="pdf-header__meta-val">{{ $form->sd_number ?? ('SD-'.$form->id) }}</span>
                            </div>
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['sd_date'] }}</span>
                                <span class="pdf-header__meta-val">{{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</span>
                            </div>
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['vessel_date'] }}</span>
                                <span class="pdf-header__meta-val">{{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</span>
                            </div>
                            <div class="pdf-header__meta-row">
                                <span class="pdf-header__meta-label">{{ $labels['client'] }}</span>
                                <span class="pdf-header__meta-val pdf-cell-dir-auto">{{ $form->client?->name ?? '—' }}</span>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>
        </header>
    @endif

    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_shipment_info'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-33">{{ $labels['pol'] }}</th>
                <th class="pdf-w-33">{{ $labels['pod'] }}</th>
                <th class="pdf-w-33">{{ $labels['final_destination'] }}</th>
            </tr>
            <tr>
                <td>{{ $pol }}</td>
                <td>{{ $pod }}</td>
                <td>{{ $finalDestination }}</td>
            </tr>
            <tr>
                <th>{{ $labels['consignee'] }}</th>
                <th>{{ $labels['notify_party'] }}</th>
                <th>{{ $labels['contact_details'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text">{!! $consigneeHtml !!}</td>
                <td class="pdf-block-text">{!! $notifyDisplayHtml !!}</td>
                <td>
                    @if($form->client?->email)
                        <div><span class="pdf-label-strong">{{ $labels['email'] }}</span> {{ $form->client->email }}</div>
                    @endif
                    @if($form->client?->phone)
                        <div class="pdf-mt-sm"><span class="pdf-label-strong">{{ $labels['phone'] }}</span> {{ $form->client->phone }}</div>
                    @endif
                    @if(!$form->client?->email && !$form->client?->phone)
                        <span class="pdf-text-muted">—</span>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_shipping_info'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-25">{{ $labels['swb_type'] }}</th>
                <th class="pdf-w-37">{{ $labels['freight_on_board'] }}</th>
                <th class="pdf-w-37">{{ $labels['status'] }}</th>
            </tr>
            <tr>
                <td>{{ $labels['swb_telex'] }}</td>
                <td>{{ $form->freight_term ?? '—' }}</td>
                <td>{{ $labels['clean_on_board'] }}</td>
            </tr>
        </table>
        <table class="pdf-table pdf-table--flush-top">
            <tr>
                <th class="pdf-w-25">{{ $labels['vessel_container'] }}</th>
                <th class="pdf-w-25">{{ $labels['container_type'] }}</th>
                <th class="pdf-w-25">{{ $labels['hs_code'] }}</th>
                <th class="pdf-w-25">{{ $labels['weight_kgs'] }}</th>
            </tr>
            <tr>
                <td>{{ $vesselRef }}</td>
                <td>{{ $containerTypeCell }}</td>
                <td>{{ $form->hs_code ?? '—' }}</td>
                <td>{{ $weightLabel }}</td>
            </tr>
            <tr>
                <th>{{ $labels['shipping_line'] }}</th>
                <td colspan="3">{{ $form->shippingLine?->name ?? $form->shipping_line ?? '—' }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__heading">{{ $labels['sec_goods'] }}</p>
        <table class="pdf-table">
            <tr>
                <th class="pdf-w-32">{{ $labels['marks_numbers'] }}</th>
                <th>{{ $labels['goods_description'] }}</th>
            </tr>
            <tr>
                <td>{{ $form->sd_number ?? '—' }}</td>
                <td class="pdf-block-text">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes">
            <span class="pdf-label-strong">{{ $labels['total_gross'] }}</span> {{ $form->total_gross_weight ?? '—' }} KG
            <span class="pdf-meta-sep"> | </span>
            <span class="pdf-label-strong">{{ $labels['total_net'] }}</span> {{ $form->total_net_weight ?? '—' }} KG
            @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                <br><br><span class="pdf-label-strong">{{ $labels['acid'] }}</span> {{ $form->acid_number }}
            @endif
            @if(!empty($form->notes))
                <br><br><span class="pdf-label-strong">{{ $labels['notes'] }}</span> {{ $form->notes }}
            @endif
        </div>
    </div>

    <footer class="pdf-footer @if(empty($footerHtml)) pdf-footer--contact @endif">
        @if(!empty($footerHtml))
            {!! $footerHtml !!}
        @else
            <p class="pdf-footer__title">{{ $labels['footer_contact'] }}</p>
            <table class="footer-contact-grid" width="100%" cellspacing="0" cellpadding="0" border="0" dir="ltr" role="presentation">
                <colgroup>
                    <col width="25%" />
                    <col width="25%" />
                    <col width="25%" />
                    <col width="25%" />
                </colgroup>
                <tr>
                    <td class="footer-contact-grid__cell footer-contact-grid__cell--first" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74 0-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.2c.27-.27.35-.66.24-1.02A17.32 17.32 0 0 1 4.5 3 2 2 0 0 0 2.5 5v3a19.79 19.79 0 0 0 3.07 8.63 19.51 19.51 0 0 0 6 6 19.79 19.79 0 0 0 8.63 3.07 2 2 0 0 0 2-2v-1.5c0-1.1-.9-2-2-2z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">01200744888</td>
                            </tr>
                        </table>
                    </td>
                    <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm8 7.55L4.06 6h15.88L12 11.55zM20 18V8.44l-8 5.06-8-5.06V18h16z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">mabdrabboh@amazonmarine.ltd</td>
                            </tr>
                        </table>
                    </td>
                    <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">Villa 129, 2nd District New Cairo, Egypt</td>
                            </tr>
                        </table>
                    </td>
                    <td class="footer-contact-grid__cell" width="25%" style="width:25%;">
                        <table class="footer-cc-col" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td class="footer-cc-ico-wrap">
                                    <table class="footer-cc-icon" cellspacing="0" cellpadding="0" border="0" align="center">
                                        <tr>
                                            <td>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f58220" d="M5 4h14v11H5V4zm1 2h12v7H6V6zm3 12h6v2H9v-2z"/></svg>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td class="footer-cc-line">www.amazonmarine.ltd</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        @endif
    </footer>
@endsection

@push('pdf_footer_fullbleed')
    @if($pdfFooterBanner = \App\Support\PdfLogo::footerImgSrc())
        <table class="pdf-footer-fullbleed" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
            <tr>
                <td class="pdf-footer-fullbleed__cell">
                    <img class="pdf-footer-fullbleed__img" src="{{ $pdfFooterBanner }}" alt="">
                </td>
            </tr>
        </table>
    @endif
@endpush
