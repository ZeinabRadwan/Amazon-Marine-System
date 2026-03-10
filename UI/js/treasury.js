document.addEventListener('DOMContentLoaded', function () {
    loadTreasurySummary();
    loadTreasuryEntries();
    loadTreasuryExpenses();
});

function loadTreasurySummary() {
    var monthsEl = document.getElementById('chartMonths');
    var months = monthsEl ? parseInt(monthsEl.value || '6', 10) : 6;

    fetch('/api/v1/treasury/summary?months=' + months, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var data = json.data || {};
            var totals = data.totals || {};
            var cashFlow = data.cash_flow || {};
            var balance = data.balance || {};

            var cards = document.querySelectorAll('.stats-row .stat-card h3');
            if (cards[0] && typeof totals.cash_balance === 'number') {
                cards[0].textContent = '₺ ' + totals.cash_balance.toLocaleString();
            }
            if (cards[1] && typeof totals.bank_balance === 'number') {
                cards[1].textContent = '₺ ' + totals.bank_balance.toLocaleString();
            }
            if (cards[2] && typeof totals.monthly_expenses === 'number') {
                cards[2].textContent = '₺ ' + totals.monthly_expenses.toLocaleString();
            }

            if (window.Chart) {
                var flowCtx = document.getElementById('chartCashFlow');
                if (flowCtx) {
                    new Chart(flowCtx, {
                        type: 'bar',
                        data: {
                            labels: cashFlow.labels || [],
                            datasets: [
                                { label: 'وارد', data: cashFlow.inbound || [], backgroundColor: 'rgba(16,185,129,0.7)' },
                                { label: 'صادر', data: cashFlow.outbound || [], backgroundColor: 'rgba(239,68,68,0.6)' }
                            ]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }

                var balCtx = document.getElementById('chartBalance');
                if (balCtx) {
                    new Chart(balCtx, {
                        type: 'line',
                        data: {
                            labels: balance.labels || [],
                            datasets: [
                                {
                                    label: 'رصيد',
                                    data: balance.balance || [],
                                    borderColor: 'var(--accent-cyan)',
                                    backgroundColor: 'rgba(23,162,184,0.15)',
                                    fill: true,
                                    tension: 0.3
                                }
                            ]
                        },
                        options: { responsive: true, maintainAspectRatio: false }
                    });
                }
            }
        })
        .catch(function () { /* silent */ });
}

function loadTreasuryEntries() {
    var search = document.getElementById('treasurySearch');
    var type = document.getElementById('filterType');
    var sort = document.getElementById('sortTreasury');

    var params = [];
    if (search && search.value) params.push('search=' + encodeURIComponent(search.value));
    if (type && type.value) params.push('type=' + encodeURIComponent(type.value));
    if (sort && sort.value) params.push('sort=' + encodeURIComponent(sort.value));

    var url = '/api/v1/treasury/entries';
    if (params.length) url += '?' + params.join('&');

    fetch(url, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var rows = json.data || [];
            var tbody = document.querySelector('#treasuryTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            rows.forEach(function (row) {
                var tr = document.createElement('tr');
                tr.className = 'treasury-row';
                tr.innerHTML =
                    '<td>' + (row.entry_date || '') + '</td>' +
                    '<td>' + (row.description || '') + '</td>' +
                    '<td><span class=\"status-badge ' + (row.entry_type === 'in' ? 'active' : row.entry_type === 'out' ? 'unpaid' : 'booked') + '\">' + (row.entry_type || '') + '</span></td>' +
                    '<td>' + formatTreasuryAmount(row.amount, row.currency_code) + '</td>' +
                    '<td>—</td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () { /* silent */ });
}

function loadTreasuryExpenses() {
    var cat = document.getElementById('filterExpenseCategory');
    var params = [];
    if (cat && cat.value) params.push('category_id=' + encodeURIComponent(cat.value));

    var url = '/api/v1/treasury/expenses';
    if (params.length) url += '?' + params.join('&');

    fetch(url, { credentials: 'include' })
        .then(function (res) { return res.json(); })
        .then(function (json) {
            var rows = json.data || [];
            var tbody = document.querySelector('#expensesTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            rows.forEach(function (row) {
                var tr = document.createElement('tr');
                tr.className = 'expense-row';
                tr.setAttribute('data-category', row.category_name || '');
                tr.innerHTML =
                    '<td>' + (row.expense_date || '') + '</td>' +
                    '<td>' + (row.description || '') + '</td>' +
                    '<td><span class=\"status-badge\">' + (row.category_name || '') + '</span></td>' +
                    '<td class=\"fw-600\">' + formatTreasuryAmount(row.amount, row.currency_code) + '</td>' +
                    '<td>—</td>' +
                    '<td><button class=\"btn btn-outline btn-sm\"><i class=\"bx bx-show\"></i></button></td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () { /* silent */ });
}

function formatTreasuryAmount(value, currency) {
    var v = typeof value === 'number' ? value : parseFloat(value || '0');
    if (isNaN(v)) v = 0;
    var sign = v >= 0 ? '+' : '-';
    var abs = Math.abs(v);
    var symbol = currency === 'EGP' ? 'E£' : currency === 'EUR' ? '€' : '$';
    return (v === 0 ? '' : (sign + ' ')) + symbol + ' ' + abs.toLocaleString();
}

