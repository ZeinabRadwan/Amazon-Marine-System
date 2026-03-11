document.addEventListener('DOMContentLoaded', function () {
    attachInvoiceFilters();
});

function attachInvoiceFilters() {
    var search = document.getElementById('invoiceSearch');
    var filterStatus = document.getElementById('filterInvStatus');
    var filterType = document.getElementById('filterInvType');
    var filterCurrency = document.getElementById('filterInvCurrency');
    var filterMonth = document.getElementById('filterInvMonth');
    var sortSelect = document.getElementById('sortInvoices');

    if (filterType) {
        filterType.addEventListener('change', function () {
            var type = filterType.value;
            if (type === 'partner') {
                loadPartnerInvoices();
            }
        });
    }

    if (search) search.addEventListener('input', handleInvoiceFiltersChange);
    [filterStatus, filterCurrency, filterMonth, sortSelect].forEach(function (el) {
        if (el) el.addEventListener('change', handleInvoiceFiltersChange);
    });
}

function handleInvoiceFiltersChange() {
    var filterType = document.getElementById('filterInvType');
    if (filterType && filterType.value === 'partner') {
        loadPartnerInvoices();
    }
}

function loadPartnerInvoices() {
    var table = document.getElementById('invoicesTable');
    if (!table) return;

    var search = document.getElementById('invoiceSearch');
    var filterStatus = document.getElementById('filterInvStatus');
    var filterCurrency = document.getElementById('filterInvCurrency');
    var filterMonth = document.getElementById('filterInvMonth');
    var sortSelect = document.getElementById('sortInvoices');

    var params = [];
    if (search && search.value) params.push('search=' + encodeURIComponent(search.value));
    if (filterStatus && filterStatus.value) params.push('status=' + encodeURIComponent(filterStatus.value));
    if (filterCurrency && filterCurrency.value) params.push('currency_code=' + encodeURIComponent(filterCurrency.value));
    if (filterMonth && filterMonth.value) params.push('month=' + encodeURIComponent(filterMonth.value));
    if (sortSelect && sortSelect.value) params.push('sort=' + encodeURIComponent(sortSelect.value));

    var url = '/api/v1/vendor-bills';
    if (params.length) url += '?' + params.join('&');

    fetch(url, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var tbody = table.querySelector('tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            var rows = json.data || [];
            rows.forEach(function (bill) {
                var tr = document.createElement('tr');
                tr.className = 'invoice-row';
                tr.setAttribute('data-inv', bill.bill_number || '');
                tr.setAttribute('data-party', (bill.vendor && bill.vendor.name) || '');
                tr.setAttribute('data-type', 'partner');
                tr.setAttribute('data-amount', bill.net_amount || bill.total_amount || 0);
                tr.setAttribute('data-status', bill.status || '');
                tr.setAttribute('data-currency', bill.currency_code || '');
                tr.setAttribute('data-date', bill.bill_date || '');
                tr.onclick = function () {
                    openPartnerBillDetails(bill.id);
                };

                var amountDisplay = (bill.currency_code || '') + ' ' + (Number(bill.net_amount || bill.total_amount || 0).toLocaleString());
                var statusClass = bill.status === 'paid' ? 'paid' :
                    bill.status === 'partial' ? 'partial' :
                        bill.status === 'overdue' ? 'overdue' :
                            bill.status === 'cancelled' ? 'draft' : 'unpaid';

                tr.innerHTML =
                    '<td onclick="event.stopPropagation()"><input type="checkbox" class="invoice-checkbox"></td>' +
                    '<td class="bl-number">' + (bill.bill_number || '') + '</td>' +
                    '<td class="fw-600">' + ((bill.vendor && bill.vendor.name) || '') + ' (شريك)</td>' +
                    '<td>' + ((bill.shipment && bill.shipment.bl_number) || '') + '</td>' +
                    '<td class="fw-700">' + amountDisplay + '</td>' +
                    '<td>' + (bill.currency_code || '') + '</td>' +
                    '<td><span class="status-badge ' + statusClass + '">' + (bill.status || '') + '</span></td>' +
                    '<td><span class="status-badge draft">' + 'لا' + '</span></td>' +
                    '<td class="text-muted fs-sm">' + (bill.bill_date || '') + '</td>' +
                    '<td onclick="event.stopPropagation()">' +
                    '<div class="d-flex gap-1">' +
                    '<button class="btn btn-sm btn-outline" title="تفاصيل" onclick="openPartnerBillDetails(' + bill.id + ')"><i class="bx bx-show"></i></button>' +
                    '<button class="btn btn-sm btn-cyan" data-invoices-edit title="تسجيل دفعة" onclick="openPartnerBillPayment(' + bill.id + ')"><i class="bx bx-dollar"></i></button>' +
                    '</div>' +
                    '</td>';

                tbody.appendChild(tr);
            });
        })
        .catch(function () {
            // silent for now
        });
}

