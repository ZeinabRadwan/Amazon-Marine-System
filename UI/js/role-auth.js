// ========================================
// AMAZON MARINE CRM — Role-Based Access Control
// ========================================

// Role definitions and their allowed pages
const ROLES = {
    admin: {
        nameAr: 'مدير النظام',
        nameEn: 'Admin',
        user: 'Capt. Mostafa',
        initials: 'MD',
        allowedPages: [
            'dashboard.html', 'clients.html', 'shipments.html', 'sd-forms.html', 'operations.html',
            'invoices.html', 'accounting.html', 'treasury.html', 'expenses.html', 'pricing.html',
            'partners.html', 'reports.html', 'documents.html', 'attendance.html', 'visits.html',
            'customer-service.html', 'tickets.html',
            'settings.html', 'cost-viewer.html', 'profile.html'
        ],
        showClockInOut: true
    },
    sales: {
        nameAr: 'مبيعات',
        nameEn: 'Sales',
        user: 'أحمد خيري',
        initials: 'AK',
        allowedPages: [
            'dashboard.html', 'clients.html', 'sd-forms.html', 'visits.html',
            'shipments.html', 'pricing.html', 'reports.html', 'attendance.html', 'settings.html', 'profile.html'
        ],
        showClockInOut: true
    },
    accounting: {
        nameAr: 'محاسبة',
        nameEn: 'Accounting',
        user: 'كريم عادل',
        initials: 'KA',
        allowedPages: [
            'dashboard.html', 'clients.html', 'shipments.html', 'invoices.html', 'accounting.html',
            'treasury.html', 'expenses.html', 'partners.html', 'reports.html', 'attendance.html', 'settings.html', 'profile.html'
        ],
        showClockInOut: true
    },
    pricing: {
        nameAr: 'فريق التسعير',
        nameEn: 'Pricing Team',
        user: 'نادية حسن',
        initials: 'NH',
        allowedPages: [
            'dashboard.html', 'clients.html', 'shipments.html', 'invoices.html', 'pricing.html',
            'cost-viewer.html', 'reports.html', 'attendance.html', 'settings.html', 'profile.html'
        ],
        showClockInOut: true
    },
    operation: {
        nameAr: 'العمليات',
        nameEn: 'Operations',
        user: 'عماد العمليات',
        initials: 'OO',
        allowedPages: [
            'dashboard.html', 'operations.html', 'shipments.html',
            'attendance.html', 'profile.html', 'settings.html'
        ],
        showClockInOut: true
    },
    support: {
        nameAr: 'الدعم الفني',
        nameEn: 'Support',
        user: 'سارة الدعم',
        initials: 'SD',
        allowedPages: [
            'dashboard.html', 'clients.html', 'shipments.html', 'customer-service.html', 'tickets.html', 'visits.html',
            'invoices.html', 'attendance.html', 'profile.html', 'settings.html'
        ],
        showClockInOut: true
    },
    sales_manager: {
        nameAr: 'مدير المبيعات',
        nameEn: 'Sales Manager',
        user: 'خالد المدير',
        initials: 'KM',
        allowedPages: [
            'dashboard.html', 'clients.html', 'sd-forms.html', 'shipments.html', 'reports.html',
            'visits.html', 'team-performance.html', 'attendance.html', 'profile.html', 'settings.html'
        ],
        showClockInOut: true
    }
};

// Get current role from localStorage
function getCurrentRole() {
    return localStorage.getItem('amazonMarineRole') || 'admin';
}

// Set role
function setRole(role) {
    localStorage.setItem('amazonMarineRole', role);
}

// Get role config
function getRoleConfig() {
    return ROLES[getCurrentRole()] || ROLES.admin;
}

// ---- CLOCK IN/OUT STATE ----
function getClockState() {
    const data = localStorage.getItem('amazonMarineClockState');
    if (data) return JSON.parse(data);
    return { clockedIn: false, clockInTime: null };
}

function setClockState(state) {
    localStorage.setItem('amazonMarineClockState', JSON.stringify(state));
}

