var DESTINATIONS = {
    'القاهرة الكبرى': ['القاهرة', 'مدينة نصر', 'جسر السويس', 'التجمع', 'حلوان', 'مايو 15', 'العاصمة الإدارية', 'مسطرد', 'أبو النمرس', 'المريوطية'],
    'الجيزة': ['الجيزة', 'أكتوبر', 'أبو رواش', 'المناشي'],
    'القليوبية': ['قليوب', 'بنها', 'قها', 'طوخ'],
    'الشرقية': ['بلبيس', 'العاشر من رمضان', 'العبور', 'أبو كبير', 'الصالحية', 'التل الصالحية', 'ديرب نجم'],
    'المنوفية': ['شبين الكوم', 'قويسنا', 'السادات'],
    'الغربية': ['طنطا', 'المحلة', 'كفر الزيات'],
    'الدقهلية': ['المنصورة', 'جمصة', 'المنزلة', 'دكرنس', 'منية النصر'],
    'البحيرة': ['دمنهور', 'كفر الدوار', 'إيتاي البارود', 'كوم حمادة', 'أبو المطامير', 'وادي النطرون', 'النوبارية', 'مركز بدر'],
    'كفر الشيخ': ['كفر الشيخ', 'بلطيم'],
    'الإسكندرية': ['الإسكندرية', 'العامرية', 'برج العرب'],
    'دمياط': ['دمياط', 'دمياط الجديدة'],
    'بورسعيد': ['بورسعيد'],
    'الإسماعيلية': ['الإسماعيلية', 'القصاصين', 'أبو سلطان', 'الملاك'],
    'السويس': ['السويس', 'العين السخنة'],
    'الفيوم': ['الفيوم', 'كوم أوشيم'],
    'بني سويف': ['بني سويف'],
    'المنيا': ['المنيا'],
    'أسيوط': ['أسيوط'],
    'سوهاج': ['سوهاج'],
    'قنا': ['قنا'],
    'الأقصر': ['الأقصر'],
    'أسوان': ['أسوان', 'توشكى'],
    'البحر الأحمر': ['الغردقة', 'مرسى علم'],
    'مطروح والساحل': ['مرسى مطروح', 'العلمين', 'سيوة'],
    'الوادي الجديد والصحراء': ['الداخلة', 'الخارجة', 'الفرافرة', 'الواحات البحرية', 'شرق العوينات']
};

var INLAND_PORTS = [
    { value: 'Alex', label: 'الإسكندرية (Alexandria)' },
    { value: 'PortSaidWest', label: 'بورسعيد غرب (Port Said West)' },
    { value: 'PortSaidEast', label: 'بورسعيد شرق (Port Said East)' },
    { value: 'Damietta', label: 'دمياط (Damietta)' },
    { value: 'Sokhna', label: 'السخنة (Ain Sokhna)' }
];

