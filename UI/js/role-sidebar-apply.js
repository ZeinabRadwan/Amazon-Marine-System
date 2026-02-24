// Apply sidebar and user info from localStorage (runs as soon as script loads)
(function() {
    var role = localStorage.getItem('amazonMarineRole') || 'admin';
    var R = {
        admin: { allowedPages: ['dashboard.html','clients.html','shipments.html','sd-forms.html','operations.html','invoices.html','accounting.html','treasury.html','expenses.html','pricing.html','partners.html','reports.html','documents.html','attendance.html','visits.html','settings.html','cost-viewer.html','profile.html'], user: 'Capt. Mostafa', nameAr: 'مدير النظام', initials: 'MD' },
        sales: { allowedPages: ['dashboard.html','clients.html','sd-forms.html','visits.html','shipments.html','pricing.html','reports.html','attendance.html','settings.html','profile.html'], user: 'أحمد خيري', nameAr: 'مبيعات', initials: 'AK' },
        accounting: { allowedPages: ['dashboard.html','clients.html','shipments.html','invoices.html','accounting.html','treasury.html','expenses.html','partners.html','reports.html','attendance.html','settings.html','profile.html'], user: 'كريم عادل', nameAr: 'محاسبة', initials: 'KA' },
        pricing: { allowedPages: ['dashboard.html','clients.html','shipments.html','invoices.html','pricing.html','cost-viewer.html','reports.html','attendance.html','settings.html','profile.html'], user: 'نادية حسن', nameAr: 'فريق التسعير', initials: 'NH' },
        operation: { allowedPages: ['dashboard.html','operations.html','shipments.html','attendance.html','profile.html','settings.html'], user: 'عماد العمليات', nameAr: 'العمليات', initials: 'OO' },
        support: { allowedPages: ['dashboard.html','clients.html','shipments.html','tickets.html','visits.html','invoices.html','attendance.html','profile.html','settings.html'], user: 'سارة الدعم', nameAr: 'الدعم الفني', initials: 'SD' },
        sales_manager: { allowedPages: ['dashboard.html','clients.html','sd-forms.html','shipments.html','reports.html','visits.html','team-performance.html','attendance.html','profile.html','settings.html'], user: 'خالد المدير', nameAr: 'مدير المبيعات', initials: 'KM' }
    };
    var c = R[role] || R.admin;
    document.querySelectorAll('.menu li').forEach(function(li) {
        var a = li.querySelector('a');
        if (a) {
            var h = a.getAttribute('href');
            if (h && c.allowedPages.indexOf(h) === -1) li.style.display = 'none';
        }
    });
    document.querySelectorAll('.menu-label').forEach(function(l) {
        var n = l.nextElementSibling;
        if (n && n.classList.contains('menu')) {
            var v = n.querySelectorAll('li:not([style*="display: none"])');
            if (v.length === 0) { l.style.display = 'none'; n.style.display = 'none'; }
        }
    });
    var el = document.querySelector('.sidebar-footer .user-name'); if (el) el.textContent = c.user;
    el = document.querySelector('.sidebar-footer .user-role'); if (el) el.textContent = c.nameAr;
    el = document.querySelector('.sidebar-footer .user-avatar'); if (el) el.textContent = c.initials;
    el = document.querySelector('.profile-pill span'); if (el) el.textContent = c.user;
    el = document.querySelector('.profile-pill .profile-avatar'); if (el) el.textContent = c.initials;
})();
