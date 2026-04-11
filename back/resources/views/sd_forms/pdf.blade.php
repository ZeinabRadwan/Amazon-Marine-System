@extends('pdf.layouts.master')

@section('pdf_content')
    @php
        $L = $labels ?? trans('pdf.sd_form', [], $lang ?? 'en');
        $c = trans('pdf.common', [], $lang ?? 'en');

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
            $notifyDisplayHtml = '<span class="pdf-italic-muted">'.$L['notify_same_as_consignee'].'</span>';
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

        $weightLabel = 'T.G.W: '.($form->total_gross_weight ?? '—');

        $bl = trim((string) ($form->linkedShipment?->bl_number ?? ''));
        $bk = trim((string) ($form->linkedShipment?->booking_number ?? ''));
        if ($bl !== '') {
            $vesselRef = $bl;
        } elseif ($bk !== '') {
            $vesselRef = $bk;
        } else {
            $vesselRef = '—';
        }

        $logoPath = base_path('../front/src/assets/logo_darkmode.png');
        $logoSrc = file_exists($logoPath) ? 'file://'.str_replace('\\', '/', $logoPath) : null;
    @endphp

    @if(!empty($headerHtml))
        <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
    @else
        <table class="pdf-header" cellpadding="0" cellspacing="0">
            <tr>
                <td colspan="3">
                    <table class="pdf-header-inner" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="pdf-header__logo-cell">
                                @if($logoSrc)
                                    <img class="pdf-header__logo-img" src="{{ $logoSrc }}" alt="">
                                @else
                                    <div class="pdf-header__logo-fallback">{{ $c['mh_placeholder'] }}</div>
                                @endif
                            </td>
                            <td>
                                <span class="pdf-header__brand-line">{{ $c['brand'] }}</span><span class="pdf-header__brand-sep">|</span><span class="pdf-header__brand-tag"> {{ $c['tagline'] }}</span>
                            </td>
                            <td class="pdf-header__title-wrap">
                                <div class="pdf-header__title">{{ $L['document_title'] }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td colspan="3">
                    <table class="pdf-meta-panel" cellpadding="0" cellspacing="0">
                        <tr>
                            <td>
                                <span class="pdf-meta-icon">#</span>
                                <span><span class="pdf-meta-strong">{{ $L['sd_no'] }}:</span> <span class="pdf-meta-val">{{ $form->sd_number ?? ('SD-'.$form->id) }}</span></span>
                            </td>
                            <td>
                                <span class="pdf-meta-icon">D</span>
                                <span><span class="pdf-meta-strong">{{ $L['sd_date'] }}:</span> <span class="pdf-meta-val">{{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</span></span>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <span class="pdf-meta-icon">V</span>
                                <span><span class="pdf-meta-strong">{{ $L['vessel_date'] }}:</span> <span class="pdf-meta-val">{{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</span></span>
                            </td>
                            <td dir="auto">
                                <span class="pdf-meta-icon">C</span>
                                <span><span class="pdf-meta-strong">{{ $L['client'] }}:</span> <span class="pdf-meta-val">{{ $form->client?->name ?? '—' }}</span></span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    @endif

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_shipment_info'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-33">{{ $L['pol'] }}</th>
                <th class="pdf-col-33">{{ $L['pod'] }}</th>
                <th class="pdf-col-33">{{ $L['final_destination'] }}</th>
            </tr>
            <tr>
                <td>{{ $pol }}</td>
                <td>{{ $pod }}</td>
                <td>{{ $finalDestination }}</td>
            </tr>
            <tr>
                <th>{{ $L['consignee'] }}</th>
                <th>{{ $L['notify_party'] }}</th>
                <th>{{ $L['contact_details'] }}</th>
            </tr>
            <tr>
                <td class="pdf-block-text">{!! $consigneeHtml !!}</td>
                <td class="pdf-block-text">{!! $notifyDisplayHtml !!}</td>
                <td>
                    @if($form->client?->email)
                        <div><span class="pdf-label-strong">{{ $L['email'] }}:</span> {{ $form->client->email }}</div>
                    @endif
                    @if($form->client?->phone)
                        <div><span class="pdf-label-strong">{{ $L['phone'] }}:</span> {{ $form->client->phone }}</div>
                    @endif
                    @if(!$form->client?->email && !$form->client?->phone)
                        <span class="pdf-muted">—</span>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_shipping_info'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-25">{{ $L['swb_type'] }}</th>
                <th class="pdf-col-37">{{ $L['fob'] }}</th>
                <th class="pdf-col-37">{{ $L['status'] }}</th>
            </tr>
            <tr>
                <td>{{ $L['swb_telex'] }}</td>
                <td>{{ $form->freight_term ?? '—' }}</td>
                <td>{{ $L['clean_on_board'] }}</td>
            </tr>
        </table>
        <table class="pdf-grid pdf-grid--flush-top">
            <tr>
                <th class="pdf-col-25">{{ $L['vessel_container'] }}</th>
                <th class="pdf-col-25">{{ $L['container_type'] }}</th>
                <th class="pdf-col-25">{{ $L['hs_code'] }}</th>
                <th class="pdf-col-25">{{ $L['weight_kgs'] }}</th>
            </tr>
            <tr>
                <td>{{ $vesselRef }}</td>
                <td>{{ $containerTypeCell }}</td>
                <td>{{ $form->hs_code ?? '—' }}</td>
                <td>{{ $weightLabel }}</td>
            </tr>
            <tr>
                <th>{{ $L['shipping_line'] }}</th>
                <td colspan="3">{{ $form->shipping_line ?? '—' }}</td>
            </tr>
        </table>
    </div>

    <div class="pdf-section">
        <p class="pdf-section__title">{{ $L['sec_goods'] }}</p>
        <table class="pdf-grid">
            <tr>
                <th class="pdf-col-32">{{ $L['marks_numbers'] }}</th>
                <th class="pdf-col-68">{{ $L['description_goods'] }}</th>
            </tr>
            <tr>
                <td>{{ $form->sd_number ?? '—' }}</td>
                <td class="pdf-block-text">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes-block">
            <span class="pdf-label-strong">{{ $L['total_gross'] }}:</span> {{ $form->total_gross_weight ?? '—' }} {{ $L['kg'] }}
            &nbsp;|&nbsp;
            <span class="pdf-label-strong">{{ $L['total_net'] }}:</span> {{ $form->total_net_weight ?? '—' }} {{ $L['kg'] }}
            @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                <br><br><span class="pdf-label-strong">{{ $L['acid'] }}:</span> {{ $form->acid_number }}
            @endif
            @if(!empty($form->notes))
                <br><br><span class="pdf-label-strong">{{ $L['notes'] }}:</span> {{ $form->notes }}
            @endif
        </div>
    </div>
@endsection

@section('pdf_footer')
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
        @include('pdf.partials.standard_footer', ['lang' => $lang ?? 'en'])
    @endif
@endsection
