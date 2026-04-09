<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $labels['title'] }} #{{ $shipment->id }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, Helvetica, sans-serif;
            font-size: 10px;
            color: #0f172a;
            margin: 0;
            padding: 0;
            line-height: 1.4;
        }
        .head {
            background: #1f2a60;
            color: #fff;
            padding: 12px 14px;
            margin-bottom: 14px;
        }
        .head h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
        }
        .head .sub {
            margin-top: 4px;
            font-size: 9px;
            opacity: 0.9;
        }
        table.grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        table.grid td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.grid td.k {
            width: 32%;
            background: #f1f5f9;
            font-weight: 700;
            color: #334155;
        }
        .block {
            margin-top: 8px;
        }
        .muted { color: #64748b; font-size: 9px; }
    </style>
</head>
<body>
    <div class="head">
        <h1>{{ $labels['title'] }} — #{{ $shipment->id }}</h1>
        <div class="sub">{{ $labels['generated'] }}: {{ now()->format('Y-m-d H:i') }}</div>
    </div>

    <table class="grid">
        <tr><td class="k">{{ $labels['status'] }}</td><td>{{ $shipment->status ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['booking_date'] }}</td><td>{{ $shipment->booking_date?->format('Y-m-d') ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['booking_number'] }}</td><td>{{ $shipment->booking_number ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['bl_number'] }}</td><td>{{ $shipment->bl_number ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['client'] }}</td><td>{{ $shipment->client?->company_name ?? $shipment->client?->name ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['sales_rep'] }}</td><td>{{ $shipment->salesRep?->name ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['sd_form'] }}</td><td>{{ $shipment->sdForm?->sd_number ?? ($shipment->sd_form_id ? '#'.$shipment->sd_form_id : '—') }}</td></tr>
        <tr><td class="k">{{ $labels['line_vendor'] }}</td><td>{{ $shipment->lineVendor?->name ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['mode'] }}</td><td>{{ $shipment->mode ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['shipment_type'] }}</td><td>{{ $shipment->shipment_type ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['direction'] }}</td><td>{{ $shipment->shipment_direction ?? '—' }}</td></tr>
        @if($shipment->shipment_direction === 'Import' || filled($shipment->acid_number))
        <tr><td class="k">{{ $labels['acid'] }}</td><td>{{ $shipment->acid_number ?? '—' }}</td></tr>
        @endif
        <tr><td class="k">{{ $labels['container_type'] }}</td><td>{{ $shipment->container_type ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['container_size'] }}</td><td>{{ $shipment->container_size ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['container_count'] }}</td><td>{{ $shipment->container_count ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['loading_place'] }}</td><td>{{ $shipment->loading_place ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['pol'] }}</td><td>{{ $shipment->originPort?->name ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['pod'] }}</td><td>{{ $shipment->destinationPort?->name ?? '—' }}</td></tr>
        <tr><td class="k">{{ $labels['loading_date'] }}</td><td>{{ $shipment->loading_date?->format('Y-m-d') ?? '—' }}</td></tr>
    </table>

    <div class="block">
        <table class="grid">
            <tr>
                <td class="k">{{ $labels['cargo'] }}</td>
                <td>{!! nl2br(e($shipment->cargo_description ?? '—')) !!}</td>
            </tr>
        </table>
    </div>

    @if(filled($notesColumn))
    <div class="block">
        <table class="grid">
            <tr>
                <td class="k">{{ $labels['notes'] }}</td>
                <td>{!! nl2br(e($notesColumn)) !!}</td>
            </tr>
        </table>
    </div>
    @endif

    @if(filled($shipment->route_text))
    <div class="block">
        <table class="grid">
            <tr>
                <td class="k">{{ $labels['route'] }}</td>
                <td>{{ $shipment->route_text }}</td>
            </tr>
        </table>
    </div>
    @endif

    <p class="muted">{{ config('app.name') }}</p>
</body>
</html>
