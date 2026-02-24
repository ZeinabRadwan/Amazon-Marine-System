// ========================================
// AMAZON MARINE CRM — Minimal UI Interactions
// ========================================

// Modal open/close
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
        document.body.style.overflow = '';
    }
});

// Tab switching
function switchTab(tabGroup, tabName) {
    // Deactivate all tabs in group
    document.querySelectorAll(`[data-tab-group="${tabGroup}"] .tab`).forEach(t => t.classList.remove('active'));

    // Deactivate all tab panels whose id starts with this group name
    document.querySelectorAll(`.tab-content[id^="${tabGroup}-"]`).forEach(c => c.classList.remove('active'));

    // Activate selected tab button and panel
    const tab = document.querySelector(`[data-tab-group="${tabGroup}"] [data-tab="${tabName}"]`);
    const content = document.getElementById(`${tabGroup}-${tabName}`);
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');
}

// Notification panel toggle
function toggleNotifications(e) {
    e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    if (panel && !e.target.closest('.notif-wrapper')) {
        panel.classList.remove('show');
    }
});

// Language dropdown
function toggleLangDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('langDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('langDropdown');
    if (dropdown && !e.target.closest('.lang-dropdown')) {
        dropdown.classList.remove('show');
    }
});

// Currency dropdown
const CURRENCY_STORAGE_KEY = 'shipping-erp-currency';
function getStoredCurrency() {
    try {
        return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'USD';
    } catch (_) { return 'USD'; }
}
function setStoredCurrency(code) {
    try { localStorage.setItem(CURRENCY_STORAGE_KEY, code); } catch (_) {}
}

function toggleCurrencyDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('currencyDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('currencyDropdown');
    if (dropdown && !e.target.closest('.currency-dropdown')) {
        dropdown.classList.remove('show');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const currency = getStoredCurrency();
    const badge = document.getElementById('currencyCodeBadge');
    if (badge) badge.textContent = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'E£';
    document.querySelectorAll('.currency-dropdown-item').forEach(el => {
        const code = el.getAttribute('data-currency');
        el.classList.toggle('active', code === currency);
        el.addEventListener('click', () => {
            setStoredCurrency(code);
            if (badge) badge.textContent = code === 'USD' ? '$' : code === 'EUR' ? '€' : 'E£';
            document.querySelectorAll('.currency-dropdown-item').forEach(x => x.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('currencyDropdown').classList.remove('show');
        });
    });
});

// Sidebar menu active state
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.menu li').forEach(li => {
        const link = li.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        }
    });
});