(function () {

    // ── Constants ──────────────────────────────────────────────────────────────

    var REGIONS_PODS = {
        'البحر الأحمر': ['جدة', 'بور سودان', 'عقبة', 'الحديدة'],
        'البحر المتوسط': ['بورسعيد', 'دمياط', 'إسطنبول', 'مرسيليا', 'جنوة', 'برشلونة'],
        'الخليج': ['دبي', 'جبل علي', 'ميناء الملك عبدالله', 'صلالة', 'الدوحة'],
        'أوروبا': ['هامبورغ', 'روتردام', 'أنتويرب', 'لو هافر'],
        'أمريكا الشمالية': ['نيويورك', 'لوس أنجلوس', 'هيوستن']
    };

    var POL_OPTIONS = [
        { value: 'Alex', label: 'الإسكندرية (Alex)' },
        { value: 'Sokhna', label: 'السخنة (Sokhna)' },
        { value: 'Damietta', label: 'دمياط (Damietta)' },
        { value: 'PortSaidWest', label: 'بورسعيد (West)' }
    ];

    var SHIPPING_LINES = ['MSC', 'CMA CGM', 'Maersk', 'Hapag-Lloyd', 'COSCO', 'HPL', 'Evergreen', 'ONE',
        'Wan Hai', 'Sea Glory', 'ESL', 'Sidra'];

    // Price keys for sea freight
    var SEA_PRICE_KEYS = ['of20', 'of40', 'thc20', 'thc40', 'of40rf', 'thcRf', 'powerDay', 'pti'];
    // Price keys for inland
    var INLAND_PRICE_KEYS = ['p20x1', 'p20x2', 'p40hq', 'p40rf', 'generator'];

    function notify(msg, type) {
        if (typeof showNotification === 'function') { showNotification(msg, type || 'info'); return; }
        console.log('[PS]', msg);
    }

    // ── Storage ────────────────────────────────────────────────────────────────

    function storeKey(type, region, pod) {
        return 'ps3_' + (type || 'sea').replace(/\s/g, '_') + '|' +
            (region || '').replace(/\s/g, '_') + '|' +
            (pod || '').replace(/\s/g, '_');
    }

    function loadOffers(type, region, pod) {
        try { var r = localStorage.getItem(storeKey(type, region, pod)); return r ? JSON.parse(r) : []; }
        catch (e) { return []; }
    }

    function saveOffers(type, region, pod, offers) {
        try { localStorage.setItem(storeKey(type, region, pod), JSON.stringify(offers)); } catch (e) { }
    }

    function nextId() {
        var n = parseInt(localStorage.getItem('ps3NextId') || '1', 10);
        localStorage.setItem('ps3NextId', String(n + 1));
        return 'PS-' + String(n).padStart(3, '0');
    }

    // ── Price helpers ──────────────────────────────────────────────────────────

    var FX = { USD: 1, EUR: 1.08, EGP: 0.02 }; // rough rates to USD

    function fmt(price, currency) {
        if (price == null || price === '' || isNaN(parseFloat(price))) return '—';
        var sym = currency === 'EUR' ? '€' : currency === 'EGP' ? 'E£' : '$';
        return sym + ' ' + parseFloat(price).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function seaTotalUSD(offer) {
        var p = offer.pricing || {};
        var total = 0;
        SEA_PRICE_KEYS.forEach(function (k) {
            var item = p[k];
            if (item && item.price != null && !isNaN(item.price))
                total += item.price * (FX[item.currency] || 1);
        });
        return total;
    }

    // ── State ──────────────────────────────────────────────────────────────────

    var state = { pricingType: 'sea', region: '', pod: '', offers: [] };

    // ── UI helpers ─────────────────────────────────────────────────────────────

    function getEl(id) { return document.getElementById(id); }

    function showOffersPanel(show) {
        var card = getEl('offersCard');
        var first = getEl('selectFirstCard');
        if (card) card.style.display = show ? 'block' : 'none';
        if (first) first.style.display = show ? 'none' : 'block';
    }

    function setSubtitle(region, pod) {
        var el = getEl('offersSubtitle');
        if (el) el.textContent = (region || '—') + ' / ' + (pod || '—');
    }

    function canEdit() {
        try {
            var role = (typeof getCurrentRole === 'function' ? getCurrentRole() : null)
                || localStorage.getItem('amazonMarineRole') || '';
            return role === 'admin' || role === 'pricing';
        } catch (e) { return false; }
    }

    // ── Sailing date pickers ───────────────────────────────────────────────────

    function addSailingDateRow(container, value) {
        var wrap = document.createElement('div');
        wrap.className = 'sailing-date-row';
        wrap.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:4px 8px';
        var inp = document.createElement('input');
        inp.type = 'date'; inp.className = 'form-control form-control-sm sailing-date-inp';
        inp.style.cssText = 'border:none;background:transparent;padding:0;width:130px';
        if (value) inp.value = value;
        var del = document.createElement('button');
        del.type = 'button'; del.innerHTML = '<i class="bx bx-x"></i>';
        del.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0 2px;line-height:1';
        del.onclick = function () { wrap.remove(); };
        wrap.appendChild(inp); wrap.appendChild(del);
        container.appendChild(wrap);
    }

    function getSailingDates() {
        var dates = [];
        document.querySelectorAll('.sailing-date-inp').forEach(function (inp) {
            if (inp.value) dates.push(inp.value);
        });
        return dates;
    }

    function renderSailingDates(dates) {
        var c = getEl('sailingDatesContainer');
        if (!c) return;
        c.innerHTML = '';
        (dates || []).forEach(function (d) { addSailingDateRow(c, d); });
    }

    // ── Render (Cards) ─────────────────────────────────────────────────────────

    function renderCards(offers) {
        state.offers = offers || [];
        var container = getEl('offersContainer');
        var empty = getEl('offersEmpty');
        if (!container) return;

        var filtered = state.offers.slice();
        var q = ((getEl('offersSearch') || {}).value || '').trim().toLowerCase();
        if (q) filtered = filtered.filter(function (o) {
            return JSON.stringify(o).toLowerCase().indexOf(q) !== -1;
        });

        container.innerHTML = '';
        if (empty) empty.style.display = filtered.length ? 'none' : 'block';

        var edit = canEdit();
        filtered.forEach(function (o) {
            var card = document.createElement('div');
            card.className = 'offer-card';
            card.setAttribute('data-id', o.id || '');

            if (state.pricingType === 'sea') {
                var p = o.pricing || {};
                var of20s = (p.of20 && p.of20.price != null) ? fmt(p.of20.price, p.of20.currency) : '—';
                var of40s = (p.of40 && p.of40.price != null) ? fmt(p.of40.price, p.of40.currency) : '—';
                var of40rfs = (p.of40rf && p.of40rf.price != null) ? fmt(p.of40rf.price, p.of40rf.currency) : null;

                var total = seaTotalUSD(o);
                var totalStr = total > 0 ? '$ ' + total.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' USD' : '—';

                // Sailing dates display
                var sailDates = (o.sailingDates && o.sailingDates.length)
                    ? o.sailingDates.map(function (d) {
                        try { return new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' }); }
                        catch (e) { return d; }
                    }).join(' ، ')
                    : '—';

                var lineLabel = (o.shippingLine || '—') + (o.dnd ? ' / ' + o.dnd : '');

                card.innerHTML =
                    '<div class="offer-card-header">' +
                    '<div class="offer-card-line">' +
                    '<span class="shipping-line-badge">' + (o.shippingLine || '—') + '</span>' +
                    (o.dnd ? '<span class="fs-xs text-muted" style="margin-right:6px">' + o.dnd + '</span>' : '') +
                    '<span class="offer-card-route">' + (o.pol || '—') + ' → ' + (o.pod || o.region || '—') + '</span>' +
                    '</div>' +
                    '<div class="offer-card-meta">' +
                    '<span><i class="bx bx-time"></i> ' + (o.transitTime || '—') + '</span>' +
                    '<span><i class="bx bx-calendar"></i> ' + sailDates + '</span>' +
                    '</div></div>' +
                    '<div class="offer-card-prices">' +
                    '<div class="price-chip"><span class="price-chip-label">OF 20\'DC</span><span class="price-chip-value">' + of20s + '</span></div>' +
                    '<div class="price-chip"><span class="price-chip-label">OF 40\'HQ</span><span class="price-chip-value">' + of40s + '</span></div>' +
                    (of40rfs ? '<div class="price-chip price-chip-reefer"><span class="price-chip-label">OF 40\'RF</span><span class="price-chip-value">' + of40rfs + '</span></div>' : '') +
                    '</div>' +
                    '<div class="offer-card-footer">' +
                    '<span class="offer-total-label">الإجمالي (تقريبي):</span>' +
                    '<span class="offer-total-value">' + totalStr + '</span>' +
                    '<div class="offer-card-actions">' +
                    '<button type="button" class="btn btn-sm btn-primary btn-view-offer" data-id="' + (o.id || '') + '"><i class="bx bx-show"></i> التفاصيل</button>' +
                    (edit ? '<button type="button" class="btn btn-sm btn-outline btn-edit-offer" data-id="' + (o.id || '') + '"><i class="bx bx-edit"></i></button>' : '') +
                    '</div></div>';

            } else {
                // Inland card
                var p2 = o.pricing || {};
                var p20x1s = (p2.p20x1 && p2.p20x1.price != null) ? fmt(p2.p20x1.price, p2.p20x1.currency) : '—';
                var p40hqs = (p2.p40hq && p2.p40hq.price != null) ? fmt(p2.p40hq.price, p2.p40hq.currency) : '—';
                var p40rfs2 = (p2.p40rf && p2.p40rf.price != null) ? fmt(p2.p40rf.price, p2.p40rf.currency) : '—';

                card.innerHTML =
                    '<div class="offer-card-header">' +
                    '<div class="offer-card-line">' +
                    '<span class="shipping-line-badge inland-badge"><i class="bx bx-trip"></i> نقل داخلي</span>' +
                    '<span class="offer-card-route">' + (o.inlandPort || '—') + ' → ' + (o.destination || '—') + '</span>' +
                    '</div>' +
                    (o.validTo ? '<div class="offer-card-meta"><span class="badge-validity"><i class="bx bx-calendar-check"></i> حتى ' + o.validTo + '</span></div>' : '') +
                    '</div>' +
                    '<div class="offer-card-prices">' +
                    '<div class="price-chip"><span class="price-chip-label">1×20DC</span><span class="price-chip-value">' + p20x1s + '</span></div>' +
                    '<div class="price-chip"><span class="price-chip-label">40HQ</span><span class="price-chip-value">' + p40hqs + '</span></div>' +
                    '<div class="price-chip price-chip-reefer"><span class="price-chip-label">40RF</span><span class="price-chip-value">' + p40rfs2 + '</span></div>' +
                    '</div>' +
                    '<div class="offer-card-footer">' +
                    '<span class="offer-total-label">' + (o.notes || '') + '</span>' +
                    '<div class="offer-card-actions">' +
                    '<button type="button" class="btn btn-sm btn-primary btn-view-offer" data-id="' + (o.id || '') + '"><i class="bx bx-show"></i> التفاصيل</button>' +
                    (edit ? '<button type="button" class="btn btn-sm btn-outline btn-edit-offer" data-id="' + (o.id || '') + '"><i class="bx bx-edit"></i></button>' : '') +
                    '</div></div>';
            }

            card.querySelector('.btn-view-offer').addEventListener('click', function (e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                var offer = state.offers.filter(function (o) { return o.id === id; })[0];
                if (offer) openOfferDetail(offer);
            });
            var editBtn = card.querySelector('.btn-edit-offer');
            if (editBtn) editBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openEditOffer(this.getAttribute('data-id'));
            });

            container.appendChild(card);
        });
    }

    // ── Detail Modal ───────────────────────────────────────────────────────────

    function openOfferDetail(offer) {
        var body = getEl('offerDetailBody');
        if (!body) return;

        var html = '';
        if (state.pricingType === 'sea') {
            var p = offer.pricing || {};
            var sailDatesHtml = '';
            if (offer.sailingDates && offer.sailingDates.length) {
                sailDatesHtml = offer.sailingDates.map(function (d) {
                    try {
                        return '<span class="badge" style="background:rgba(34,211,238,.12);color:var(--accent-cyan);border-radius:6px;padding:2px 8px;font-size:.8rem">' +
                            new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + '</span>';
                    }
                    catch (e) { return d; }
                }).join(' ');
            } else { sailDatesHtml = '—'; }

            html =
                '<div class="detail-header-grid">' +
                '<div><span class="detail-label">SHIPPING LINE</span><span class="detail-value fw-700">' + (offer.shippingLine || '—') + '</span></div>' +
                '<div><span class="detail-label">D&D / Free Days</span><span class="detail-value">' + (offer.dnd || '—') + '</span></div>' +
                '<div><span class="detail-label">POL</span><span class="detail-value">' + (offer.pol || '—') + '</span></div>' +
                '<div><span class="detail-label">POD</span><span class="detail-value">' + (offer.pod || offer.region || '—') + '</span></div>' +
                '<div><span class="detail-label">T.T</span><span class="detail-value">' + (offer.transitTime || '—') + '</span></div>' +
                '</div>' +
                '<div class="form-group" style="margin-top:12px"><span class="detail-label">VESSELS / مواعيد الإبحار</span>' +
                '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + sailDatesHtml + '</div></div>' +
                '<h4 class="detail-section-title" style="margin-top:16px"><i class="bx bx-dollar-circle"></i> OF / THC</h4>' +
                '<div class="detail-pricing-grid">' +
                buildPDI('OF 20\'DC', p.of20) +
                buildPDI('OF 40\'HQ', p.of40) +
                buildPDI('THC 20\'DC', p.thc20) +
                buildPDI('THC 40\'HQ', p.thc40) +
                buildPDI('OF 40\'RF (Reefer)', p.of40rf, true) +
                buildPDI('THC 40\'RF', p.thcRf, true) +
                buildPDI('Power/day (Reefer)', p.powerDay, true) +
                buildPDI('PTI (Reefer)', p.pti, true) +
                '</div>' +
                (offer.otherCharges ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,.04);border-radius:8px;font-size:.88rem"><strong>Other Charges:</strong> ' + offer.otherCharges + '</div>' : '') +
                '<div class="detail-total-bar">' +
                '<span>الإجمالي (تقريبي USD):</span>' +
                '<span class="detail-total-amount">$ ' + seaTotalUSD(offer).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' USD</span>' +
                '</div>';
        } else {
            var p2 = offer.pricing || {};
            html =
                '<div class="detail-header-grid">' +
                '<div><span class="detail-label">الميناء</span><span class="detail-value fw-700">' + (offer.inlandPort || '—') + '</span></div>' +
                '<div><span class="detail-label">الوجهة (From)</span><span class="detail-value">' + (offer.destination || '—') + '</span></div>' +
                '<div><span class="detail-label">سريان إلى</span><span class="detail-value">' + (offer.validTo || '—') + '</span></div>' +
                '<div><span class="detail-label">ملاحظات</span><span class="detail-value">' + (offer.notes || '—') + '</span></div>' +
                '</div>' +
                '<h4 class="detail-section-title"><i class="bx bx-dollar-circle"></i> أسعار النقل</h4>' +
                '<div class="detail-pricing-grid">' +
                buildPDI('1×20\'DC', p2.p20x1) +
                buildPDI('2×20\'DC', p2.p20x2) +
                buildPDI('40\'HQ', p2.p40hq) +
                buildPDI('40\'RF (Reefer)', p2.p40rf, true) +
                buildPDI('مولد (Generator)', p2.generator, true) +
                '</div>';
        }

        body.innerHTML = html;

        var btnEdit = getEl('btnEditFromDetail');
        if (btnEdit) {
            btnEdit.style.display = canEdit() ? '' : 'none';
            btnEdit.onclick = function () { closeModal('offerDetailModal'); openEditOffer(offer.id); };
        }
        var btnQ = getEl('btnCreateQuotation');
        if (btnQ) btnQ.onclick = function () {
            try { localStorage.setItem('amazonMarineSelectedOfferForQuotation', JSON.stringify(offer)); } catch (e) { }
            closeModal('offerDetailModal');
            notify('تم اختيار العرض لعرض سعر للعميل.', 'success');
        };

        openModal('offerDetailModal');
    }

    function buildPDI(label, item, isOptional) {
        if (!item || item.price == null || isNaN(item.price)) {
            if (isOptional) return '';
            return '<div class="detail-price-item"><span class="detail-price-label">' + label + '</span><span class="detail-price-value muted">—</span></div>';
        }
        return '<div class="detail-price-item">' +
            '<span class="detail-price-label">' + label + '</span>' +
            '<span class="detail-price-value">' + fmt(item.price, item.currency) +
            ' <span class="currency-tag">' + (item.currency || 'USD') + '</span></span></div>';
    }

    // ── Region → POD Cascading ─────────────────────────────────────────────────

    function updatePODOptions(region, selectId) {
        var sel = getEl(selectId || 'filterPOD');
        if (!sel) return;
        var pods = REGIONS_PODS[region] || [];
        sel.innerHTML = '<option value="">— اختر الميناء —</option>';
        pods.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p; opt.textContent = p;
            sel.appendChild(opt);
        });
    }

    // ── Load / Search ──────────────────────────────────────────────────────────

    function loadOffersByFilter() {
        var region = (getEl('filterRegion') || {}).value || '';
        var pod = (getEl('filterPOD') || {}).value || '';
        if (!region || !pod) { notify('الرجاء اختيار المنطقة والميناء', 'warning'); return; }
        state.region = region; state.pod = pod;
        showOffersPanel(true); setSubtitle(region, pod);
        var offers = loadOffers(state.pricingType, region, pod);
        offers.forEach(function (o) { o.region = region; o.pod = pod; });
        renderCards(offers);
    }

    function loadAllOffers() {
        var allOffers = [];
        var prefix = 'ps3_' + state.pricingType + '|';
        try {
            var keys = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(prefix) === 0) keys.push(k);
            }
            keys.forEach(function (k) {
                var rest = k.replace(prefix, '');
                var parts = rest.split('|');
                var region = (parts[0] || '').replace(/_/g, ' ');
                var pod = (parts[1] || '').replace(/_/g, ' ');
                var offers = loadOffers(state.pricingType, region, pod);
                offers.forEach(function (o) { o.region = o.region || region; o.pod = o.pod || pod; });
                allOffers = allOffers.concat(offers);
            });
        } catch (e) { }

        var seen = {};
        allOffers = allOffers.filter(function (o) {
            if (!o.id || seen[o.id]) return false;
            seen[o.id] = true; return true;
        });
        allOffers.sort(function (a, b) {
            var ra = (a.region || '') + (a.pod || '') + (a.shippingLine || a.inlandPort || '');
            var rb = (b.region || '') + (b.pod || '') + (b.shippingLine || b.inlandPort || '');
            return ra.localeCompare(rb, 'ar');
        });

        state.region = ''; state.pod = '';
        showOffersPanel(true);
        setSubtitle('كل المناطق', 'كل الموانئ');
        renderCards(allOffers);
    }

    function clearFilters() {
        ['filterRegion', 'filterPOD', 'searchByPOD'].forEach(function (id) {
            var el = getEl(id); if (el) el.value = '';
        });
        state.region = ''; state.pod = '';
        loadAllOffers();
    }

    // ── Add / Edit Modal ───────────────────────────────────────────────────────

    function syncModalTypeFields() {
        var isSea = state.pricingType === 'sea';
        var seaFld = getEl('seaFields');
        var inFld = getEl('inlandFields');
        if (seaFld) seaFld.style.display = isSea ? '' : 'none';
        if (inFld) inFld.style.display = isSea ? 'none' : '';
    }

    function openAddOffer() {
        var region = (getEl('filterRegion') || {}).value || state.region || '';
        var pod = (getEl('filterPOD') || {}).value || state.pod || '';
        if (region) state.region = region;
        if (pod) state.pod = pod;

        getEl('offerModalTitle').textContent = 'إضافة تسعير جديد';
        resetOfferForm();

        if (state.pricingType === 'sea') {
            var mR = getEl('offerRegion');
            if (mR && region) {
                mR.value = region;
                mR.dispatchEvent(new Event('change'));
                setTimeout(function () {
                    var mP = getEl('offerPOD');
                    if (mP && pod) mP.value = pod;
                }, 60);
            }
        } else {
            var mIR = getEl('offerInlandRegion');
            if (mIR && region) mIR.value = region;
        }

        syncModalTypeFields();
        openModal('offerModal');
    }

    function openEditOffer(id) {
        var offer = (loadOffers(state.pricingType, state.region, state.pod) || [])
            .filter(function (o) { return o.id === id; })[0];
        if (!offer) {
            // Try scanning all
            offer = state.offers.filter(function (o) { return o.id === id; })[0];
        }
        if (!offer) return;

        getEl('offerModalTitle').textContent = 'تعديل التسعير';
        resetOfferForm();
        fillOfferForm(offer);
        syncModalTypeFields();
        openModal('offerModal');
    }

    function resetOfferForm() {
        ['offerId', 'offerShippingLine', 'offerPOL', 'offerDnD', 'offerTransitTime',
            'offerInlandPort', 'offerInlandRegion', 'offerValidTo', 'offerNotes',
            'offerRegion', 'offerPOD', 'offerInlandRegion', 'offerOtherCharges'].forEach(function (id) {
                var el = getEl(id); if (el) el.value = '';
            });
        var sc = getEl('sailingDatesContainer');
        if (sc) sc.innerHTML = '';
        document.querySelectorAll('.offer-price-input').forEach(function (inp) { inp.value = ''; });
        document.querySelectorAll('.offer-currency-select').forEach(function (sel) { sel.value = 'USD'; });
    }

    function fillOfferForm(offer) {
        var set = function (id, val) { var el = getEl(id); if (el && val != null) el.value = val; };
        set('offerId', offer.id);
        set('offerShippingLine', offer.shippingLine);
        set('offerPOL', offer.pol);
        set('offerDnD', offer.dnd);
        set('offerTransitTime', offer.transitTime);
        set('offerOtherCharges', offer.otherCharges);
        set('offerValidTo', offer.validTo);
        // Inland port & destination (both are <select> elements)
        var ipSel = getEl('offerInlandPort');
        if (ipSel && offer.inlandPort) ipSel.value = offer.inlandPort;
        var destSel = getEl('offerDestination');
        if (destSel && offer.destination) destSel.value = offer.destination;
        set('offerNotes', offer.notes);

        // Sailing dates
        if (offer.sailingDates && offer.sailingDates.length) {
            renderSailingDates(offer.sailingDates);
        }

        // Region/POD
        if (offer.pricingType === 'sea' || state.pricingType === 'sea') {
            var mR = getEl('offerRegion');
            if (mR && offer.region) {
                mR.value = offer.region;
                mR.dispatchEvent(new Event('change'));
                setTimeout(function () { set('offerPOD', offer.pod); }, 60);
            }
        } else {
            set('offerInlandRegion', offer.region);
        }

        // Pricing fields
        var p = offer.pricing || {};
        Object.keys(p).forEach(function (key) {
            var item = p[key]; if (!item) return;
            var priceEl = document.querySelector('.offer-price-input[data-item="' + key + '"]');
            var currEl = document.querySelector('.offer-currency-select[data-item="' + key + '"]');
            if (priceEl && item.price != null) priceEl.value = item.price;
            if (currEl && item.currency) currEl.value = item.currency;
        });
    }

    function getPricingFromForm(keys) {
        var pricing = {};
        keys.forEach(function (key) {
            var priceEl = document.querySelector('.offer-price-input[data-item="' + key + '"]');
            var currEl = document.querySelector('.offer-currency-select[data-item="' + key + '"]');
            var price = priceEl && priceEl.value !== '' ? parseFloat(priceEl.value) : null;
            var cur = currEl ? currEl.value : 'USD';
            pricing[key] = (price != null && !isNaN(price)) ? { price: price, currency: cur } : null;
        });
        return pricing;
    }

    function saveOffer() {
        var isSea = state.pricingType === 'sea';
        var region, pod;

        if (isSea) {
            region = (getEl('offerRegion') || {}).value || state.region || (getEl('filterRegion') || {}).value || '';
            pod = (getEl('offerPOD') || {}).value || state.pod || (getEl('filterPOD') || {}).value || '';
        } else {
            region = (getEl('offerInlandRegion') || {}).value || state.region || '';
            pod = (getEl('offerInlandPort') || {}).value || state.pod || '';
        }

        if (!region || !pod) {
            notify('الرجاء اختيار المنطقة و' + (isSea ? 'ميناء التفريغ' : 'الميناء'), 'warning');
            return;
        }

        var id = (getEl('offerId') || {}).value || '';
        var offer = { id: id || nextId(), region: region, pod: pod, pricingType: state.pricingType };

        if (isSea) {
            offer.shippingLine = (getEl('offerShippingLine') || {}).value || '';
            offer.pol = (getEl('offerPOL') || {}).value || '';
            offer.dnd = (getEl('offerDnD') || {}).value || '';
            offer.transitTime = (getEl('offerTransitTime') || {}).value || '';
            offer.otherCharges = (getEl('offerOtherCharges') || {}).value || '';
            offer.validTo = (getEl('offerValidTo') || {}).value || '';
            offer.sailingDates = getSailingDates();
            if (!offer.shippingLine) { notify('الخط الملاحي مطلوب', 'warning'); return; }
            if (!offer.pol) { notify('ميناء التحميل (POL) مطلوب', 'warning'); return; }
            offer.pricing = getPricingFromForm(SEA_PRICE_KEYS);
        } else {
            offer.inlandPort = (getEl('offerInlandPort') || {}).value || '';
            offer.destination = (getEl('offerDestination') || {}).value || '';
            offer.validTo = (getEl('offerValidTo') || {}).value || '';
            offer.notes = (getEl('offerNotes') || {}).value || '';
            if (!offer.inlandPort || !offer.destination) {
                notify('الميناء والوجهة مطلوبان', 'warning'); return;
            }
            offer.pricing = getPricingFromForm(INLAND_PRICE_KEYS);
        }

        var offers = loadOffers(state.pricingType, region, pod);
        if (id) {
            offers = offers.map(function (o) { return o.id === id ? offer : o; });
        } else {
            offers.push(offer);
        }
        saveOffers(state.pricingType, region, pod, offers);
        closeModal('offerModal');
        notify(id ? 'تم التحديث' : 'تم الحفظ بنجاح', 'success');
        loadAllOffers();
    }

    // ── Pricing Type Toggle ────────────────────────────────────────────────────

    function switchPricingType(type) {
        state.pricingType = type;
        ['btnTypeTab_sea', 'btnTypeTab_inland'].forEach(function (id) {
            var el = getEl(id);
            if (el) el.classList.toggle('active', id === 'btnTypeTab_' + type);
        });
        ['filterRegion', 'filterPOD', 'searchByPOD'].forEach(function (id) {
            var el = getEl(id); if (el) el.value = '';
        });
        state.region = ''; state.pod = '';
        var badge = getEl('pricingTypeBadge');
        if (badge) badge.textContent = type === 'sea' ? '🚢 خطوط ملاحية' : '🚛 نقل داخلي';

        if (type === 'inland') {
            var podSel = getEl('filterPOD');
            if (podSel) {
                podSel.innerHTML = '<option value="">— اختر الميناء —</option>';
                INLAND_PORTS.forEach(function (p) {
                    var opt = document.createElement('option');
                    opt.value = p; opt.textContent = p;
                    podSel.appendChild(opt);
                });
            }
        } else {
            // Restore full cascading for sea
            var podSelS = getEl('filterPOD');
            if (podSelS) podSelS.innerHTML = '<option value="">— اختر الميناء —</option>';
        }
        loadAllOffers();
    }

    // ── Populate selects ───────────────────────────────────────────────────────

    function populateShippingLineSelect() {
        var sel = getEl('offerShippingLine');
        if (!sel) return;
        sel.innerHTML = '<option value="">— اختر الخط —</option>';
        SHIPPING_LINES.forEach(function (l) {
            var opt = document.createElement('option');
            opt.value = l; opt.textContent = l; sel.appendChild(opt);
        });
    }

    function populatePOLSelect() {
        var sel = getEl('offerPOL');
        if (!sel) return;
        sel.innerHTML = '<option value="">— اختر POL —</option>';
        POL_OPTIONS.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.value; opt.textContent = p.label; sel.appendChild(opt);
        });
    }

    function populateInlandModalSelects() {
        var portSel = getEl('offerInlandPort');
        if (portSel) {
            portSel.innerHTML = '<option value="">— اختر الميناء —</option>';
            INLAND_PORTS.forEach(function (p) {
                var opt = document.createElement('option');
                opt.value = p.value; opt.textContent = p.label; portSel.appendChild(opt);
            });
        }

        var qcGovSel = getEl('qc-inland-gov');
        if (qcGovSel) {
            qcGovSel.innerHTML = '<option value="">— اختر المحافظة —</option>';
            Object.keys(DESTINATIONS).forEach(function (gov) {
                var opt = document.createElement('option');
                opt.value = gov; opt.textContent = gov;
                qcGovSel.appendChild(opt);
            });
        }
    }

    function populateModalRegionSelects() {
        // Sea modal region → POD
        var seaR = getEl('offerRegion');
        if (seaR) {
            seaR.innerHTML = '<option value="">— اختر المنطقة —</option>';
            Object.keys(REGIONS_PODS).forEach(function (r) {
                var opt = document.createElement('option');
                opt.value = r; opt.textContent = r; seaR.appendChild(opt);
            });
            seaR.addEventListener('change', function () {
                var podSel = getEl('offerPOD');
                if (!podSel) return;
                var pods = REGIONS_PODS[this.value] || [];
                podSel.innerHTML = '<option value="">— اختر الميناء —</option>';
                pods.forEach(function (p) {
                    var opt = document.createElement('option');
                    opt.value = p; opt.textContent = p; podSel.appendChild(opt);
                });
            });
        }
        var podInit = getEl('offerPOD');
        if (podInit) podInit.innerHTML = '<option value="">— اختر المنطقة أولاً —</option>';

        // Inland modal region
        var inR = getEl('offerInlandRegion');
        if (inR) {
            inR.innerHTML = '<option value="">— اختر المنطقة —</option>';
            INLAND_PORTS.forEach(function (p) {
                var opt = document.createElement('option');
                opt.value = p; opt.textContent = p; inR.appendChild(opt);
            });
        }
    }

    // ── Demo seed data (real data from spreadsheet) ────────────────────────────

    function maybeSeedDemo() {
        // Clear old ps2_ keys
        var oldKeys = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && (k.indexOf('ps2_') === 0)) oldKeys.push(k);
        }
        oldKeys.forEach(function (k) { localStorage.removeItem(k); });

        var key = storeKey('sea', 'البحر الأحمر', 'جدة');
        if (localStorage.getItem(key)) return; // already seeded

        // Real data: Jeddah dry + reefer
        var jeddahOffers = [
            // ── DRY: Jeddah ──
            {
                id: 'PS-R01', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'MSC', pol: 'Sokhna', dnd: '7det', transitTime: '5 days',
                sailingDates: ['2026-03-14', '2026-03-21'],
                otherCharges: 'BL: 10$',
                pricing: {
                    of20: { price: 70, currency: 'USD' }, of40: { price: 103, currency: 'USD' },
                    thc20: { price: 160, currency: 'USD' }, thc40: { price: 240, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-002', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'CMA CGM', pol: 'Alex', dnd: '7d&d', transitTime: '3 days',
                sailingDates: ['2026-03-05', '2026-03-10', '2026-03-15', '2026-03-27', '2026-03-29'],
                otherCharges: 'BL: 35$',
                pricing: {
                    of20: { price: 225, currency: 'USD' }, of40: { price: 275, currency: 'USD' },
                    thc20: { price: 200, currency: 'USD' }, thc40: { price: 275, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-003', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'CMA CGM', pol: 'Sokhna', dnd: '7d&d', transitTime: '5-6 days',
                sailingDates: ['2026-03-01', '2026-03-10', '2026-03-18'],
                otherCharges: 'BL: 35$',
                pricing: {
                    of20: { price: 400, currency: 'USD' }, of40: { price: 400, currency: 'USD' },
                    thc20: { price: 195, currency: 'USD' }, thc40: { price: 270, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-004', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'HPL', pol: 'PortSudan', dnd: '', transitTime: '3-6 days',
                sailingDates: ['2026-03-01'],
                otherCharges: 'BL: 35$',
                pricing: {
                    of20: { price: 345, currency: 'USD' }, of40: { price: 390, currency: 'USD' },
                    thc20: { price: 170, currency: 'USD' }, thc40: { price: 220, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-005', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Sea Glory', pol: 'Alex', dnd: '14 days', transitTime: '12-14 days',
                sailingDates: ['2026-03-08', '2026-03-18', '2026-03-21'],
                otherCharges: 'Tlx: 300 LE',
                pricing: {
                    of20: { price: 70, currency: 'USD' }, of40: { price: 80, currency: 'USD' },
                    thc20: { price: 6435, currency: 'EGP' }, thc40: { price: 9410, currency: 'EGP' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-006', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Sea Glory', pol: 'Sokhna', dnd: '14 days', transitTime: '4 days',
                sailingDates: ['2026-03-06', '2026-03-11', '2026-03-29'],
                otherCharges: 'Tlx: 20$',
                pricing: {
                    of20: { price: 80, currency: 'USD' }, of40: { price: 100, currency: 'USD' },
                    thc20: { price: 174, currency: 'USD' }, thc40: { price: 273, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-007', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'ESL', pol: 'Alex', dnd: '14 Days', transitTime: '9 days',
                sailingDates: ['2026-03-04', '2026-03-21', '2026-03-25'],
                otherCharges: 'BL: 13$, Tlx: 20$',
                pricing: {
                    of20: { price: 170, currency: 'USD' }, of40: { price: 140, currency: 'USD' },
                    thc20: { price: 4150, currency: 'EGP' }, thc40: { price: 7200, currency: 'EGP' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-008', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'ESL', pol: 'Sokhna', dnd: '14 Days', transitTime: '2 days',
                sailingDates: ['2026-03-14', '2026-03-18'],
                otherCharges: 'BL: 13$, Tlx: 20$',
                pricing: {
                    of20: { price: 150, currency: 'USD' }, of40: { price: 200, currency: 'USD' },
                    thc20: { price: 172, currency: 'USD' }, thc40: { price: 242, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-009', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Sidra', pol: 'Alex', dnd: '14 days', transitTime: '4 days',
                sailingDates: ['2026-03-05'],
                otherCharges: 'BL: 30$, Seal: 15$, Telex: 20$',
                pricing: {
                    of20: { price: 120, currency: 'USD' }, of40: { price: 140, currency: 'USD' },
                    thc20: { price: 150, currency: 'USD' }, thc40: { price: 195, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            {
                id: 'PS-010', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Sidra', pol: 'Sokhna', dnd: '14 days', transitTime: '3 days',
                sailingDates: ['2026-03-03', '2026-03-06', '2026-03-13', '2026-03-16', '2026-03-20', '2026-03-27'],
                otherCharges: 'BL: 30$',
                pricing: {
                    of20: { price: 100, currency: 'USD' }, of40: { price: 130, currency: 'USD' },
                    thc20: { price: 195, currency: 'USD' }, thc40: { price: 290, currency: 'USD' },
                    of40rf: null, thcRf: null, powerDay: null, pti: null
                }
            },
            // ── REEFER: Jeddah ──
            {
                id: 'PS-R01', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Wan Hai', pol: 'Sokhna', dnd: '10 days', transitTime: '3 Days',
                sailingDates: ['2026-03-10'],
                otherCharges: 'Doc: 20$, Tlx: 10$, W.R: 80$',
                pricing: {
                    of20: null, of40: null, thc20: null, thc40: null,
                    of40rf: { price: 850, currency: 'USD' }, thcRf: { price: 295, currency: 'USD' },
                    powerDay: { price: 19, currency: 'USD' }, pti: { price: 60, currency: 'USD' }
                }
            },
            {
                id: 'PS-R02', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Maersk', pol: 'PortSudan', dnd: '7det', transitTime: '2-4 days',
                sailingDates: ['2026-03-07', '2026-03-12', '2026-03-19', '2026-03-22', '2026-03-26'],
                otherCharges: 'BL: 10$, 3 days free then 25$/day',
                pricing: {
                    of20: null, of40: null, thc20: null, thc40: null,
                    of40rf: { price: 675, currency: 'USD' }, thcRf: { price: 310, currency: 'USD' },
                    powerDay: null, pti: null
                }
            },
            {
                id: 'PS-R03', region: 'البحر الأحمر', pod: 'جدة', pricingType: 'sea',
                shippingLine: 'Maersk', pol: 'Sokhna', dnd: '7det', transitTime: '5 days',
                sailingDates: ['2026-03-07', '2026-03-14', '2026-03-21', '2026-03-28'],
                otherCharges: 'BL: 10$, 3 days free then 25$/day',
                pricing: {
                    of20: null, of40: null, thc20: null, thc40: null,
                    of40rf: { price: 890, currency: 'USD' }, thcRf: { price: 310, currency: 'USD' },
                    powerDay: null, pti: null
                }
            }
        ];

        saveOffers('sea', 'البحر الأحمر', 'جدة', jeddahOffers);

        var inlandDemoOffers = [
            { port: 'Alex', gov: 'القاهرة الكبرى', city: 'القاهرة', basePrice: 8500 },
            { port: 'Sokhna', gov: 'القاهرة الكبرى', city: 'التجمع', basePrice: 4000 },
            { port: 'Damietta', gov: 'القاهرة الكبرى', city: 'مدينة نصر', basePrice: 6000 },
            { port: 'PortSaidWest', gov: 'الشرقية', city: 'العاشر من رمضان', basePrice: 5000 },
            { port: 'Alex', gov: 'الإسكندرية', city: 'العامرية', basePrice: 3500 },
            { port: 'Sokhna', gov: 'السويس', city: 'العين السخنة', basePrice: 2500 },
            { port: 'Alex', gov: 'الجيزة', city: 'أكتوبر', basePrice: 9000 },
            { port: 'Alex', gov: 'القليوبية', city: 'قليوب', basePrice: 7500 },
            { port: 'Damietta', gov: 'الغربية', city: 'طنطا', basePrice: 5000 },
            { port: 'Sokhna', gov: 'الشرقية', city: 'العاشر من رمضان', basePrice: 6500 },
            { port: 'Alex', gov: 'كفر الشيخ', city: 'بلطيم', basePrice: 7000 },
            { port: 'PortSaidEast', gov: 'الإسماعيلية', city: 'الإسماعيلية', basePrice: 3500 },
            { port: 'Alex', gov: 'مطروح والساحل', city: 'العلمين', basePrice: 12000 }
        ];

        inlandDemoOffers.forEach(function (d, idx) {
            var iKey = storeKey('inland', d.gov, d.port);
            if (!localStorage.getItem(iKey)) {
                var newOffer = {
                    id: 'PI-' + (1001 + idx), region: d.gov, pod: d.port, pricingType: 'inland',
                    inlandPort: d.port, inlandGov: d.gov, inlandCity: d.city,
                    destination: d.gov + ' - ' + d.city, validTo: '2026-12-31', notes: 'تحديث اسعار النقل ' + d.gov,
                    pricing: {
                        t20d: { price: d.basePrice, currency: 'EGP' },
                        t20dx2: { price: d.basePrice + 1200, currency: 'EGP' },
                        t40d: { price: d.basePrice + 1500, currency: 'EGP' },
                        t40hq: { price: d.basePrice + 1500, currency: 'EGP' },
                        t20r: { price: d.basePrice + 4000, currency: 'EGP' },
                        t40r: { price: d.basePrice + 5500, currency: 'EGP' }
                    }
                };
                var existing = loadOffers('inland', d.gov, d.port) || [];
                existing.push(newOffer);
                saveOffers('inland', d.gov, d.port, existing);
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────────────────────

    function init() {
        maybeSeedDemo();
        populateShippingLineSelect();
        populatePOLSelect();
        populateInlandModalSelects();
        populateModalRegionSelects();
        populateQuoteGovs();
        populateQuotePODs();

        // Populate main filter region
        var regionSel = getEl('filterRegion');
        if (regionSel) {
            regionSel.innerHTML = '<option value="">— اختر المنطقة —</option>';
            Object.keys(REGIONS_PODS).forEach(function (r) {
                var opt = document.createElement('option');
                opt.value = r; opt.textContent = r; regionSel.appendChild(opt);
            });
            regionSel.addEventListener('change', function () {
                updatePODOptions(this.value, 'filterPOD');
                var p = getEl('filterPOD'); if (p) p.value = '';
            });
        }

        // Add sailing date button
        var btnAddDate = getEl('btnAddSailingDate');
        if (btnAddDate) btnAddDate.addEventListener('click', function () {
            var c = getEl('sailingDatesContainer');
            if (c) addSailingDateRow(c, '');
        });

        // Show add button
        var addBtn = getEl('btnAddOffer');
        if (addBtn) addBtn.style.display = '';

        // Wire buttons
        var btnLoad = getEl('btnLoadOffers');
        var btnClear = getEl('btnClearFilters');
        var btnSave = getEl('btnSaveOffer');
        var btnSearch = getEl('btnSearchByPOD');
        var btnAdd = getEl('btnAddOffer');

        if (btnLoad) btnLoad.addEventListener('click', loadOffersByFilter);
        if (btnClear) btnClear.addEventListener('click', clearFilters);
        if (btnSave) btnSave.addEventListener('click', saveOffer);
        if (btnAdd) btnAdd.addEventListener('click', openAddOffer);
        if (btnSearch) btnSearch.addEventListener('click', function () {
            var q = ((getEl('searchByPOD') || {}).value || '').trim();
            if (!q) { notify('أدخل اسم الميناء', 'warning'); return; }
            var results = [];
            var prefix = 'ps3_' + state.pricingType + '|';
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (!k || k.indexOf(prefix) !== 0) continue;
                var rest = k.replace(prefix, '');
                var parts = rest.split('|');
                var reg = (parts[0] || '').replace(/_/g, ' ');
                var pod = (parts[1] || '').replace(/_/g, ' ');
                if (pod.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
                    var ofrs = loadOffers(state.pricingType, reg, pod);
                    ofrs.forEach(function (o) { o.region = o.region || reg; o.pod = o.pod || pod; });
                    results = results.concat(ofrs);
                }
            }
            if (!results.length) notify('لا توجد عروض للميناء: ' + q, 'warning');
            state.region = ''; state.pod = q;
            showOffersPanel(true); setSubtitle('نتائج البحث', q);
            renderCards(results);
        });

        var searchInput = getEl('searchByPOD');
        if (searchInput) searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') getEl('btnSearchByPOD') && getEl('btnSearchByPOD').click();
        });

        var offersSearch = getEl('offersSearch');
        if (offersSearch) offersSearch.addEventListener('input', function () { renderCards(state.offers); });

        var btnSea = getEl('btnTypeTab_sea');
        var btnInland = getEl('btnTypeTab_inland');
        if (btnSea) btnSea.addEventListener('click', function () { switchPricingType('sea'); });
        if (btnInland) btnInland.addEventListener('click', function () { switchPricingType('inland'); });

        // Auto-load all
        loadAllOffers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.psPriceSwitchType = switchPricingType;
    window.openAddOfferGlobal = openAddOffer;

    function populateQuoteGovs() {
        var sel = document.getElementById('qc-inland-gov');
        if (!sel || !DESTINATIONS) return;
        sel.innerHTML = '<option value="">— اختر المحافظة —</option>';
        Object.keys(DESTINATIONS).sort().forEach(function (g) {
            var opt = document.createElement('option');
            opt.value = g; opt.textContent = g;
            sel.appendChild(opt);
        });
    }

    function populateQuotePODs() {
        var sel = document.getElementById('qc-pod');
        if (!sel) return;
        sel.innerHTML = '<option value="">اختر الميناء (POD)</option>';
        var allPods = [];
        Object.keys(REGIONS_PODS).forEach(function (r) {
            REGIONS_PODS[r].forEach(function (p) { if (!allPods.includes(p)) allPods.push(p); });
        });
        allPods.sort().forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p; opt.textContent = p; sel.appendChild(opt);
        });
    }

    window.updateQuoteInlandCities = function () {
        var govSel = document.getElementById('qc-inland-gov');
        var citySel = document.getElementById('qc-inland-city');
        if (!govSel || !citySel) return;
        var gov = govSel.value;
        citySel.innerHTML = '<option value="">— اختر مكان التحميل —</option>';
        if (gov && DESTINATIONS && DESTINATIONS[gov]) {
            DESTINATIONS[gov].forEach(function (city) {
                var opt = document.createElement('option');
                opt.value = city; opt.textContent = city;
                citySel.appendChild(opt);
            });
        }
        window.updateQuoteIndications();
    };

    window.getCostIndication = function (type, region, pod, filters) {
        var key = storeKey(type, region, pod);
        var raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            var offers = JSON.parse(raw);
            if (!offers || !offers.length) return null;
            var match = offers.find(function (o) {
                if (type === 'sea') {
                    if (filters.line && o.shippingLine !== filters.line) return false;
                    if (filters.pol && o.pol !== filters.pol) return false;
                    return true;
                } else {
                    if (filters.inlandGov && o.inlandGov !== filters.inlandGov) return false;
                    if (filters.inlandCity && o.inlandCity !== filters.inlandCity) return false;
                    return true;
                }
            });
            return match || null;
        } catch (e) { return null; }
    };

    window.updateQuoteIndications = function () {
        var pol = (document.getElementById('qc-pol') || {}).value;
        var pod = (document.getElementById('qc-pod') || {}).value;
        var line = (document.getElementById('qc-line') || {}).value;
        var container = (document.getElementById('qc-container') || {}).value;

        var gov = (document.getElementById('qc-inland-gov') || {}).value;
        var city = (document.getElementById('qc-inland-city') || {}).value;
        var port = pol || 'Alex';

        function fmt(p) {
            if (!p || p.price == null) return '';
            return p.price; // Just return number as text for the span
        }

        function toggleBtn(el, show) {
            if (!el) return;
            var btn = el.parentElement.querySelector('.btn-copy-cost');
            if (btn) btn.style.display = show ? 'inline-block' : 'none';
        }

        var indOf = document.getElementById('qc-ind-of');
        var indThc = document.getElementById('qc-ind-thc');
        var indPower = document.getElementById('qc-ind-power');
        var indPti = document.getElementById('qc-ind-pti');
        var indInland = document.getElementById('qc-ind-inland');
        var routeLbl = document.getElementById('qc-inland-route');

        if (indOf) { indOf.textContent = '—'; toggleBtn(indOf, false); }
        if (indThc) { indThc.textContent = '—'; toggleBtn(indThc, false); }
        if (indPower) { indPower.textContent = '—'; toggleBtn(indPower, false); }
        if (indPti) { indPti.textContent = '—'; toggleBtn(indPti, false); }
        if (indInland) { indInland.textContent = '—'; toggleBtn(indInland, false); }
        if (routeLbl) routeLbl.textContent = '';

        var region = '';
        if (pod) {
            Object.keys(REGIONS_PODS).forEach(function (r) {
                if (REGIONS_PODS[r].includes(pod)) region = r;
            });
        }

        if (region && pod) {
            var seaMatch = window.getCostIndication('sea', region, pod, { line: line, pol: pol });
            if (seaMatch && seaMatch.pricing) {
                var is20 = container.includes('20');
                var isReefer = container.includes('Reefer');
                var is40 = container.includes('40') && !container.includes('HQ');
                var is40HQ = container.includes('HQ');

                if (isReefer) {
                    if (indOf) { indOf.textContent = fmt(seaMatch.pricing.of40rf); if (indOf.textContent) toggleBtn(indOf, true); }
                    if (indThc) { indThc.textContent = fmt(seaMatch.pricing.thcRf); if (indThc.textContent) toggleBtn(indThc, true); }
                    if (indPower) { indPower.textContent = fmt(seaMatch.pricing.powerDay); if (indPower.textContent) toggleBtn(indPower, true); }
                    if (indPti) { indPti.textContent = fmt(seaMatch.pricing.pti); if (indPti.textContent) toggleBtn(indPti, true); }
                } else {
                    if (is20) {
                        if (indOf) { indOf.textContent = fmt(seaMatch.pricing.of20); if (indOf.textContent) toggleBtn(indOf, true); }
                        if (indThc) { indThc.textContent = fmt(seaMatch.pricing.thc20); if (indThc.textContent) toggleBtn(indThc, true); }
                    } else {
                        if (indOf) { indOf.textContent = fmt(seaMatch.pricing.of40); if (indOf.textContent) toggleBtn(indOf, true); }
                        if (indThc) { indThc.textContent = fmt(seaMatch.pricing.thc40); if (indThc.textContent) toggleBtn(indThc, true); }
                    }
                }
            }
        }

        if (gov && city) {
            if (routeLbl) routeLbl.textContent = gov + ' - ' + city;
            var searchPorts = POL_OPTIONS;
            if (pol) searchPorts = [{ value: pol }].concat(searchPorts);

            var inlandMatch = null;
            for (var i = 0; i < searchPorts.length; i++) {
                var m = window.getCostIndication('inland', gov, searchPorts[i].value, { inlandGov: gov, inlandCity: city });
                if (m) {
                    inlandMatch = m;
                    break;
                }
            }

            if (inlandMatch && inlandMatch.pricing && indInland) {
                var is20 = container.includes('20');
                var isReefer = container.includes('Reefer');
                var is40 = container.includes('40') && !container.includes('HQ');
                var is40HQ = container.includes('HQ');

                var k = '';
                if (isReefer) {
                    k = is20 ? 't20r' : 't40r';
                } else if (is40HQ) {
                    k = 't40hq';
                } else if (is40) {
                    k = 't40d';
                } else {
                    k = 't20d';
                }

                if (k && inlandMatch.pricing[k]) {
                    indInland.textContent = fmt(inlandMatch.pricing[k]);
                    if (indInland.textContent) toggleBtn(indInland, true);
                }
            }
        }
    };

})();
