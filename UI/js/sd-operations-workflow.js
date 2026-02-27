// ========================================
// AMAZON MARINE — SD → Operations Workflow
// When Sales submits an SD Form, create Operations Task, notify, update status.
// ========================================

var OPERATIONS_TASKS_KEY = 'amazonMarineOperationsTasks';
var NOTIFICATIONS_KEY = 'amazonMarineNotifications';
var OPS_STATUS_KEY = 'amazonMarineOpsStatus';   // { [sdNumber]: { status, notes[], assignedTo, updatedAt } }

/* ── Core task store ── */
function getOperationsTasks() {
    try { var raw = localStorage.getItem(OPERATIONS_TASKS_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
}
function setOperationsTasks(tasks) {
    try { localStorage.setItem(OPERATIONS_TASKS_KEY, JSON.stringify(tasks)); } catch (e) { }
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

/* ── Notifications store ── */
function getNotifications() {
    try { var raw = localStorage.getItem(NOTIFICATIONS_KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
}
function addNotification(n) {
    var list = getNotifications();
    n.id = n.id || 'notif-' + Date.now();
    n.read = false;
    n.createdAt = n.createdAt || new Date().toISOString();
    list.unshift(n);
    try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list)); } catch (e) { }
}

/* ── Per-SD Ops Status store ── */
function getAllOpsStatus() {
    try { var raw = localStorage.getItem(OPS_STATUS_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
}

/**
 * Get the saved Operations status & notes for a given SD number.
 * Returns { status, notes:[], assignedTo, updatedAt } or null
 */
function getOpsStatusForSD(sdNumber) {
    var all = getAllOpsStatus();
    return all[sdNumber] || null;
}

/**
 * Save / update the Operations status and optionally push a new note.
 * @param {string}  sdNumber
 * @param {string}  status     — Arabic status string
 * @param {string|null} noteText — new note to append (or null)
 * @param {string}  assignedTo
 */
function saveOpsStatusForSD(sdNumber, status, noteText, assignedTo) {
    var all = getAllOpsStatus();
    var rec = all[sdNumber] || { status: 'أرسل للعمليات', notes: [], assignedTo: '', updatedAt: '' };
    rec.status = status || rec.status;
    rec.assignedTo = assignedTo || rec.assignedTo;
    rec.updatedAt = new Date().toISOString();
    if (noteText && noteText.trim()) {
        rec.notes = rec.notes || [];
        rec.notes.unshift({ text: noteText.trim(), at: new Date().toISOString() });
    }
    all[sdNumber] = rec;
    try { localStorage.setItem(OPS_STATUS_KEY, JSON.stringify(all)); } catch (e) { }

    /* Also update the status field in the tasks array */
    var tasks = getOperationsTasks();
    tasks.forEach(function (t) { if (t.sdNumber === sdNumber) t.status = status; });
    setOperationsTasks(tasks);
}

/* ── Status badge CSS class helper ── */
function opsStatusClass(status) {
    var map = {
        'أرسل للعمليات': 'pending',
        'تم الاستلام': 'new',
        'قيد التنفيذ': 'in-transit',
        'محجوز': 'active',
        'معلق': 'draft',
        'ملغي': 'cancelled',
        'مرفوض': 'unpaid'
    };
    return map[status] || 'pending';
}

/**
 * Called when Sales clicks "إرسال للعمليات" on an SD row.
 * @param {HTMLTableRowElement} tr
 */
function sendSDToOperations(tr) {
    if (!tr || !tr.classList.contains('sd-row')) return;

    var cells = tr.querySelectorAll('td');
    var getCell = function (idx) { return cells[idx] ? (cells[idx].textContent || '').trim() : ''; };
    // Columns: [0]checkbox [1]SD# [2]Client [3]Supplier [4]POL [5]POD [6]Goods [7]Sales [8]Status [9]Date [10]actions
    var sdNumber = getCell(1);
    var client = getCell(2);
    var supplier = getCell(3);
    var pol = getCell(4);  // Port of Loading
    var pod = getCell(5);  // Port of Discharge
    var goods = getCell(6);
    var salesAgent = getCell(7);
    var date = getCell(9);
    var route = pol && pod ? pol + ' → ' + pod : (pol || pod || '—');

    /* Prevent double-sending */
    var existing = getOperationsTasks().find(function (t) { return t.sdNumber === sdNumber; });
    if (existing) {
        showSDOperationsToast('تنبيه', 'تم إرسال هذا النموذج للعمليات مسبقاً.');
        return;
    }

    addOperationsTask({
        sdNumber: sdNumber,
        client: client,
        supplier: supplier,
        pol: pol,
        pod: pod,
        route: route,
        goods: goods,
        salesAgent: salesAgent,
        date: date,
        containers: '',
        blNumber: '',
        incoterms: '',
        hsCode: '',
        grossWeight: '',
        netWeight: '',
        vesselDate: '',
        specialInstructions: '',
        type: 'Booking',
        status: 'أرسل للعمليات',
        assignedOperator: '',
        deadline: ''
    });

    /* Initialise ops status record */
    saveOpsStatusForSD(sdNumber, 'أرسل للعمليات', null, '');

    addNotification({
        title: 'نموذج SD أرسل للعمليات',
        body: 'تم إنشاء مهمة عمليات من ' + sdNumber + ' — ' + client + '. المسار: ' + route,
        type: 'sd_to_operations',
        sdNumber: sdNumber,
        client: client
    });

    /* Update row badge */
    tr.setAttribute('data-status', 'أرسل للعمليات');
    var statusCell = cells[8];
    if (statusCell) {
        var badge = statusCell.querySelector('.status-badge');
        if (badge) { badge.textContent = 'أرسل للعمليات'; badge.className = 'status-badge pending'; }
        else statusCell.innerHTML = '<span class="status-badge pending">أرسل للعمليات</span>';
    }

    showSDOperationsToast('تم إرسال نموذج SD للعمليات', 'تم إنشاء مهمة عمليات وإشعار للفريق.');
}


function showSDOperationsToast(title, message) {
    var toast = document.createElement('div');
    toast.className = 'clock-notification';
    toast.innerHTML = '<strong>' + title + '</strong><br><span>' + message + '</span>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 50);
    setTimeout(function () { toast.classList.remove('show'); setTimeout(function () { toast.remove(); }, 300); }, 4000);
}
