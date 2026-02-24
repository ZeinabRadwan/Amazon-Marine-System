// ========================================
// AMAZON MARINE — SD → Operations Workflow
// When Sales submits an SD Form, create Operations Task, notify, update status.
// ========================================

var OPERATIONS_TASKS_KEY = 'amazonMarineOperationsTasks';
var NOTIFICATIONS_KEY = 'amazonMarineNotifications';

function getOperationsTasks() {
    try {
        var raw = localStorage.getItem(OPERATIONS_TASKS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function setOperationsTasks(tasks) {
    try {
        localStorage.setItem(OPERATIONS_TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {}
}

function addOperationsTask(task) {
    var tasks = getOperationsTasks();
    task.id = task.id || 'opt-' + Date.now();
    task.createdAt = task.createdAt || new Date().toISOString();
    task.status = task.status || 'أرسل للعمليات';
    tasks.unshift(task);
    setOperationsTasks(tasks);
    return task.id;
}

function getNotifications() {
    try {
        var raw = localStorage.getItem(NOTIFICATIONS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function addNotification(n) {
    var list = getNotifications();
    n.id = n.id || 'notif-' + Date.now();
    n.read = false;
    n.createdAt = n.createdAt || new Date().toISOString();
    list.unshift(n);
    try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
    } catch (e) {}
}

/**
 * Called when user clicks "إرسال للعمليات" on an SD row.
 * @param {HTMLTableRowElement} tr - the .sd-row <tr> element
 */
function sendSDToOperations(tr) {
    if (!tr || !tr.classList.contains('sd-row')) return;

    var cells = tr.querySelectorAll('td');
    var getCell = function(idx) {
        return cells[idx] ? (cells[idx].textContent || '').trim() : '';
    };
    // Columns: [0] checkbox, [1] SD#, [2] Client, [3] Supplier, [4] Port, [5] Destination, [6] Goods, [7] Sales, [8] Status, [9] Date, [10] actions
    var sdNumber = getCell(1);
    var client = getCell(2);
    var port = getCell(4);
    var destination = getCell(5);
    var route = port && destination ? port + ' → ' + destination : (port || destination || '—');
    var goods = getCell(6);

    var task = {
        sdNumber: sdNumber,
        client: client,
        route: route,
        goods: goods,
        containers: '',
        blNumber: '',
        type: 'Booking',
        status: 'أرسل للعمليات',
        assignedOperator: '',
        deadline: ''
    };
    addOperationsTask(task);

    addNotification({
        title: 'نموذج SD أرسل للعمليات',
        body: 'تم إنشاء مهمة عمليات من ' + sdNumber + ' — ' + client + '. المسار: ' + route,
        type: 'sd_to_operations',
        sdNumber: sdNumber,
        client: client
    });

    // Update row status to أرسل للعمليات
    tr.setAttribute('data-status', 'أرسل للعمليات');
    var statusCell = cells[8];
    if (statusCell) {
        var badge = statusCell.querySelector('.status-badge');
        if (badge) {
            badge.textContent = 'أرسل للعمليات';
            badge.className = 'status-badge pending';
        } else {
            statusCell.innerHTML = '<span class="status-badge pending">أرسل للعمليات</span>';
        }
    }

    // In-system toast
    showSDOperationsToast('تم إرسال نموذج SD للعمليات', 'تم إنشاء مهمة عمليات وإشعار للفريق. (محاكاة: إشعار بريد إلكتروني للعمليات)');
}

function showSDOperationsToast(title, message) {
    var toast = document.createElement('div');
    toast.className = 'clock-notification';
    toast.innerHTML = '<strong>' + title + '</strong><br><span>' + message + '</span>';
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 50);
    setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.remove(); }, 300);
    }, 4000);
}