function openPartnerBillDetails(id) {
    fetch('/api/v1/vendor-bills/' + id, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var data = json.data || {};
            var vendor = data.vendor || {};
            var shipment = data.shipment || {};

            var statusEl = document.getElementById('detailModalStatus');
            if (statusEl) {
                statusEl.textContent = data.status || '';
                statusEl.className = 'status-badge ' + (data.status === 'paid' ? 'paid' : (data.status === 'partial' ? 'partial' : (data.status === 'overdue' ? 'overdue' : 'unpaid')));
            }

            var number = data.bill_number || '';
            if (document.getElementById('detailInvNumber')) document.getElementById('detailInvNumber').textContent = number;
            if (document.getElementById('detailInvDate')) document.getElementById('detailInvDate').textContent = 'التاريخ: ' + (data.bill_date || '');
            if (document.getElementById('detailInvDue')) document.getElementById('detailInvDue').textContent = 'الاستحقاق: ' + (data.due_date || '');
            if (document.getElementById('detailParty')) document.getElementById('detailParty').textContent = (vendor.name || '') + ' (شريك)';
            if (document.getElementById('detailPartyContact')) document.getElementById('detailPartyContact').textContent = vendor.email || '';
            if (document.getElementById('detailShipment')) document.getElementById('detailShipment').textContent = shipment.bl_number || '';

            var itemsBody = document.getElementById('detailLineItems');
            if (itemsBody && Array.isArray(data.items)) {
                itemsBody.innerHTML = '';
                data.items.forEach(function (item, idx) {
                    var tr = document.createElement('tr');
                    tr.innerHTML =
                        '<td>' + (idx + 1) + '</td>' +
                        '<td>' + (item.description || '') + '</td>' +
                        '<td>' + (item.quantity || 0) + '</td>' +
                        '<td>' + (item.unit_price || 0) + '</td>' +
                        '<td class="fw-600">' + (item.line_total || 0) + '</td>';
                    itemsBody.appendChild(tr);
                });
            }

            if (document.getElementById('detailSubtotal')) document.getElementById('detailSubtotal').textContent = String(data.total_amount || 0);
            if (document.getElementById('detailTax')) document.getElementById('detailTax').textContent = String(data.tax_amount || 0);
            if (document.getElementById('detailTotal')) document.getElementById('detailTotal').textContent = String(data.net_amount || 0);

            var paymentsBody = document.getElementById('detailPayments');
            if (paymentsBody) {
                var payments = data.payments || [];
                if (payments.length) {
                    paymentsBody.innerHTML = payments.map(function (p) {
                        return '<tr>' +
                            '<td class="fs-sm">' + (p.paid_at || '') + '</td>' +
                            '<td class="fw-600">' + (p.amount || 0) + ' ' + (p.currency_code || '') + '</td>' +
                            '<td class="fs-sm">' + (p.method || '') + '</td>' +
                            '<td class="fs-sm">' + (p.reference || '—') + '</td>' +
                            '</tr>';
                    }).join('');
                } else {
                    paymentsBody.innerHTML = '<tr><td class="fs-sm" colspan="4">لا توجد دفعات بعد</td></tr>';
                }
            }

            var btnRecord = document.getElementById('detailBtnRecordPayment');
            if (btnRecord) {
                btnRecord.style.display = data.status === 'paid' ? 'none' : 'inline-flex';
                btnRecord.onclick = function () {
                    openPartnerBillPayment(id);
                };
            }

            if (typeof openModal === 'function') {
                openModal('invoiceDetailsModal');
            }
        })
        .catch(function () {
            // silent
        });
}

function openPartnerBillPayment(id) {
    var modal = document.getElementById('recordPaymentModal');
    if (modal) {
        modal.setAttribute('data-vendor-bill-id', String(id));
    }
    if (typeof openModal === 'function') {
        openModal('recordPaymentModal');
    }
}

