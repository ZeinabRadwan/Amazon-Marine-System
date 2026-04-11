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

        $metaCells = [
            ['label' => $L['sd_no'], 'value' => $form->sd_number ?? ('SD-'.$form->id), 'highlight' => true],
            ['label' => $L['sd_date'], 'value' => optional($form->created_at)->format('d/m/Y') ?? '—', 'highlight' => false],
            ['label' => $L['vessel_date'], 'value' => optional($form->requested_vessel_date)->format('d/m/Y') ?? '—', 'highlight' => false],
            ['label' => $L['client'], 'value' => $form->client?->name ?? '—', 'highlight' => false],
        ];
    @endphp

    @if(!empty($headerHtml))
        <div class="pdf-header pdf-header--custom">{!! $headerHtml !!}</div>
    @else
        @include('pdf.partials.document-header-marine', [
            'logoSrc' => $logoSrc,
            'mhPlaceholder' => $c['mh_placeholder'] ?? 'MH',
            'brand' => $c['brand'],
            'tagline' => $c['tagline'],
            'documentTitle' => $L['document_title'],
            'documentSubtitle' => null,
            'metaCells' => $metaCells,
        ])
    @endif

    @include('pdf.components.section-open', ['title' => $L['sec_shipment_info']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
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
                        <div class="pdf-field">
                            <div class="pdf-label">{{ $L['email'] }}</div>
                            <div class="pdf-value">{{ $form->client->email }}</div>
                        </div>
                    @endif
                    @if($form->client?->phone)
                        <div class="pdf-field">
                            <div class="pdf-label">{{ $L['phone'] }}</div>
                            <div class="pdf-value">{{ $form->client->phone }}</div>
                        </div>
                    @endif
                    @if(!$form->client?->email && !$form->client?->phone)
                        <span class="pdf-muted">—</span>
                    @endif
                </td>
            </tr>
        </table>
    @include('pdf.components.section-close')

    @include('pdf.components.section-open', ['title' => $L['sec_shipping_info']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
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
        <table class="pdf-grid pdf-grid--flush-top" cellpadding="0" cellspacing="0" border="0">
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
    @include('pdf.components.section-close')

    @include('pdf.components.section-open', ['title' => $L['sec_goods']])
        <table class="pdf-grid" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <th class="pdf-col-32">{{ $L['marks_numbers'] }}</th>
                <th class="pdf-col-68">{{ $L['description_goods'] }}</th>
            </tr>
            <tr>
                <td><span class="pdf-highlight-box">{{ $form->sd_number ?? '—' }}</span></td>
                <td class="pdf-block-text">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
            </tr>
        </table>
        <div class="pdf-notes-block">
            <span class="pdf-label-inline">{{ $L['total_gross'] }}</span> {{ $form->total_gross_weight ?? '—' }} {{ $L['kg'] }}
            &nbsp;|&nbsp;
            <span class="pdf-label-inline">{{ $L['total_net'] }}</span> {{ $form->total_net_weight ?? '—' }} {{ $L['kg'] }}
            @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                <br><br><span class="pdf-label-inline">{{ $L['acid'] }}</span> {{ $form->acid_number }}
            @endif
            @if(!empty($form->notes))
                <br><br><span class="pdf-label-inline">{{ $L['notes'] }}</span> {{ $form->notes }}
            @endif
        </div>
    @include('pdf.components.section-close')
@endsection

@section('pdf_footer')
    @if(!empty($footerHtml))
        {!! $footerHtml !!}
    @else
        @include('pdf.partials.standard_footer', ['lang' => $lang ?? 'en'])
    @endif
@endsection
