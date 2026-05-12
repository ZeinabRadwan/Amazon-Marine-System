@php
    /** @var \App\Models\Shipment $shipment */
    /** @var array<string, mixed> $tiProfile */
    /** @var array<string, string> $labels */
    $ti = is_array($tiProfile ?? null) ? $tiProfile : [];
    $tiVal = static function ($k) use ($ti) {
        $v = $ti[$k] ?? null;

        return $v !== null && $v !== '' ? $v : '—';
    };
    $doc = (string) ($ti['customs_document_type'] ?? '');
    $docLbl = match ($doc) {
        'certificate' => $labels['ti_doc_certificate'] ?? $doc,
        'bill_of_lading' => $labels['ti_doc_bl'] ?? $doc,
        'manifest' => $labels['ti_doc_manifest'] ?? $doc,
        default => '—',
    };
    $gen = ($ti['generator'] ?? 'no') === 'yes' ? ($labels['ti_gen_yes'] ?? 'Yes') : ($labels['ti_gen_no'] ?? 'No');
    $brokerName = '—';
    $bid = $ti['approved_customs_broker_id'] ?? null;
    if ($bid) {
        $bv = \App\Models\Vendor::query()->find((int) $bid);
        $brokerName = $bv?->name ?? '—';
    }
    $arrivalDisp = '—';
    $arrRaw = $ti['customer_arrival_at'] ?? null;
    if ($arrRaw) {
        try {
            $arrivalDisp = \Illuminate\Support\Carbon::parse($arrRaw)->format('d/m/Y H:i');
        } catch (\Throwable $e) {
            $arrivalDisp = (string) $arrRaw;
        }
    }
@endphp

<div class="sec">
    <p class="sec-h">{{ $labels['sec_ti_summary'] }}</p>
    <table class="grid">
        <tr>
            <th style="width:20%;">{{ $labels['booking_number'] }}</th>
            <th style="width:20%;">{{ $labels['shipping_line'] }}</th>
            <th style="width:20%;">{{ $labels['container_count'] }}</th>
            <th style="width:20%;">{{ $labels['container_type'] }}</th>
            <th style="width:20%;">{{ $labels['container_size'] }}</th>
        </tr>
        <tr>
            <td>{{ $shipment->booking_number ?? '—' }}</td>
            <td>{{ $shipment->shippingLine?->name ?? '—' }}</td>
            <td>{{ $shipment->container_count ?? '—' }}</td>
            <td>{{ $shipment->container_type ?? '—' }}</td>
            <td>{{ $shipment->container_size ?? '—' }}</td>
        </tr>
    </table>
</div>

<div class="sec">
    <p class="sec-h">{{ $labels['sec_ti_form'] }}</p>
    <table class="grid">
        <tr>
            <th style="width:30%;">{{ $labels['ti_arrival'] }}</th>
            <td colspan="2">{{ $arrivalDisp }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_loading_place'] }}</th>
            <td colspan="2" class="pdf-cell-dir-auto">{{ $tiVal('loading_place_name') }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_loading_address'] }}</th>
            <td colspan="2" class="block-text pdf-cell-dir-auto">{!! $ti['loading_address'] ?? '' ? nl2br(e($ti['loading_address'])) : '—' !!}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_loading_maps'] }}</th>
            <td colspan="2" class="pdf-cell-dir-auto">{{ $tiVal('loading_maps_url') }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_contact_name'] }}</th>
            <td colspan="2" class="pdf-cell-dir-auto">{{ $tiVal('loading_contact_name') }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_contact_phone'] }}</th>
            <td colspan="2">{{ $tiVal('loading_contact_phone') }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_customs_doc'] }}</th>
            <td colspan="2">{{ $docLbl }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_generator'] }}</th>
            <td colspan="2">{{ $gen }}</td>
        </tr>
        @if(($ti['generator'] ?? 'no') === 'yes')
            <tr>
                <th>{{ $labels['ti_temp'] }}</th>
                <td colspan="2">{{ $tiVal('generator_temperature') }}</td>
            </tr>
            <tr>
                <th>{{ $labels['ti_driver_notes'] }}</th>
                <td colspan="2" class="block-text">{!! ($ti['generator_driver_instructions'] ?? '') !== '' ? nl2br(e($ti['generator_driver_instructions'])) : '—' !!}</td>
            </tr>
        @endif
        <tr>
            <th>{{ $labels['ti_broker'] }}</th>
            <td colspan="2" class="pdf-cell-dir-auto">{{ $brokerName }}</td>
        </tr>
        <tr>
            <th>{{ $labels['ti_customs_notes'] }}</th>
            <td colspan="2" class="block-text">{!! ($ti['customs_notes'] ?? '') !== '' ? nl2br(e($ti['customs_notes'])) : '—' !!}</td>
        </tr>
    </table>
</div>