// ---- APPLY ROLE ON PAGE LOAD ----
function applyRoleToPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    // Skip role enforcement on login and public auth pages
    const publicPages = ['index.html', '', 'forgot-password.html', 'reset-password.html'];
    if (publicPages.includes(currentPage)) return;

    const role = getCurrentRole();
    const config = getRoleConfig();

    // 1. Check if user has access to this page
    if (!config.allowedPages.includes(currentPage)) {
        window.location.href = 'dashboard.html';
        return;
    }

    // 2. Hide sidebar items the user can't access
    document.querySelectorAll('.menu li').forEach(li => {
        const link = li.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href && !config.allowedPages.includes(href)) {
                li.style.display = 'none';
            }
        }
    });

    // 3. Hide empty menu sections
    document.querySelectorAll('.menu-label').forEach(label => {
        const nextMenu = label.nextElementSibling;
        if (nextMenu && nextMenu.classList.contains('menu')) {
            const visibleItems = nextMenu.querySelectorAll('li:not([style*="display: none"])');
            if (visibleItems.length === 0) {
                label.style.display = 'none';
                nextMenu.style.display = 'none';
            }
        }
    });

    // 4. Update user info in sidebar footer and topbar
    const sidebarName = document.querySelector('.sidebar-footer .user-name');
    const sidebarRole = document.querySelector('.sidebar-footer .user-role');
    const sidebarAvatar = document.querySelector('.sidebar-footer .user-avatar');
    const topbarName = document.querySelector('.profile-pill span');
    const topbarAvatar = document.querySelector('.profile-pill .profile-avatar');

    if (sidebarName) sidebarName.textContent = config.user;
    if (sidebarRole) sidebarRole.textContent = config.nameAr;
    if (sidebarAvatar) sidebarAvatar.textContent = config.initials;
    if (topbarName) topbarName.textContent = config.user;
    if (topbarAvatar) topbarAvatar.textContent = config.initials;

    // 5. Show clock in/out for all employees
    if (config.showClockInOut) {
        injectClockInOut();
    }
}

// Run when DOM is ready (script is at end of body so DOM may already be loaded)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyRoleToPage);
} else {
    applyRoleToPage();
}

// ---- CLOCK IN/OUT UI ----
function injectClockInOut() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight) return;

    const state = getClockState();

    const clockWidget = document.createElement('div');
    clockWidget.className = 'clock-widget';
    clockWidget.id = 'clockWidget';

    if (state.clockedIn) {
        const elapsed = getElapsed(state.clockInTime);
        clockWidget.innerHTML = `
            <div class="clock-status clocked-in">
                <i class='bx bx-time-five'></i>
                <span class="clock-timer" id="clockTimer">${elapsed}</span>
            </div>
            <button class="btn btn-sm clock-btn clock-out-btn" onclick="clockOut()">
                <i class='bx bx-log-out'></i> انصراف
            </button>
        `;
    } else {
        clockWidget.innerHTML = `
            <button class="btn btn-sm clock-btn clock-in-btn" onclick="clockIn()">
                <i class='bx bx-log-in'></i> تسجيل حضور
            </button>
        `;
    }

    topbarRight.insertBefore(clockWidget, topbarRight.firstChild);

function showClockNotification(title, msg) {
    const notif = document.createElement('div');
    notif.className = 'clock-notification';
    notif.innerHTML = `<strong>${title}</strong><br><span>${msg}</span>`;
    document.body.appendChild(notif);

    setTimeout(() => notif.classList.add('show'), 50);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

    // Start timer if clocked in
    if (state.clockedIn) {
        startClockTimer(state.clockInTime);
    }

function clockIn() {
    const now = new Date().toISOString();
    setClockState({ clockedIn: true, clockInTime: now });

    // Re-render widget
    const widget = document.getElementById('clockWidget');
    if (widget) widget.remove();
    injectClockInOut();

    // Show confirmation
    showClockNotification('تم تسجيل الحضور ✅', `الوقت: ${formatTime(new Date())}`);
}

function clockOut() {
    const state = getClockState();
    const elapsed = getElapsed(state.clockInTime);
    setClockState({ clockedIn: false, clockInTime: null });

    // Re-render widget
    const widget = document.getElementById('clockWidget');
    if (widget) widget.remove();
    injectClockInOut();

    // Show confirmation
    showClockNotification('تم تسجيل الانصراف 👋', `مدة العمل: ${elapsed}`);
}

function getElapsed(fromISO) {
    const from = new Date(fromISO);
    const now = new Date();
    const diff = Math.floor((now - from) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime(date) {
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

let clockInterval = null;
function startClockTimer(fromISO) {
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
        const timer = document.getElementById('clockTimer');
        if (timer) {
            timer.textContent = getElapsed(fromISO);
        }
    }, 1000);
}
