{{-- Line items table with section subtotal footer (quotation PDF) --}}
<table class="pdf-inv-table" width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
    <thead>
        <tr>
            <th class="pdf-inv-col-item">NAME</th>
            <th class="pdf-inv-col-amt pdf-inv-th-center">AMOUNT</th>
            <th class="pdf-inv-col-cur pdf-inv-th-center">CURRENCY</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($items as $item)
            <tr>
                <td class="pdf-inv-col-item">{{ $item->name }}</td>
                <td class="pdf-inv-col-amt pdf-inv-td-center">{{ number_format((float) $item->amount, 2) }}</td>
                <td class="pdf-inv-col-cur pdf-inv-td-center">{{ strtoupper($item->currency_code ?: 'USD') }}</td>
            </tr>
        @endforeach
        <tr class="pdf-inv-subtotal-row">
            <td class="pdf-inv-sub-label"><strong>{{ $sectionEn }} Total</strong></td>
            <td colspan="2" class="pdf-inv-sub-amt">{{ $formatBreakdown($totals) }}</td>
        </tr>
    </tbody>
</table>
