@extends('pdf.layouts.master')

@section('pdf_title')
{{ $form->sd_number ?? ('SD-'.$form->id) }} — {{ $labels['doc_title'] }}
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
                    <td>
                        <span class="pdf-header__brand-line">{{ $labels['brand'] }}</span><span class="pdf-header__brand-sep">|</span><span class="pdf-header__brand-tag">{{ $labels['brand_tag'] }}</span>
                    </td>
                    <td class="pdf-header__doc">
                        <p class="pdf-header__title">{{ $labels['doc_title'] }}</p>
                    </td>
                </tr>
            </table>
            <table class="pdf-meta-panel">
                <tr>
                    <td>
                        <span class="pdf-meta-badge">#</span>
                        <span class="pdf-meta-strong">{{ $labels['sd_no'] }}</span>
                        <span class="pdf-meta-val">{{ $form->sd_number ?? ('SD-'.$form->id) }}</span>
                    </td>
                    <td>
                        <span class="pdf-meta-badge">D</span>
                        <span class="pdf-meta-strong">{{ $labels['sd_date'] }}</span>
                        <span class="pdf-meta-val">{{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</span>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span class="pdf-meta-badge">V</span>
                        <span class="pdf-meta-strong">{{ $labels['vessel_date'] }}</span>
                        <span class="pdf-meta-val">{{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</span>
                    </td>
                    <td class="pdf-cell-dir-auto">
                        <span class="pdf-meta-badge">C</span>
                        <span class="pdf-meta-strong">{{ $labels['client'] }}</span>
                        <span class="pdf-meta-val">{{ $form->client?->name ?? '—' }}</span>
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

    <footer class="pdf-footer">
        @if(!empty($footerHtml))
            {!! $footerHtml !!}
        @else
            <p class="pdf-footer__title">{{ $labels['footer_contact'] }}</p>
            <p><strong>{{ $labels['phone'] }}:</strong> 01200744888</p>
            <p><strong>{{ $labels['email'] }}:</strong> mabdrabboh@amazonmarine.ltd</p>
            <p><strong>{{ $labels['address'] }}:</strong> Villa 129, 2nd District New Cairo, Egypt</p>
            <p><strong>{{ $labels['website'] }}:</strong> www.amazonmarine.ltd</p>
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
