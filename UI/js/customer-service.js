// ========================================
// AMAZON MARINE — Customer Service CRM Module
// Pillars: Shipment Tracking & Updates | Ticket System | Communication Log
// Tracking: Customer-friendly statuses + Send Update (Email/WhatsApp + Templates)
// ========================================

(function () {
    var STORAGE_UPDATES = 'amazonMarineShipmentUpdates';
    var STORAGE_COMMS = 'amazonMarineCommsLog';
    var STORAGE_TICKETS = 'amazonMarineTickets';
    var TICKET_ID_PREFIX = 'TKT-';

    var TICKET_TYPE_LABELS = { inquiry: 'استفسار', complaint: 'شكوى', request: 'طلب' };
    var TICKET_PRIORITY_LABELS = { low: 'منخفض', medium: 'متوسط', high: 'عالي' };
    var TICKET_ASSIGNED_LABELS = { cs: 'خدمة العملاء', operations: 'العمليات', sales: 'المبيعات', accounting: 'المحاسبة' };
    var TICKET_STATUS_LABELS = { open: 'مفتوح', in_progress: 'قيد المعالجة', waiting: 'بانتظار', closed: 'مغلق' };

    // Customer View Shipment Status (Arabic labels)
    var TRACKING_STATUS_LABELS = {
        booking_confirmed: 'تم تأكيد الحجز',
        container_allocation: 'تخصيص الحاوية',
        loading_in_progress: 'التحميل قيد التنفيذ',
        vessel_departed: 'السفينة غادرت',
        in_transit: 'في الطريق',
        customs_clearance: 'التخليص الجمركي',
        ready_for_delivery: 'جاهز للتسليم',
        delivered: 'تم التسليم'
    };

    // Predefined templates for Send Update to Client (placeholders: {{BL}}, {{CLIENT}}, {{STATUS}}, {{ROUTE}})
    var UPDATE_TEMPLATES = {
        booking_confirmed: 'السيد/ة {{CLIENT}}، تم تأكيد حجز شحنتكم رقم {{BL}} (المسار: {{ROUTE}}). الحالة: تم تأكيد الحجز. Amazon Marine',
        container_allocation: 'السيد/ة {{CLIENT}}، تم تخصيص الحاوية للشحنة {{BL}}. المسار: {{ROUTE}}. سنبلغكم بمواعيد التحميل. Amazon Marine',
        loading_in_progress: 'السيد/ة {{CLIENT}}، شحنتكم {{BL}} قيد التحميل حالياً في الميناء. المسار: {{ROUTE}}. Amazon Marine',
        vessel_departed: 'السيد/ة {{CLIENT}}، السفينة الحاملة لشحنتكم {{BL}} قد غادرت الميناء. المسار: {{ROUTE}}. سنحدثكم عند الوصول. Amazon Marine',
        in_transit: 'السيد/ة {{CLIENT}}، شحنتكم {{BL}} في الطريق إلى الوجهة. المسار: {{ROUTE}}. الحالة: في الطريق. Amazon Marine',
        customs_clearance: 'السيد/ة {{CLIENT}}، شحنتكم {{BL}} قيد التخليص الجمركي. المسار: {{ROUTE}}. سنعلمكم عند الانتهاء. Amazon Marine',
        ready_for_delivery: 'السيد/ة {{CLIENT}}، شحنتكم {{BL}} جاهزة للتسليم. المسار: {{ROUTE}}. يرجى التنسيق لاستلامها. Amazon Marine',
        delivered: 'السيد/ة {{CLIENT}}، تم تسليم شحنتكم {{BL}} بنجاح. المسار: {{ROUTE}}. شكراً لتعاملكم مع Amazon Marine.'
    };

    function getStoredUpdates() {
        try {
            var raw = localStorage.getItem(STORAGE_UPDATES);
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }
    function setStoredUpdates(obj) {
        try { localStorage.setItem(STORAGE_UPDATES, JSON.stringify(obj)); } catch (e) {}
    }

    function getStoredComms() {
        try {
            var raw = localStorage.getItem(STORAGE_COMMS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function setStoredComms(arr) {
        try { localStorage.setItem(STORAGE_COMMS, JSON.stringify(arr)); } catch (e) {}
    }

    function getCurrentAgent() {
        try {
            var c = typeof getRoleConfig === 'function' ? getRoleConfig() : null;
            return (c && c.user) ? c.user : 'سارة الدعم';
        } catch (e) { return 'سارة الدعم'; }
    }

    function applyTrackingFilters() {
        var searchBl = document.getElementById('trackingSearchBl');
        var searchClient = document.getElementById('trackingSearchClient');
        var filterStatus = document.getElementById('trackingFilterStatus');
        var rows = document.querySelectorAll('#trackingTableBody .tracking-row');
        var blQ = (searchBl && searchBl.value.trim()) ? searchBl.value.trim().toLowerCase() : '';
        var clientQ = (searchClient && searchClient.value.trim()) ? searchClient.value.trim().toLowerCase() : '';
        var statusVal = (filterStatus && filterStatus.value) ? filterStatus.value : '';
        rows.forEach(function (tr) {
            var bl = (tr.getAttribute('data-bl') || '').toLowerCase();
            var client = (tr.getAttribute('data-client') || '').toLowerCase();
            var status = tr.getAttribute('data-status') || '';
            var matchBl = !blQ || bl.indexOf(blQ) !== -1;
            var matchClient = !clientQ || client.indexOf(clientQ) !== -1;
            var matchStatus = !statusVal || status === statusVal;
            tr.style.display = (matchBl && matchClient && matchStatus) ? '' : 'none';
        });
    }

    function openAddUpdateModal(bl) {
        var blEl = document.getElementById('updateModalBl');
        var displayEl = document.getElementById('updateBlDisplay');
        if (blEl) blEl.value = bl || '';
        if (displayEl) {
            displayEl.value = bl || '';
            if (bl) { displayEl.setAttribute('readonly', 'readonly'); displayEl.removeAttribute('placeholder'); }
            else { displayEl.removeAttribute('readonly'); displayEl.placeholder = 'أدخل رقم BL'; }
        }
        document.getElementById('updateText').value = '';
        openModal('addShipmentUpdateModal');
    }

    function saveShipmentUpdate() {
        var bl = (document.getElementById('updateModalBl') && document.getElementById('updateModalBl').value) || '';
        if (!bl && document.getElementById('updateBlDisplay')) bl = (document.getElementById('updateBlDisplay').value || '').trim();
        var text = (document.getElementById('updateText') && document.getElementById('updateText').value) || '';
        if (!bl || !text.trim()) return;
        var updates = getStoredUpdates();
        if (!updates[bl]) updates[bl] = [];
        var now = new Date();
        updates[bl].push({ date: now.toISOString(), text: text.trim(), agent: getCurrentAgent() });
        setStoredUpdates(updates);
        var row = document.querySelector('.tracking-row[data-bl="' + bl + '"]');
        if (row) {
            var cell = row.querySelector('.last-update-cell');
            if (cell) {
                var d = now.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit' });
                cell.textContent = d + ' — ' + text.trim();
            }
        }
        closeModal('addShipmentUpdateModal');
    }

    function openSendUpdateModal(bl, client, route, status) {
        document.getElementById('sendUpdateBl').value = bl || '';
        document.getElementById('sendUpdateClient').value = client || '';
        var routeEl = document.getElementById('sendUpdateRoute');
        if (routeEl) routeEl.value = route || '';
        document.getElementById('sendUpdateStatus').value = status || '';
        document.getElementById('sendUpdateBlDisplay').value = bl || '';
        document.getElementById('sendUpdateClientDisplay').value = client || '';
        var templateSelect = document.getElementById('sendUpdateTemplate');
        if (templateSelect) {
            templateSelect.value = status || '';
            fillMessageFromTemplate(templateSelect.value, bl, client, route, status);
        }
        openModal('sendUpdateToClientModal');
    }

    function fillMessageFromTemplate(templateKey, bl, client, route, status) {
        var msgEl = document.getElementById('sendUpdateMessage');
        if (!msgEl) return;
        var statusLabel = TRACKING_STATUS_LABELS[status] || status || '';
        var t = UPDATE_TEMPLATES[templateKey];
        if (t) {
            msgEl.value = t.replace(/\{\{BL\}\}/g, bl || '').replace(/\{\{CLIENT\}\}/g, client || '').replace(/\{\{STATUS\}\}/g, statusLabel).replace(/\{\{ROUTE\}\}/g, route || '');
        } else {
            msgEl.value = '';
        }
    }

    function sendUpdateToClient() {
        var bl = document.getElementById('sendUpdateBl') && document.getElementById('sendUpdateBl').value;
        var client = document.getElementById('sendUpdateClient') && document.getElementById('sendUpdateClient').value;
        var channelRadios = document.querySelectorAll('input[name="sendUpdateChannel"]:checked');
        var channel = (channelRadios.length && channelRadios[0].value) ? channelRadios[0].value : 'email';
        var message = document.getElementById('sendUpdateMessage') && document.getElementById('sendUpdateMessage').value;
        if (!message || !message.trim()) return;
        closeModal('sendUpdateToClientModal');
        var channelName = channel === 'whatsapp' ? 'واتساب' : 'البريد الإلكتروني';
        var msg = 'تم إرسال التحديث إلى ' + (client || 'العميل') + ' عبر ' + channelName + '. (محاكاة)';
        if (typeof notify === 'function') notify(msg, 'success');
        else if (typeof showNotification === 'function') showNotification(msg, 'success');
        else try { console.log('[CS]', msg); } catch (e) {}
    }

    function getTickets() {
        try {
            var raw = localStorage.getItem(STORAGE_TICKETS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }
    function setTickets(list) {
        try { localStorage.setItem(STORAGE_TICKETS, JSON.stringify(list)); } catch (e) {}
    }
    function nextTicketId() {
        var n = parseInt(localStorage.getItem('amazonMarineTicketSeq') || '1000', 10);
        localStorage.setItem('amazonMarineTicketSeq', String(n + 1));
        var y = new Date().getFullYear();
        return TICKET_ID_PREFIX + y + '-' + n;
    }

    function seedTicketsIfEmpty() {
        if (getTickets().length > 0) return;
        var list = [
            { id: 'TKT-2026-1042', client: 'منصور وشركاه', shipment: 'BL-2026-0248', type: 'request', priority: 'high', assignedTo: 'cs', status: 'open', createdAt: '2026-02-24T10:30:00', description: 'تتبع شحنة' },
            { id: 'TKT-2026-1041', client: 'الإيمان للأغذية', shipment: '', type: 'complaint', priority: 'medium', assignedTo: 'operations', status: 'in_progress', createdAt: '2026-02-24T09:15:00', description: 'تأخر وصول' },
            { id: 'TKT-2026-1040', client: 'طه للمنسوجات', shipment: 'BL-2026-0245', type: 'inquiry', priority: 'low', assignedTo: 'accounting', status: 'closed', createdAt: '2026-02-23T14:00:00', description: 'استفسار فاتورة' }
        ];
        setTickets(list);
        localStorage.setItem('amazonMarineTicketSeq', '1043');
    }

    function renderTicketsTable() {
        seedTicketsIfEmpty();
        var tbody = document.getElementById('ticketsTableBodyCs');
        if (!tbody) return;
        var list = getTickets();
        tbody.innerHTML = '';
        list.forEach(function (t) {
            var tr = document.createElement('tr');
            tr.className = 'ticket-row-cs';
            tr.setAttribute('data-id', t.id);
            tr.setAttribute('data-type', t.type || 'inquiry');
            tr.setAttribute('data-status', t.status || 'open');
            tr.setAttribute('data-priority', t.priority || 'medium');
            tr.setAttribute('data-assigned', t.assignedTo || 'cs');
            tr.setAttribute('data-client', t.client || '');
            var typeLabel = TICKET_TYPE_LABELS[t.type] || t.type;
            var priorityLabel = TICKET_PRIORITY_LABELS[t.priority] || t.priority;
            var assignedLabel = TICKET_ASSIGNED_LABELS[t.assignedTo] || t.assignedTo;
            var statusLabel = TICKET_STATUS_LABELS[t.status] || t.status;
            var statusClass = t.status === 'closed' ? 'active' : t.status === 'in_progress' ? 'in-transit' : t.status === 'waiting' ? 'pending' : 'new';
            var dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
            tr.innerHTML =
                '<td class="fw-600">#' + (t.id || '') + '</td>' +
                '<td>' + (t.client || '—') + '</td>' +
                '<td>' + (t.shipment || '—') + '</td>' +
                '<td><span class="status-badge pending">' + typeLabel + '</span></td>' +
                '<td><span class="status-badge ' + (t.priority === 'high' ? 'unpaid' : t.priority === 'low' ? 'active' : 'pending') + '">' + priorityLabel + '</span></td>' +
                '<td>' + assignedLabel + '</td>' +
                '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                '<td class="text-muted fs-sm">' + dateStr + '</td>' +
                '<td><button type="button" class="btn btn-sm btn-outline btn-reply-ticket" data-id="' + (t.id || '') + '"><i class=\'bx bx-reply\'></i> رد</button> <button type="button" class="btn btn-sm btn-outline btn-close-ticket" data-id="' + (t.id || '') + '"' + (t.status === 'closed' ? ' disabled' : '') + '><i class=\'bx bx-check-circle\'></i> إغلاق</button></td>';
            tbody.appendChild(tr);
        });
        tbody.querySelectorAll('.btn-reply-ticket').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openReplyModal(this.getAttribute('data-id'));
            });
        });
        tbody.querySelectorAll('.btn-close-ticket').forEach(function (btn) {
            if (btn.disabled) return;
            btn.addEventListener('click', function () {
                closeTicketById(this.getAttribute('data-id'));
            });
        });
    }

    function openReplyModal(ticketId) {
        var list = getTickets();
        var t = list.filter(function (x) { return x.id === ticketId; })[0];
        if (!t) return;
        document.getElementById('replyTicketId').value = t.id || '';
        document.getElementById('replyTicketIdDisplay').value = '#' + (t.id || '');
        document.getElementById('replyTicketStatusDisplay').value = TICKET_STATUS_LABELS[t.status] || t.status;
        document.getElementById('replyTicketStatusSelect').value = t.status || 'open';
        document.getElementById('replyTicketText').value = '';
        document.getElementById('csReplyModalTitle').textContent = 'رد على التذكرة #' + (t.id || '');
        openModal('csReplyTicketModal');
    }

    function confirmReplyTicket() {
        var id = document.getElementById('replyTicketId') && document.getElementById('replyTicketId').value;
        var newStatus = document.getElementById('replyTicketStatusSelect') && document.getElementById('replyTicketStatusSelect').value;
        var replyText = document.getElementById('replyTicketText') && document.getElementById('replyTicketText').value;
        var list = getTickets();
        var idx = list.findIndex(function (x) { return x.id === id; });
        if (idx === -1) return;
        list[idx].status = newStatus || list[idx].status;
        if (replyText && replyText.trim()) list[idx].lastReply = { at: new Date().toISOString(), text: replyText.trim(), by: getCurrentAgent() };
        setTickets(list);
        closeModal('csReplyTicketModal');
        renderTicketsTable();
    }

    function closeTicketById(ticketId) {
        var list = getTickets();
        var idx = list.findIndex(function (x) { return x.id === ticketId; });
        if (idx === -1) return;
        list[idx].status = 'closed';
        list[idx].closedAt = new Date().toISOString();
        setTickets(list);
        renderTicketsTable();
    }

    function createTicket() {
        var client = document.getElementById('newTicketClient') && document.getElementById('newTicketClient').value;
        var shipment = document.getElementById('newTicketShipment') && document.getElementById('newTicketShipment').value;
        var type = document.getElementById('newTicketType') && document.getElementById('newTicketType').value;
        var priority = document.getElementById('newTicketPriority') && document.getElementById('newTicketPriority').value;
        var assignedTo = document.getElementById('newTicketAssigned') && document.getElementById('newTicketAssigned').value;
        var description = document.getElementById('newTicketDesc') && document.getElementById('newTicketDesc').value;
        if (!client || !client.trim()) return;
        var ticket = {
            id: nextTicketId(),
            client: client.trim(),
            shipment: (shipment && shipment.trim()) || '',
            type: type || 'inquiry',
            priority: priority || 'medium',
            assignedTo: assignedTo || 'cs',
            status: 'open',
            createdAt: new Date().toISOString(),
            description: (description && description.trim()) || ''
        };
        var list = getTickets();
        list.unshift(ticket);
        setTickets(list);
        closeModal('csNewTicketModal');
        document.getElementById('newTicketClient').value = '';
        document.getElementById('newTicketShipment').value = '';
        document.getElementById('newTicketDesc').value = '';
        renderTicketsTable();
    }

    function applyTicketFilters() {
        var search = document.getElementById('ticketSearchCs');
        var typeFilter = document.getElementById('filterTicketType');
        var assignedFilter = document.getElementById('filterTicketAssigned');
        var statusFilter = document.getElementById('filterTicketStatusCs');
        var priorityFilter = document.getElementById('filterTicketPriorityCs');
        var rows = document.querySelectorAll('#ticketsTableBodyCs .ticket-row-cs');
        var q = (search && search.value.trim()) ? search.value.trim().toLowerCase() : '';
        var typeVal = (typeFilter && typeFilter.value) || '';
        var assignedVal = (assignedFilter && assignedFilter.value) || '';
        var statusVal = (statusFilter && statusFilter.value) || '';
        var priorityVal = (priorityFilter && priorityFilter.value) || '';
        rows.forEach(function (tr) {
            var text = (tr.textContent || '').toLowerCase();
            var type = tr.getAttribute('data-type') || '';
            var assigned = tr.getAttribute('data-assigned') || '';
            var status = tr.getAttribute('data-status') || '';
            var priority = tr.getAttribute('data-priority') || '';
            var matchSearch = !q || text.indexOf(q) !== -1;
            var matchType = !typeVal || type === typeVal;
            var matchAssigned = !assignedVal || assigned === assignedVal;
            var matchStatus = !statusVal || status === statusVal;
            var matchPriority = !priorityVal || priority === priorityVal;
            tr.style.display = (matchSearch && matchType && matchAssigned && matchStatus && matchPriority) ? '' : 'none';
        });
    }

    function applyCommsFilters() {
        var search = document.getElementById('commsSearch');
        var typeFilter = document.getElementById('commsFilterType');
        var relatedFilter = document.getElementById('commsFilterRelated');
        var rows = document.querySelectorAll('#commsTableBody .comms-row');
        var q = (search && search.value.trim()) ? search.value.trim().toLowerCase() : '';
        var typeVal = (typeFilter && typeFilter.value) || '';
        var relatedVal = (relatedFilter && relatedFilter.value) || '';
        rows.forEach(function (tr) {
            var text = (tr.textContent || '').toLowerCase();
            var type = tr.getAttribute('data-type') || '';
            var related = tr.getAttribute('data-related') || '';
            var matchSearch = !q || text.indexOf(q) !== -1;
            var matchType = !typeVal || type === typeVal;
            var matchRelated = !relatedVal || related === relatedVal;
            tr.style.display = (matchSearch && matchType && matchRelated) ? '' : 'none';
        });
    }

    function renderCommsFromStorage() {
        var tbody = document.getElementById('commsTableBody');
        if (!tbody) return;
        var list = getStoredComms();
        var agent = getCurrentAgent();
        list.forEach(function (entry) {
            var tr = document.createElement('tr');
            tr.className = 'comms-row';
            tr.setAttribute('data-type', entry.type || 'ملاحظة');
            tr.setAttribute('data-related', entry.related || 'عميل');
            tr.setAttribute('data-client', entry.ref || '');
            var icon = entry.type === 'مكالمة' ? 'bx-phone' : entry.type === 'بريد إلكتروني' ? 'bx-envelope' : entry.type === 'اجتماع' ? 'bx-group' : 'bx-note';
            var dateStr = entry.date ? new Date(entry.date).toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
            var relatedLabel = (entry.ref || '—') + ' (' + (entry.related || 'عميل') + ')';
            tr.innerHTML = '<td class="text-muted fs-sm">' + dateStr + '</td><td><i class=\'bx ' + icon + '\'></i> ' + (entry.type || 'ملاحظة') + '</td><td>' + relatedLabel + '</td><td>' + (entry.subject || '—') + '</td><td>' + (entry.agent || agent) + '</td>';
            tbody.appendChild(tr);
        });
    }

    function saveCommsLog() {
        var type = (document.getElementById('commsLogType') && document.getElementById('commsLogType').value) || 'ملاحظة';
        var related = (document.getElementById('commsLogRelated') && document.getElementById('commsLogRelated').value) || 'عميل';
        var ref = (document.getElementById('commsLogRef') && document.getElementById('commsLogRef').value) || '';
        var subject = (document.getElementById('commsLogSubject') && document.getElementById('commsLogSubject').value) || '';
        var notes = (document.getElementById('commsLogNotes') && document.getElementById('commsLogNotes').value) || '';
        if (!subject.trim()) subject = notes.trim() || '—';
        var list = getStoredComms();
        list.unshift({
            date: new Date().toISOString(),
            type: type,
            related: related,
            ref: ref,
            subject: subject,
            notes: notes,
            agent: getCurrentAgent()
        });
        setStoredComms(list);
        var tbody = document.getElementById('commsTableBody');
        if (tbody) {
            var tr = document.createElement('tr');
            tr.className = 'comms-row';
            tr.setAttribute('data-type', type);
            tr.setAttribute('data-related', related);
            tr.setAttribute('data-client', ref);
            var icon = type === 'مكالمة' ? 'bx-phone' : type === 'بريد إلكتروني' ? 'bx-envelope' : type === 'اجتماع' ? 'bx-group' : 'bx-note';
            var dateStr = new Date().toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            tr.innerHTML = '<td class="text-muted fs-sm">' + dateStr + '</td><td><i class=\'bx ' + icon + '\'></i> ' + type + '</td><td>' + ref + ' (' + related + ')</td><td>' + subject + '</td><td>' + getCurrentAgent() + '</td>';
            tbody.insertBefore(tr, tbody.firstChild);
        }
        closeModal('addCommsLogModal');
    }

    function init() {
        if (typeof switchTab !== 'function') {
            window.switchTab = function (grp, tab) {
                document.querySelectorAll('[data-tab-group="' + grp + '"] .tab').forEach(function (t) {
                    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
                });
                document.querySelectorAll('.tab-content').forEach(function (c) {
                    c.classList.toggle('active', c.id === grp + '-' + tab);
                });
            };
        }

        var trackingSearchBl = document.getElementById('trackingSearchBl');
        var trackingSearchClient = document.getElementById('trackingSearchClient');
        var trackingFilterStatus = document.getElementById('trackingFilterStatus');
        if (trackingSearchBl) trackingSearchBl.addEventListener('input', applyTrackingFilters);
        if (trackingSearchClient) trackingSearchClient.addEventListener('input', applyTrackingFilters);
        if (trackingFilterStatus) trackingFilterStatus.addEventListener('change', applyTrackingFilters);

        document.querySelectorAll('.btn-add-update').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openAddUpdateModal(this.getAttribute('data-bl'));
            });
        });
        document.querySelectorAll('.btn-send-update').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openSendUpdateModal(
                    this.getAttribute('data-bl'),
                    this.getAttribute('data-client'),
                    this.getAttribute('data-route'),
                    this.getAttribute('data-status')
                );
            });
        });
        var templateSelect = document.getElementById('sendUpdateTemplate');
        if (templateSelect) {
            templateSelect.addEventListener('change', function () {
                var bl = document.getElementById('sendUpdateBl') && document.getElementById('sendUpdateBl').value;
                var client = document.getElementById('sendUpdateClient') && document.getElementById('sendUpdateClient').value;
                var route = document.getElementById('sendUpdateRoute') && document.getElementById('sendUpdateRoute').value;
                fillMessageFromTemplate(this.value, bl, client, route, this.value);
            });
        }
        var btnSendUpdateToClient = document.getElementById('btnSendUpdateToClient');
        if (btnSendUpdateToClient) btnSendUpdateToClient.addEventListener('click', sendUpdateToClient);
        var btnAddShipmentUpdate = document.getElementById('btnAddShipmentUpdate');
        if (btnAddShipmentUpdate) btnAddShipmentUpdate.addEventListener('click', function () { openAddUpdateModal(''); });
        var btnSaveUpdate = document.getElementById('btnSaveUpdate');
        if (btnSaveUpdate) btnSaveUpdate.addEventListener('click', saveShipmentUpdate);

        renderTicketsTable();

        var btnNewTicketCs = document.getElementById('btnNewTicketCs');
        if (btnNewTicketCs) btnNewTicketCs.addEventListener('click', function () { openModal('csNewTicketModal'); });
        var btnCreateTicketCs = document.getElementById('btnCreateTicketCs');
        if (btnCreateTicketCs) btnCreateTicketCs.addEventListener('click', createTicket);

        var btnReplyTicketCs = document.getElementById('btnReplyTicketCs');
        if (btnReplyTicketCs) btnReplyTicketCs.addEventListener('click', confirmReplyTicket);
        var btnCloseTicketCs = document.getElementById('btnCloseTicketCs');
        if (btnCloseTicketCs) btnCloseTicketCs.addEventListener('click', function () {
            var id = document.getElementById('replyTicketId') && document.getElementById('replyTicketId').value;
            if (id) { closeTicketById(id); closeModal('csReplyTicketModal'); }
        });

        var ticketSearchCs = document.getElementById('ticketSearchCs');
        var filterTicketType = document.getElementById('filterTicketType');
        var filterTicketAssigned = document.getElementById('filterTicketAssigned');
        var filterTicketStatusCs = document.getElementById('filterTicketStatusCs');
        var filterTicketPriorityCs = document.getElementById('filterTicketPriorityCs');
        if (ticketSearchCs) ticketSearchCs.addEventListener('input', applyTicketFilters);
        if (filterTicketType) filterTicketType.addEventListener('change', applyTicketFilters);
        if (filterTicketAssigned) filterTicketAssigned.addEventListener('change', applyTicketFilters);
        if (filterTicketStatusCs) filterTicketStatusCs.addEventListener('change', applyTicketFilters);
        if (filterTicketPriorityCs) filterTicketPriorityCs.addEventListener('change', applyTicketFilters);

        renderCommsFromStorage();
        var commsSearch = document.getElementById('commsSearch');
        var commsFilterType = document.getElementById('commsFilterType');
        var commsFilterRelated = document.getElementById('commsFilterRelated');
        if (commsSearch) commsSearch.addEventListener('input', applyCommsFilters);
        if (commsFilterType) commsFilterType.addEventListener('change', applyCommsFilters);
        if (commsFilterRelated) commsFilterRelated.addEventListener('change', applyCommsFilters);

        var btnAddCommsLog = document.getElementById('btnAddCommsLog');
        if (btnAddCommsLog) btnAddCommsLog.addEventListener('click', function () {
            document.getElementById('commsLogSubject').value = '';
            document.getElementById('commsLogNotes').value = '';
            openModal('addCommsLogModal');
        });
        var btnSaveCommsLog = document.getElementById('btnSaveCommsLog');
        if (btnSaveCommsLog) btnSaveCommsLog.addEventListener('click', saveCommsLog);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
