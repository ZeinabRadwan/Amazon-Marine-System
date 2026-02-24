// ========================================
// AMAZON MARINE — Dynamic Shipment Status Management
// Centralized status list: localStorage + in-memory. Used by settings.html and shipments.html.
// ========================================

var SHIPMENT_STATUSES_KEY = 'amazonMarineShipmentStatuses';

var DEFAULT_STATUSES = [
    { id: 1, name: 'تم الحجز', nameEn: 'Booked', color: '#3B82F6', description: '', active: true },
    { id: 2, name: 'في الطريق', nameEn: 'In Transit', color: '#F59E0B', description: '', active: true },
    { id: 3, name: 'تخليص جمركي', nameEn: 'Customs Clearance', color: '#8B5CF6', description: '', active: true },
    { id: 4, name: 'تم التسليم', nameEn: 'Delivered', color: '#10B981', description: '', active: true }
];

function getShipmentStatuses() {
    try {
        var raw = localStorage.getItem(SHIPMENT_STATUSES_KEY);
        if (raw) {
            var list = JSON.parse(raw);
            if (Array.isArray(list) && list.length) return list;
        }
    } catch (e) {}
    setShipmentStatuses(DEFAULT_STATUSES.slice());
    return DEFAULT_STATUSES.slice();
}

function setShipmentStatuses(list) {
    try {
        localStorage.setItem(SHIPMENT_STATUSES_KEY, JSON.stringify(list));
    } catch (e) {}
}

function getActiveShipmentStatuses() {
    return getShipmentStatuses().filter(function (s) { return s.active !== false; });
}

function getStatusById(id) {
    var list = getShipmentStatuses();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
}

function getStatusByName(name) {
    var list = getShipmentStatuses();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
}

function nextStatusId() {
    var list = getShipmentStatuses();
    var max = 0;
    list.forEach(function (s) { if (s.id > max) max = s.id; });
    return max + 1;
}

function addShipmentStatus(status) {
    var list = getShipmentStatuses();
    status.id = status.id || nextStatusId();
    status.active = status.active !== false;
    list.push(status);
    setShipmentStatuses(list);
    return status.id;
}

function updateShipmentStatus(id, updates) {
    var list = getShipmentStatuses();
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
            if (updates.name !== undefined) list[i].name = updates.name;
            if (updates.nameEn !== undefined) list[i].nameEn = updates.nameEn;
            if (updates.color !== undefined) list[i].color = updates.color;
            if (updates.description !== undefined) list[i].description = updates.description;
            if (updates.active !== undefined) list[i].active = updates.active;
            setShipmentStatuses(list);
            return true;
        }
    }
    return false;
}

function deleteShipmentStatus(id) {
    var list = getShipmentStatuses().filter(function (s) { return s.id !== id; });
    setShipmentStatuses(list);
}

function toggleShipmentStatusActive(id) {
    var list = getShipmentStatuses();
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
            list[i].active = !list[i].active;
            setShipmentStatuses(list);
            return list[i].active;
        }
    }
    return false;
}

/** Return inline style string for a status badge (background + text color). */
function getStatusBadgeStyle(colorHex) {
    if (!colorHex) return '';
    var r = parseInt(colorHex.slice(1, 3), 16);
    var g = parseInt(colorHex.slice(3, 5), 16);
    var b = parseInt(colorHex.slice(5, 7), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    var textColor = luminance > 0.6 ? '#1a1a2e' : '#fff';
    return 'background:' + colorHex + ';color:' + textColor + ';';
}

/** Check if status name is used in any shipment row (from DOM or stored list). Optional: pass list of status names from page. */
function getShipmentStatusUsageCount(statusName) {
    try {
        var raw = localStorage.getItem('amazonMarineShipmentStatusUsage');
        if (raw) {
            var obj = JSON.parse(raw);
            return (obj[statusName] || 0);
        }
    } catch (e) {}
    return -1;
}

/** Call from shipments.html when table is rendered to record usage counts (optional). */
function setShipmentStatusUsage(counts) {
    try {
        localStorage.setItem('amazonMarineShipmentStatusUsage', JSON.stringify(counts || {}));
    } catch (e) {}
}
