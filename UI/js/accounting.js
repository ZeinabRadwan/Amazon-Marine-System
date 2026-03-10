document.addEventListener('DOMContentLoaded', function () {
    loadAccountingSummary();
    loadClientAccounts();
    loadPartnerAccounts();
});

function loadAccountingSummary() {
    var monthsEl = document.getElementById('accChartMonths');
    var months = monthsEl ? parseInt(monthsEl.value || '6', 10) : 6;

    fetch('/api/v1/accounting/summary?months=' + months, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var data = json.data || {};
            var totals = data.totals || {};
            var rp = data.receivables_payables || {};
            var balanceByCurrency = data.balance_by_currency || [];

            var cards = document.querySelectorAll('.stats-row .stat-card h3');
            if (cards[0] && typeof totals.receivables === 'number') {
                cards[0].textContent = '$' + totals.receivables.toLocaleString();
            }
            if (cards[1] && typeof totals.payables === 'number') {
                cards[1].textContent = '$' + totals.payables.toLocaleString();
            }
            if (cards[2] && typeof totals.net === 'number') {
                cards[2].textContent = '$' + totals.net.toLocaleString();
            }

            if (window.Chart) {
                var rpCtx = document.getElementById('chartReceivablesPayables');
                if (rpCtx) {
                    new Chart(rpCtx, {
                        type: 'bar',
                        data: {
                            labels: rp.labels || [],
                            datasets: [
                                { label: 'المستحقات ($)', data: rp.receivables || [], backgroundColor: 'rgba(16, 185, 129, 0.6)', borderColor: '#10b981', borderWidth: 1 },
                                { label: 'المطلوبات ($)', data: rp.payables || [], backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: '#ef4444', borderWidth: 1 }
                            ]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }

                var balCtx = document.getElementById('chartBalanceByCurrency');
                if (balCtx) {
                    new Chart(balCtx, {
                        type: 'doughnut',
                        data: {
                            labels: balanceByCurrency.map(function (row) { return row.currency; }),
                            datasets: [{
                                data: balanceByCurrency.map(function (row) { return row.balance; }),
                                backgroundColor: ['#17a2b8', '#d4a853', '#2e3f8e'],
                                borderWidth: 0
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            }
        })
        .catch(function () { /* silent */ });
}

function loadClientAccounts() {
    var search = document.getElementById('accClientSearch');
    var currency = document.getElementById('accClientCurrency');
    var sort = document.getElementById('accClientSort');

    var params = [];
    if (search && search.value) params.push('search=' + encodeURIComponent(search.value));
    if (currency && currency.value) params.push('currency=' + encodeURIComponent(currency.value));
    if (sort && sort.value) params.push('sort=' + encodeURIComponent(sort.value));

    var url = '/api/v1/accounting/clients';
    if (params.length) url += '?' + params.join('&');

    fetch(url, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var rows = json.data || [];
            var tbody = document.querySelector('#accClientsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            rows.forEach(function (row) {
                var tr = document.createElement('tr');
                tr.className = 'acc-client-row';
                tr.innerHTML =
                    '<td><input type=\"checkbox\" class=\"acc-client-checkbox\"></td>' +
                    '<td class=\"fw-600\">' + (row.client_name || '') + '</td>' +
                    '<td>' + formatMoney(row.total_sales, row.currency) + '</td>' +
                    '<td class=\"text-success fw-600\">' + formatMoney(row.paid, row.currency) + '</td>' +
                    '<td class=\"' + (row.balance > 0 ? 'text-danger' : 'text-success') + ' fw-700\">' + formatMoney(row.balance, row.currency) + '</td>' +
                    '<td>' + (row.currency || '') + '</td>' +
                    '<td class=\"text-muted fs-sm\">' + (row.last_payment_date || '') + '</td>' +
                    '<td><button class=\"btn btn-sm btn-outline\" onclick=\"openModal(\\'clientLedgerModal\\')\"><i class=\"bx bx-spreadsheet\"></i> كشف حساب</button></td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () { /* silent */ });
}

function loadPartnerAccounts() {
    var search = document.getElementById('accPartnerSearch');
    var currency = document.getElementById('accPartnerCurrency');
    var type = document.getElementById('accPartnerType');
    var sort = document.getElementById('accPartnerSort');

    var params = [];
    if (search && search.value) params.push('search=' + encodeURIComponent(search.value));
    if (currency && currency.value) params.push('currency=' + encodeURIComponent(currency.value));
    if (type && type.value) params.push('partner_type=' + encodeURIComponent(type.value));
    if (sort && sort.value) params.push('sort=' + encodeURIComponent(sort.value));

    var url = '/api/v1/accounting/partners';
    if (params.length) url += '?' + params.join('&');

    fetch(url, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var rows = json.data || [];
            var tbody = document.querySelector('#accPartnersTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            rows.forEach(function (row) {
                var tr = document.createElement('tr');
                tr.className = 'acc-partner-row';
                tr.innerHTML =
                    '<td><input type=\"checkbox\" class=\"acc-partner-checkbox\"></td>' +
                    '<td class=\"fw-600\">' + (row.partner_name || '') + '</td>' +
                    '<td>' + (row.type || '') + '</td>' +
                    '<td>' + formatMoney(row.total_due, row.currency) + '</td>' +
                    '<td class=\"text-success fw-600\">' + formatMoney(row.paid, row.currency) + '</td>' +
                    '<td class=\"' + (row.balance > 0 ? 'text-danger' : 'text-success') + ' fw-700\">' + formatMoney(row.balance, row.currency) + '</td>' +
                    '<td>' + (row.currency || '') + '</td>' +
                    '<td><button class=\"btn btn-sm btn-outline\" onclick=\"openModal(\\'partnerLedgerModal\\')\"><i class=\"bx bx-spreadsheet\"></i></button></td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () { /* silent */ });
}

function formatMoney(value, currency) {
    var v = typeof value === 'number' ? value : parseFloat(value || '0');
    if (isNaN(v)) v = 0;
    var symbol = currency === 'EUR' ? '€' : currency === 'EGP' ? 'EGP ' : '$';
    return symbol + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

