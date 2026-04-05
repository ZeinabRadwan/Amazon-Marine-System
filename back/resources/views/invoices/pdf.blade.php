<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        @font-face {
            font-family: 'Amiri';
            src: url('{{ resource_path('fonts/Amiri-Regular.ttf') }}') format('truetype');
            font-weight: normal;
            font-style: normal;
        }

        body {
            font-family: 'Amiri', 'dejavusans', sans-serif;
            font-size: 11px;
            color: #111;
            direction: ltr;
            text-align: left;
            margin: 0;
            padding: 0;
        }

        .wrapper { border: 1px solid #e5e7eb; padding: 30px; }
        
        .header-table { width: 100%; margin-bottom: 30px; }
        .header-table td { vertical-align: top; }
        
        .company-info { width: 50%; }
        .invoice-details { width: 50%; text-align: right; }
        
        .invoice-title { font-size: 24px; font-weight: bold; color: #0c4a6e; margin-bottom: 10px; }
        
        .party-table { width: 100%; margin-bottom: 25px; border-spacing: 0; }
        .party-box { width: 48%; border: 1px solid #f1f5f9; padding: 15px; background: #f8fafc; }
        .party-label { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .party-name { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
        
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .items-table th { background: #0c4a6e; color: #ffffff; text-align: left; padding: 10px; font-weight: bold; }
        .items-table td { border-bottom: 1px solid #f1f5f9; padding: 10px; }
        .items-table .text-right { text-align: right; }
        
        .totals-table { width: 100%; margin-top: 10px; }
        .totals-table td { padding: 5px 0; }
        .total-row { font-size: 16px; font-weight: bold; color: #0c4a6e; border-top: 2px solid #0c4a6e; padding-top: 10px !important; }
        
        .notes-section { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #e5e7eb; }
        .notes-title { font-weight: bold; margin-bottom: 5px; color: #64748b; }
        
        .footer { position: fixed; bottom: 30px; left: 30px; right: 30px; font-size: 9px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="header-table">
            <tr>
                <td class="company-info">
                    @if(!empty($headerHtml))
                        {!! $headerHtml !!}
                    @else
                        <div style="font-size: 18px; font-weight: bold;">AMAZON MARINE</div>
                        <div>Shipping & Logistics Services</div>
                    @endif
                </td>
                <td class="invoice-details">
                    <div class="invoice-title">INVOICE</div>
                    <div><strong>No:</strong> {{ $invoice->invoice_number }}</div>
                    <div><strong>Date:</strong> {{ $invoice->issue_date?->toDateString() }}</div>
                    @if($invoice->due_date)
                        <div><strong>Due Date:</strong> {{ $invoice->due_date?->toDateString() }}</div>
                    @endif
                    @if($invoice->shipment)
                        <div style="margin-top: 5px;"><strong>Shipment BL:</strong> {{ $invoice->shipment->bl_number }}</div>
                    @endif
                </td>
            </tr>
        </table>

        <table class="party-table">
            <tr>
                <td class="party-box">
                    <div class="party-label">Billed To</div>
                    <div class="party-name">{{ $invoice->client?->name ?? '—' }}</div>
                    @if($invoice->client?->address)
                        <div>{{ $invoice->client->address }}</div>
                    @endif
                    @if($invoice->client?->phone)
                        <div>{{ $invoice->client->phone }}</div>
                    @endif
                </td>
                <td style="width: 4%;"></td>
                <td class="party-box" style="visibility: hidden;">
                    <!-- Placeholder for alignment or Partner info if needed -->
                </td>
            </tr>
        </table>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 60%;">Description</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $item)
                    <tr>
                        <td>
                            {{ $item->description }}
                            @if($item->item && $item->item->name !== $item->description)
                                <br><small style="color: #64748b;">({{ $item->item->name }})</small>
                            @endif
                        </td>
                        <td class="text-right">{{ $item->quantity }}</td>
                        <td class="text-right">{{ number_format($item->unit_price, 2) }}</td>
                        <td class="text-right">{{ number_format($item->line_total, 2) }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <table style="width: 100%;">
            <tr>
                <td style="width: 60%;"></td>
                <td style="width: 40%;">
                    <table class="totals-table" style="width: 100%;">
                        <tr>
                            <td>Subtotal</td>
                            <td class="text-right">{{ number_format($invoice->total_amount, 2) }} {{ $invoice->currency_code }}</td>
                        </tr>
                        @if($invoice->is_vat_invoice)
                            <tr>
                                <td>VAT (14%)</td>
                                <td class="text-right">{{ number_format($invoice->tax_amount, 2) }} {{ $invoice->currency_code }}</td>
                            </tr>
                        @endif
                        <tr class="total-row">
                            <td>TOTAL</td>
                            <td class="text-right">{{ number_format($invoice->net_amount, 2) }} {{ $invoice->currency_code }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        @if($invoice->notes)
            <div class="notes-section">
                <div class="notes-title">Notes</div>
                <div>{{ $invoice->notes }}</div>
            </div>
        @endif

        <div class="footer">
            @if(!empty($footerHtml))
                {!! $footerHtml !!}
            @else
                Generated on {{ now()->toDateTimeString() }} | Amazon Marine system
            @endif
        </div>
    </div>
</body>
</html>
