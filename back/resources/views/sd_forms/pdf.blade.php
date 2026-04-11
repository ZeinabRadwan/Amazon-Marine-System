@php
    $pdfLang = $pdfLang ?? 'en';
    $pdfDir = $pdfDir ?? 'ltr';
@endphp
<!DOCTYPE html>
<html lang="{{ $pdfLang }}" dir="{{ $pdfDir }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $form->sd_number ?? ('SD #' . $form->id) }}</title>
    @include('pdf.theme-styles')
    @include('pdf.styles-marine-doc')
</head>
<body>
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
            $notifyDisplayHtml = '<span class="sd-notify-same">'.e($labels['same_as_consignee']).'</span>';
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

        $weightLabel = $labels['tgw'].' '.($form->total_gross_weight ?? '—');

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

    <div class="wrap">
        @if(!empty($headerHtml))
            {!! $headerHtml !!}
        @else
            <table class="header-band">
                <tr>
                    <td>
                        <table class="header-row1" style="width:100%;border-collapse:collapse;">
                            <tr>
                                <td class="header-logo" style="width:90px;border:none;vertical-align:middle;">
                                    @if($logoSrc)
                                        <img src="{{ $logoSrc }}" alt="" style="height:48px;width:auto;max-width:88px;display:block;">
                                    @else
                                        <div style="width:72px;height:40px;background:#fff;border:1px solid #f97316;text-align:center;line-height:40px;font-size:8px;color:#1f2a60;">LOGO</div>
                                    @endif
                                </td>
                                <td class="header-brand-cell">
                                    <span class="brand-line">AMAZON MARINE</span><span class="brand-sep">|</span><span class="brand-tag"> {{ $labels['brand_tag'] }}</span>
                                </td>
                                <td class="header-doc-title-cell">
                                    <div class="doc-title">{{ $labels['doc_title'] }}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td class="header-row2">
                        <table class="meta-panel">
                            <tr>
                                <td>
                                    <span class="meta-icon">#</span>
                                    <span class="meta-item"><strong>{{ $labels['sd_no'] }}:</strong> <span class="meta-val">{{ $form->sd_number ?? ('SD-'.$form->id) }}</span></span>
                                </td>
                                <td>
                                    <span class="meta-icon">D</span>
                                    <span class="meta-item"><strong>{{ $labels['sd_date'] }}:</strong> <span class="meta-val">{{ optional($form->created_at)->format('d/m/Y') ?? '—' }}</span></span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span class="meta-icon">V</span>
                                    <span class="meta-item"><strong>{{ $labels['vessel_date'] }}:</strong> <span class="meta-val">{{ optional($form->requested_vessel_date)->format('d/m/Y') ?? '—' }}</span></span>
                                </td>
                                <td dir="auto">
                                    <span class="meta-icon">C</span>
                                    <span class="meta-item"><strong>{{ $labels['client'] }}:</strong> <span class="meta-val">{{ $form->client?->name ?? '—' }}</span></span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        @endif

        <div class="body-pad">
        <div class="sec">
            <div class="sec-h">{{ $labels['sec_shipment_info'] }}</div>
            <table class="grid">
                <tr>
                    <th style="width:33.33%;">{{ $labels['pol'] }}</th>
                    <th style="width:33.33%;">{{ $labels['pod'] }}</th>
                    <th style="width:33.33%;">{{ $labels['final_destination'] }}</th>
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
                    <td class="block-text">{!! $consigneeHtml !!}</td>
                    <td class="block-text">{!! $notifyDisplayHtml !!}</td>
                    <td>
                        @if($form->client?->email)
                            <div><span class="lbl">{{ $labels['email'] }}:</span> {{ $form->client->email }}</div>
                        @endif
                        @if($form->client?->phone)
                            <div style="margin-top:3px;"><span class="lbl">{{ $labels['phone'] }}:</span> {{ $form->client->phone }}</div>
                        @endif
                        @if(!$form->client?->email && !$form->client?->phone)
                            <span class="cell-muted">—</span>
                        @endif
                    </td>
                </tr>
            </table>
        </div>

        <div class="sec">
            <div class="sec-h">{{ $labels['sec_shipping'] }}</div>
            <table class="grid">
                <tr>
                    <th style="width:25%;">{{ $labels['swb_type'] }}</th>
                    <th style="width:37.5%;">{{ $labels['freight_board'] }}</th>
                    <th style="width:37.5%;">{{ $labels['status_clean'] }}</th>
                </tr>
                <tr>
                    <td>{{ $labels['swb_value'] }}</td>
                    <td>{{ $form->freight_term ?? '—' }}</td>
                    <td>{{ $labels['clean_on_board'] }}</td>
                </tr>
            </table>
            <table class="grid">
                <tr>
                    <th style="width:25%;">{{ $labels['vessel_container'] }}</th>
                    <th style="width:25%;">{{ $labels['container_type'] }}</th>
                    <th style="width:25%;">{{ $labels['hs_code'] }}</th>
                    <th style="width:25%;">{{ $labels['weight_kgs'] }}</th>
                </tr>
                <tr>
                    <td>{{ $vesselRef }}</td>
                    <td>{{ $containerTypeCell }}</td>
                    <td>{{ $form->hs_code ?? '—' }}</td>
                    <td>{{ $weightLabel }}</td>
                </tr>
                <tr>
                    <th>{{ $labels['shipping_line'] }}</th>
                    <td colspan="3">{{ $form->shipping_line ?? '—' }}</td>
                </tr>
            </table>
        </div>

        <div class="sec">
            <div class="sec-h">{{ $labels['sec_goods'] }}</div>
            <table class="grid">
                <tr>
                    <th style="width:32%;">{{ $labels['marks_numbers'] }}</th>
                    <th>{{ $labels['desc_goods'] }}</th>
                </tr>
                <tr>
                    <td>{{ $form->sd_number ?? '—' }}</td>
                    <td class="block-text">{!! $form->cargo_description ? nl2br(e($form->cargo_description)) : '—' !!}</td>
                </tr>
            </table>
            <div class="notes">
                <strong>{{ $labels['total_gross'] }}:</strong> {{ $form->total_gross_weight ?? '—' }} {{ $labels['unit_kg'] }}
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <strong>{{ $labels['total_net'] }}:</strong> {{ $form->total_net_weight ?? '—' }} {{ $labels['unit_kg'] }}
                @if($form->shipment_direction === 'Import' && !empty($form->acid_number))
                    <br><br><strong>{{ $labels['acid'] }}:</strong> {{ $form->acid_number }}
                @endif
                @if(!empty($form->notes))
                    <br><br><strong>{{ $labels['notes'] }}:</strong> {{ $form->notes }}
                @endif
            </div>
        </div>

        <div class="footer">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                <p class="footer-h">{{ $labels['footer_contact'] }}</p>
                <p><strong>{{ $labels['footer_phone'] }}:</strong> 01200744888</p>
                <p><strong>{{ $labels['footer_email'] }}:</strong> mabdrabboh@amazonmarine.ltd</p>
                <p><strong>{{ $labels['footer_address'] }}:</strong> Villa 129, 2nd District New Cairo, Egypt</p>
                <p><strong>{{ $labels['footer_website'] }}:</strong> www.amazonmarine.ltd</p>
            @endif
        </div>
        </div>
    </div>
</body>
</html>
