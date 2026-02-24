// ========================================
// AMAZON MARINE — Role-based view differences (Sales, Accounting, Pricing vs Admin)
// Run after role-auth.js. Uses getCurrentRole() and getRoleConfig().
// ========================================

(function () {
    function getRole() {
        return (typeof getCurrentRole === 'function' ? getCurrentRole() : null) || localStorage.getItem('amazonMarineRole') || 'admin';
    }
    function getConfig() {
        return (typeof getRoleConfig === 'function' ? getRoleConfig() : null) || { user: 'Capt. Mostafa', nameAr: 'مدير النظام' };
    }

    function applyRoleOnlyAndHide() {
        var role = getRole();
        document.querySelectorAll('[data-role-only]').forEach(function (el) {
            var allowed = (el.getAttribute('data-role-only') || '').split(',').map(function (s) { return s.trim(); });
            el.style.display = allowed.indexOf(role) !== -1 ? '' : 'none';
        });
        document.querySelectorAll('[data-role-hide]').forEach(function (el) {
            var hidden = (el.getAttribute('data-role-hide') || '').split(',').map(function (s) { return s.trim(); });
            el.style.display = hidden.indexOf(role) !== -1 ? 'none' : '';
        });
        document.querySelectorAll('[data-role-edit]').forEach(function (el) {
            var canEdit = (el.getAttribute('data-role-edit') || '').split(',').map(function (s) { return s.trim(); });
            var show = canEdit.indexOf(role) !== -1;
            el.style.display = show ? '' : 'none';
            if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                el.disabled = !show;
                if (el.classList) el.classList.toggle('readonly-action', !show);
            }
        });
    }

    function applySalesFilterMyClients() {
        var role = getRole();
        if (role !== 'sales') {
            if (role === 'sales_manager') {
                document.querySelectorAll('[data-sales-filter-table]').forEach(function(wrapper) {
                    var table = wrapper.querySelector('table');
                    if (!table || !table.tBodies || !table.tBodies[0]) return;
                    table.tBodies[0].querySelectorAll('tr[data-sales-rep], tr[data-sales]').forEach(function(tr) { tr.style.display = ''; });
                });
                document.querySelectorAll('[data-sales-rep]').forEach(function(el) { el.style.display = ''; });
            }
            return;
        }
        var userName = getConfig().user;
        if (!userName) return;
        document.querySelectorAll('[data-sales-rep]').forEach(function (el) {
            var rep = (el.getAttribute('data-sales-rep') || '').trim();
            el.style.display = rep === userName ? '' : 'none';
        });
        document.querySelectorAll('[data-sales-filter-table]').forEach(function (wrapper) {
            var table = wrapper.querySelector('table');
            if (!table || !table.tBodies || !table.tBodies[0]) return;
            var rows = table.tBodies[0].querySelectorAll('tr[data-sales-rep], tr[data-sales]');
            rows.forEach(function (tr) {
                var rep = (tr.getAttribute('data-sales-rep') || tr.getAttribute('data-sales') || '').trim();
                tr.style.display = rep === userName ? '' : 'none';
            });
        });
    }

    function applyAttendanceMyOnly() {
        var role = getRole();
        var page = (window.location.pathname || '').split('/').pop() || '';
        if (page !== 'attendance.html') return;
        var userName = getConfig().user;
        if (role === 'admin') {
            document.querySelectorAll('[data-attendance-scope="all"]').forEach(function (el) { el.style.display = ''; });
            document.querySelectorAll('[data-attendance-scope="my"]').forEach(function (el) { el.style.display = 'none'; });
            document.querySelectorAll('.att-today-row[data-name], tr[data-attendance-row]').forEach(function (tr) { tr.style.display = ''; });
        } else {
            document.querySelectorAll('[data-attendance-scope="all"]').forEach(function (el) { el.style.display = ''; });
            document.querySelectorAll('[data-attendance-scope="my"]').forEach(function (el) { el.style.display = ''; });
            document.querySelectorAll('.att-today-row[data-name]').forEach(function (tr) {
                var name = (tr.getAttribute('data-name') || '').trim();
                tr.style.display = name === userName ? '' : 'none';
            });
        }
    }

    function applyReportsByRole() {
        var role = getRole();
        document.querySelectorAll('[data-reports-role]').forEach(function (el) {
            var allowed = (el.getAttribute('data-reports-role') || '').split(',').map(function (s) { return s.trim(); });
            el.style.display = allowed.indexOf(role) !== -1 ? '' : 'none';
        });
    }

    function applyInvoicesRole() {
        var role = getRole();
        if (role === 'sales' || role === 'pricing' || role === 'support') {
            document.querySelectorAll('[data-invoices-create]').forEach(function (el) { el.style.display = 'none'; });
            document.querySelectorAll('[data-invoices-edit]').forEach(function (el) { el.style.display = 'none'; });
        }
        if (role === 'pricing') {
            document.querySelectorAll('.data-table [data-invoices-edit-cell]').forEach(function (el) { el.classList.add('readonly'); });
        }
    }

    function applyShipmentsRoleColumns() {
        var role = getRole();
        document.querySelectorAll('[data-shipments-col]').forEach(function (el) {
            var showFor = (el.getAttribute('data-shipments-col') || '').split(',').map(function (s) { return s.trim(); });
            el.style.display = showFor.indexOf(role) !== -1 ? '' : 'none';
        });
        document.querySelectorAll('th[data-shipments-col], td[data-shipments-col]').forEach(function (el) {
            var showFor = (el.getAttribute('data-shipments-col') || '').split(',').map(function (s) { return s.trim(); });
            el.style.display = showFor.indexOf(role) !== -1 ? '' : 'none';
        });
    }

    function applyPricingModuleEdit() {
        var role = getRole();
        if (role === 'sales' || role === 'accounting') {
            document.querySelectorAll('[data-pricing-edit]').forEach(function (el) {
                el.style.display = 'none';
                if (el.tagName === 'BUTTON') el.disabled = true;
            });
        }
    }

    function applySupportReadOnly() {
        var role = getRole();
        if (role !== 'support') return;
        document.querySelectorAll('[data-invoices-create]').forEach(function (el) { el.style.display = 'none'; });
        document.querySelectorAll('[data-invoices-edit]').forEach(function (el) { el.style.display = 'none'; });
        document.querySelectorAll('[data-crm-edit], [data-clients-create]').forEach(function (el) {
            el.style.display = 'none';
            if (el.tagName === 'BUTTON') el.disabled = true;
        });
    }

    function applyOperationSDStatusOnly() {
        var role = getRole();
        if (role !== 'operation') return;
        var page = (window.location.pathname || '').split('/').pop() || '';
        if (page !== 'sd-forms.html') return;
        document.querySelectorAll('[data-sd-operation-status-only]').forEach(function (el) { el.style.display = ''; });
        document.querySelectorAll('[data-sd-create], [data-sd-edit-form]').forEach(function (el) { el.style.display = 'none'; });
    }

    function init() {
        applyRoleOnlyAndHide();
        applySalesFilterMyClients();
        applyAttendanceMyOnly();
        applyReportsByRole();
        applyInvoicesRole();
        applyShipmentsRoleColumns();
        applyPricingModuleEdit();
        applySupportReadOnly();
        applyOperationSDStatusOnly();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
