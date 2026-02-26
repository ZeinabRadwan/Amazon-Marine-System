// ========================================
// AMAZON MARINE — Price Sheet Management
// ========================================
// CORE SYSTEM RULES:
// 1. Sales cannot modify prices (View Only).
// 2. Pricing Team manages all price updates (add/edit).
// 3. Multiple price offers per port allowed (different line, container type, or validity).
// 4. Total price visible in search results.
// 5. Full breakdown only inside offer details (detail modal).
// ========================================

(function () {
    function notify(msg, type) {
        if (typeof showNotification === 'function') {
            showNotification(msg, type || 'info');
            return;
        }
        try { console.log('[Price Sheets]', msg); } catch (e) {}
    }
    var CURRENCIES = ['USD', 'EUR', 'EGP'];
    var PRICE_ITEMS = ['oceanFreight', 'blFee', 'telexRelease', 'otherCharges'];
    var PRICE_LABELS = { oceanFreight: 'أوقيان فريت', blFee: 'رسم B/L', telexRelease: 'تليكس رليز', otherCharges: 'أخرى' };

    // In-memory store (key: region|pod; in production replace with API)
    function getStorageKey(region, pod) {
        return 'priceSheets_' + (region || '').replace(/\s/g, '_') + '|' + (pod || '').replace(/\s/g, '_');
    }

    function loadOffersFromStorage(region, pod) {
        try {
            var key = getStorageKey(region, pod);
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveOffersToStorage(region, pod, offers) {
        var key = getStorageKey(region, pod);
        localStorage.setItem(key, JSON.stringify(offers));
    }

    // Generate unique id for offer
    function nextId() {
        var n = parseInt(localStorage.getItem('priceSheetNextId') || '1', 10);
        localStorage.setItem('priceSheetNextId', String(n + 1));
        return 'PS-' + n;
    }

    // Get all offers from storage where POD matches search (for Sales POD name search)
    function getAllOffersByPODSearch(podQuery) {
        var q = (podQuery || '').trim().toLowerCase();
        if (!q) return [];
        var results = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (!key || key.indexOf('priceSheets_') !== 0) continue;
                var parts = key.replace('priceSheets_', '').split('|');
                var region = (parts[0] || '').replace(/_/g, ' ');
                var pod = (parts[1] || '').replace(/_/g, ' ');
                if (pod.toLowerCase().indexOf(q) !== -1) {
                    var offers = loadOffersFromStorage(region, pod);
                    offers.forEach(function (o) {
                        o.region = o.region || region;
                        o.pod = o.pod || pod;
                        results.push(o);
                    });
                }
            }
        } catch (e) {}
        return results;
    }

    // Total price in USD for display (simple fixed rates for demo)
    var RATES_TO_USD = { USD: 1, EUR: 1.08, EGP: 0.032 };
    function computeTotalPrice(offer) {
        var pricing = offer.pricing || {};
        var totalUSD = 0;
        var parts = [];
        PRICE_ITEMS.forEach(function (key) {
            var item = pricing[key];
            if (item && item.price != null && !isNaN(item.price)) {
                var rate = RATES_TO_USD[item.currency] || 1;
                totalUSD += item.price * rate;
                parts.push(formatPrice(item.price, item.currency));
            }
        });
        var displayText = totalUSD > 0 ? '$ ' + totalUSD.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' USD' : '—';
        if (parts.length > 1) {
            var multi = parts.join(' + ');
            if (multi.length < 40) displayText = multi + ' ≈ ' + displayText;
        }
        return { totalUSD: totalUSD, displayText: displayText };
    }

    var currentRegion = '';
    var currentPOD = '';
    var currentOffersList = [];
    var offerPendingAttachment = null;
    var STORAGE_KEY_QUOTATION = 'amazonMarineSelectedOfferForQuotation';
    var STORAGE_KEY_SHIPMENT_OFFERS = 'amazonMarineShipmentPriceOffers';

    function getSelectedRegion() {
        var el = document.getElementById('filterRegion');
        return el ? el.value.trim() : '';
    }

    function getSelectedPOD() {
        var el = document.getElementById('filterPOD');
        return el ? el.value.trim() : '';
        }

    function showOffersCard(show) {
        var card = document.getElementById('offersCard');
        var first = document.getElementById('selectFirstCard');
        if (card) card.style.display = show ? 'block' : 'none';
        if (first) first.style.display = show ? 'none' : 'block';
    }

    function setOffersSubtitle(region, pod) {
        var el = document.getElementById('offersSubtitle');
        if (el) el.textContent = (region || '—') + ' / ' + (pod || '—');
    }

    function formatPrice(value, currency) {
        if (value == null || value === '' || isNaN(parseFloat(value))) return '—';
        var sym = currency === 'EUR' ? '€' : currency === 'EGP' ? 'E£' : '$';
        return sym + ' ' + parseFloat(value).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function formatValidity(from, to) {
        if (!from && !to) return '—';
        return (from || '—') + ' → ' + (to || '—');
    }

    function renderOffersTable(offers) {
        currentOffersList = offers || [];
        var tbody = document.getElementById('offersTableBody');
        var empty = document.getElementById('offersEmpty');
        if (!tbody) return;

        var filtered = (offers || []).slice();
        var searchEl = document.getElementById('offersSearch');
        var lineEl = document.getElementById('filterLine');
        var typeEl = document.getElementById('filterContainerType');
        if (searchEl && searchEl.value.trim()) {
            var q = searchEl.value.trim().toLowerCase();
            filtered = filtered.filter(function (o) {
                return (o.shippingLine + ' ' + (o.containerType || '')).toLowerCase().indexOf(q) !== -1;
            });
        }
        if (lineEl && lineEl.value) {
            filtered = filtered.filter(function (o) { return o.shippingLine === lineEl.value; });
        }
        if (typeEl && typeEl.value) {
            filtered = filtered.filter(function (o) { return o.containerType === typeEl.value; });
        }

        tbody.innerHTML = '';
        if (empty) empty.style.display = filtered.length ? 'none' : 'block';

        var canEdit = false;
        try {
            var role = (typeof getCurrentRole === 'function' ? getCurrentRole() : null) || localStorage.getItem('amazonMarineRole') || '';
            canEdit = role === 'admin' || role === 'pricing';
        } catch (e) {}

        filtered.forEach(function (o) {
            var route = (o.region || '—') + ' → ' + (o.pod || '—');
            var transit = (o.transitTime != null && o.transitTime !== '') ? o.transitTime + ' يوم' : '—';
            var totalInfo = computeTotalPrice(o);

            var actions = '<button type="button" class="btn btn-sm btn-outline btn-view-offer" data-id="' + (o.id || '') + '" title="عرض التفاصيل"><i class=\'bx bx-show\'></i> عرض التفاصيل</button>';
            if (canEdit) {
                actions += ' <button type="button" class="btn btn-sm btn-outline btn-edit-offer" data-id="' + (o.id || '') + '" title="تعديل"><i class=\'bx bx-edit\'></i></button>';
            }

            var tr = document.createElement('tr');
            tr.setAttribute('data-offer-id', o.id || '');
            tr.classList.add('offer-row');
            tr.innerHTML =
                '<td class="fw-600">' + (o.shippingLine || '—') + '</td>' +
                '<td>' + (o.containerType || '—') + '</td>' +
                '<td>' + route + '</td>' +
                '<td>' + transit + '</td>' +
                '<td class="fw-700">' + totalInfo.displayText + '</td>' +
                '<td>' + actions + '</td>';
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-view-offer').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                var offer = currentOffersList.filter(function (o) { return o.id === id; })[0];
                if (offer) openOfferDetail(offer);
            });
        });
        tbody.querySelectorAll('.btn-edit-offer').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                var offer = currentOffersList.filter(function (o) { return o.id === id; })[0];
                if (offer) {
                    currentRegion = offer.region || '';
                    currentPOD = offer.pod || '';
                }
                openEditOffer(id);
            });
        });
    }

    function getPricingFromForm() {
        var pricing = {};
        PRICE_ITEMS.forEach(function (key) {
            var priceEl = document.querySelector('.price-item[data-item="' + key + '"]');
            var currEl = document.querySelector('.currency-item[data-item="' + key + '"]');
            var price = priceEl && priceEl.value !== '' ? parseFloat(priceEl.value) : null;
            var currency = currEl ? currEl.value : 'USD';
            pricing[key] = price != null && !isNaN(price) ? { price: price, currency: currency } : null;
        });
        return pricing;
    }

    function setPricingToForm(pricing) {
        PRICE_ITEMS.forEach(function (key) {
            var priceEl = document.querySelector('.price-item[data-item="' + key + '"]');
            var currEl = document.querySelector('.currency-item[data-item="' + key + '"]');
            var item = pricing && pricing[key];
            if (priceEl) priceEl.value = item && item.price != null ? item.price : '';
            if (currEl && item && item.currency) currEl.value = item.currency;
        });
    }

    function openAddOffer() {
        currentRegion = getSelectedRegion();
        currentPOD = getSelectedPOD();
        if (!currentRegion || !currentPOD) {
            notify('الرجاء اختيار المنطقة وميناء التفريغ أولاً', 'warning');
            return;
        }
        document.getElementById('offerModalTitle').textContent = 'إضافة عرض سعر';
        document.getElementById('offerId').value = '';
        document.getElementById('offerShippingLine').value = '';
        document.getElementById('offerContainerType').value = '';
        document.getElementById('offerTransitTime').value = '';
        document.getElementById('offerValidFrom').value = '';
        document.getElementById('offerValidTo').value = '';
        var sailingsEl = document.getElementById('offerSailings');
        var freeDaysEl = document.getElementById('offerFreeDays');
        if (sailingsEl) sailingsEl.value = '';
        if (freeDaysEl) freeDaysEl.value = '';
        setPricingToForm({});
        openModal('offerModal');
    }

    function openEditOffer(id) {
        var offers = loadOffersFromStorage(currentRegion, currentPOD);
        var offer = offers.filter(function (o) { return o.id === id; })[0];
        if (!offer) return;

        document.getElementById('offerModalTitle').textContent = 'تعديل عرض السعر';
        document.getElementById('offerId').value = offer.id || '';
        document.getElementById('offerShippingLine').value = offer.shippingLine || '';
        document.getElementById('offerContainerType').value = offer.containerType || '';
        document.getElementById('offerTransitTime').value = offer.transitTime != null ? offer.transitTime : '';
        document.getElementById('offerValidFrom').value = offer.validFrom || '';
        document.getElementById('offerValidTo').value = offer.validTo || '';
        var sailingsEl = document.getElementById('offerSailings');
        var freeDaysEl = document.getElementById('offerFreeDays');
        if (sailingsEl) sailingsEl.value = offer.sailings != null ? offer.sailings : '';
        if (freeDaysEl) freeDaysEl.value = offer.freeDays != null && offer.freeDays !== '' ? offer.freeDays : '';
        setPricingToForm(offer.pricing || {});
        openModal('offerModal');
    }

    function openOfferDetail(offer) {
        var body = document.getElementById('offerDetailBody');
        if (!body) return;
        var route = (offer.region || '—') + ' → ' + (offer.pod || '—');
        var transit = (offer.transitTime != null && offer.transitTime !== '') ? offer.transitTime + ' يوم' : '—';
        var sailings = (offer.sailings != null && offer.sailings !== '') ? offer.sailings : '—';
        var freeDays = (offer.freeDays != null && offer.freeDays !== '') ? offer.freeDays + ' يوم' : '—';
        var validity = formatValidity(offer.validFrom, offer.validTo);
        var totalInfo = computeTotalPrice(offer);

        var rows = '';
        PRICE_ITEMS.forEach(function (key) {
            var label = PRICE_LABELS[key] || key;
            var item = offer.pricing && offer.pricing[key];
            var priceStr = item ? formatPrice(item.price, item.currency) : '—';
            var currStr = item && item.currency ? item.currency : '—';
            rows += '<tr><td>' + label + '</td><td>' + priceStr + '</td><td>' + currStr + '</td></tr>';
        });

        body.innerHTML =
            '<div class="form-row" style="margin-bottom:12px;">' +
            '<div><strong>الخط الملاحي:</strong> ' + (offer.shippingLine || '—') + '</div>' +
            '<div><strong>نوع الحاوية:</strong> ' + (offer.containerType || '—') + '</div>' +
            '<div><strong>المسار (POL → POD):</strong> ' + route + '</div>' +
            '</div>' +
            '<h4 class="fs-sm fw-700" style="margin:20px 0 8px; padding-top:12px; border-top:1px solid var(--border);">البيانات التشغيلية (Operational Details)</h4>' +
            '<table class="data-table" style="margin-bottom:16px;"><tbody>' +
            '<tr><td class="text-muted" style="width:140px;">وقت العبور</td><td>' + transit + '</td></tr>' +
            '<tr><td class="text-muted">الإبحار (Sailings)</td><td>' + sailings + '</td></tr>' +
            '<tr><td class="text-muted">أيام مجانية (Free Days)</td><td>' + freeDays + '</td></tr>' +
            '<tr><td class="text-muted">فترة السريان</td><td>' + validity + '</td></tr>' +
            '</tbody></table>' +
            '<h4 class="fs-sm fw-700" style="margin:16px 0 8px;">تفاصيل الأسعار (Pricing Details)</h4>' +
            '<table class="data-table"><thead><tr><th>البند</th><th>المبلغ</th><th>العملة</th></tr></thead><tbody>' + rows + '</tbody></table>' +
            '<p style="margin-top:12px;"><strong>السعر الإجمالي (تقريبي USD):</strong> <span class="fw-700">' + totalInfo.displayText + '</span></p>' +
            '<p class="fs-xs text-muted" style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">المبيعات: عرض فقط — فريق التسعير والإدارة: تعديل كامل</p>';

        var detailModal = document.getElementById('offerDetailModal');
        if (detailModal) {
            var btnEdit = document.getElementById('btnEditFromDetail');
            if (btnEdit) {
                btnEdit.onclick = function () {
                    closeModal('offerDetailModal');
                    currentRegion = offer.region || '';
                    currentPOD = offer.pod || '';
                    openEditOffer(offer.id);
                };
            }
            var btnCreateQuotation = document.getElementById('btnCreateQuotation');
            if (btnCreateQuotation) {
                btnCreateQuotation.onclick = function () {
                    try {
                        localStorage.setItem(STORAGE_KEY_QUOTATION, JSON.stringify(offer));
                    } catch (e) {}
                    closeModal('offerDetailModal');
                    notify('تم اختيار العرض لاستخدامه في عرض سعر للعميل.', 'success');
                    var isPricingPage = (window.location.pathname || '').indexOf('pricing.html') !== -1 || (window.location.href || '').indexOf('pricing.html') !== -1;
                    if (isPricingPage && typeof switchTab === 'function') {
                        switchTab('priceTab', 'quotes');
                        var banner = document.getElementById('quotationFromOfferBanner');
                        if (banner) banner.style.display = 'block';
                    } else {
                        setTimeout(function () { window.location.href = 'pricing.html?createQuote=1'; }, 800);
                    }
                };
            }
            var btnAttachToShipment = document.getElementById('btnAttachToShipment');
            if (btnAttachToShipment) {
                btnAttachToShipment.onclick = function () {
                    offerPendingAttachment = offer;
                    closeModal('offerDetailModal');
                    document.getElementById('attachShipmentSelect').value = '';
                    document.getElementById('attachCustomBl').value = '';
                    document.getElementById('attachCustomBlWrap').style.display = 'none';
                    openModal('attachToShipmentModal');
                };
            }
        }
        openModal('offerDetailModal');
    }

    function getAttachedOffersMap() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY_SHIPMENT_OFFERS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function setAttachedOfferForBl(bl, offer) {
        var map = getAttachedOffersMap();
        map[bl] = { id: offer.id, shippingLine: offer.shippingLine, containerType: offer.containerType, region: offer.region, pod: offer.pod, transitTime: offer.transitTime, pricing: offer.pricing, attachedAt: new Date().toISOString() };
        try {
            localStorage.setItem(STORAGE_KEY_SHIPMENT_OFFERS, JSON.stringify(map));
        } catch (e) {}
    }

    function confirmAttachOfferToShipment() {
        if (!offerPendingAttachment) {
            notify('لم يتم اختيار عرض. أعد فتح تفاصيل العرض واضغط ربط بشحنة.', 'warning');
            return;
        }
        var selectEl = document.getElementById('attachShipmentSelect');
        var customEl = document.getElementById('attachCustomBl');
        var bl = (selectEl && selectEl.value) ? selectEl.value.trim() : '';
        if (bl === '__custom__') {
            bl = (customEl && customEl.value) ? customEl.value.trim() : '';
        }
        if (!bl) {
            notify('اختر شحنة أو أدخل رقم BL', 'warning');
            return;
        }
        setAttachedOfferForBl(bl, offerPendingAttachment);
        offerPendingAttachment = null;
        closeModal('attachToShipmentModal');
        notify('تم ربط عرض السعر بالشحنة ' + bl + ' بنجاح.', 'success');
        setTimeout(function () {
            window.location.href = 'shipments.html?bl=' + encodeURIComponent(bl);
        }, 1000);
    }

    function saveOffer() {
        var region = getSelectedRegion();
        var pod = getSelectedPOD();
        if (!region || !pod) {
            notify('المنطقة أو ميناء التفريغ غير محدد', 'warning');
            return;
        }

        var idEl = document.getElementById('offerId');
        var id = (idEl && idEl.value) ? idEl.value.trim() : '';
        var shippingLine = (document.getElementById('offerShippingLine') || {}).value || '';
        var containerType = (document.getElementById('offerContainerType') || {}).value || '';
        if (!shippingLine || !containerType) {
            notify('الخط الملاحي ونوع الحاوية مطلوبان', 'warning');
            return;
        }

        var sailingsEl = document.getElementById('offerSailings');
        var freeDaysEl = document.getElementById('offerFreeDays');
        var offer = {
            id: id || nextId(),
            region: region,
            pod: pod,
            shippingLine: shippingLine,
            containerType: containerType,
            transitTime: document.getElementById('offerTransitTime').value.trim() || null,
            sailings: sailingsEl ? sailingsEl.value.trim() || null : null,
            freeDays: freeDaysEl && freeDaysEl.value !== '' ? (freeDaysEl.value.trim() || null) : null,
            validFrom: document.getElementById('offerValidFrom').value || null,
            validTo: document.getElementById('offerValidTo').value || null,
            pricing: getPricingFromForm()
        };

        var offers = loadOffersFromStorage(region, pod);
        if (id) {
            offers = offers.map(function (o) { return o.id === id ? offer : o; });
        } else {
            offers.push(offer);
        }
        saveOffersToStorage(region, pod, offers);
        closeModal('offerModal');
        notify(id ? 'تم تحديث العرض' : 'تم حفظ العرض', 'success');
        renderOffersTable(offers);
    }

    function loadOffers() {
        var region = getSelectedRegion();
        var pod = getSelectedPOD();
        if (!region || !pod) {
            notify('الرجاء اختيار المنطقة وميناء التفريغ', 'warning');
            return;
        }
        currentRegion = region;
        currentPOD = pod;
        showOffersCard(true);
        setOffersSubtitle(region, pod);
        var offers = loadOffersFromStorage(region, pod);
        offers.forEach(function (o) { o.region = region; o.pod = pod; });
        renderOffersTable(offers);
    }

    function searchByPODName() {
        var input = document.getElementById('searchByPOD');
        var q = input ? input.value.trim() : '';
        if (!q) {
            notify('أدخل اسم الميناء للبحث', 'warning');
            return;
        }
        var offers = getAllOffersByPODSearch(q);
        if (offers.length === 0) {
            notify('لا توجد عروض للميناء: ' + q, 'warning');
        }
        currentRegion = '';
        currentPOD = q;
        showOffersCard(true);
        setOffersSubtitle('نتائج البحث', q);
        renderOffersTable(offers);
    }

    function clearFilters() {
        var r = document.getElementById('filterRegion');
        var p = document.getElementById('filterPOD');
        var podSearch = document.getElementById('searchByPOD');
        if (r) r.value = '';
        if (p) p.value = '';
        if (podSearch) podSearch.value = '';
        currentOffersList = [];
        showOffersCard(false);
        var first = document.getElementById('selectFirstCard');
        if (first) first.style.display = 'block';
    }

    // Seed demo data for first-time (one key only so it doesn't clutter)
    function maybeSeedDemo() {
        var key = getStorageKey('البحر الأحمر', 'جدة');
        if (localStorage.getItem(key)) return;
        var demo = [
            {
                id: 'PS-1',
                region: 'البحر الأحمر',
                pod: 'جدة',
                shippingLine: 'MSC',
                containerType: '40\' HC',
                transitTime: '12',
                sailings: 'أسبوعي (الاثنين / الخميس)',
                freeDays: '14',
                validFrom: '2026-01-01',
                validTo: '2026-06-30',
                pricing: {
                    oceanFreight: { price: 1400, currency: 'USD' },
                    blFee: { price: 45, currency: 'USD' },
                    telexRelease: { price: 35, currency: 'USD' },
                    otherCharges: { price: 0, currency: 'USD' }
                }
            },
            {
                id: 'PS-2',
                region: 'البحر الأحمر',
                pod: 'جدة',
                shippingLine: 'CMA CGM',
                containerType: '40\' HC',
                transitTime: '14',
                sailings: 'مرتين أسبوعياً',
                freeDays: '10',
                validFrom: '2026-02-01',
                validTo: '2026-07-31',
                pricing: {
                    oceanFreight: { price: 1350, currency: 'USD' },
                    blFee: { price: 50, currency: 'USD' },
                    telexRelease: { price: 40, currency: 'USD' },
                    otherCharges: { price: 25, currency: 'USD' }
                }
            }
        ];
        saveOffersToStorage('البحر الأحمر', 'جدة', demo);
    }

    function init() {
        maybeSeedDemo();

        var btnLoad = document.getElementById('btnLoadOffers');
        var btnClear = document.getElementById('btnClearFilters');
        var btnAdd = document.getElementById('btnAddOffer');
        var btnSave = document.getElementById('btnSaveOffer');
        var offersSearch = document.getElementById('offersSearch');
        var filterLine = document.getElementById('filterLine');
        var filterContainerType = document.getElementById('filterContainerType');

        if (btnLoad) btnLoad.addEventListener('click', loadOffers);
        if (btnClear) btnClear.addEventListener('click', clearFilters);
        if (btnAdd) btnAdd.addEventListener('click', openAddOffer);
        if (btnSave) btnSave.addEventListener('click', saveOffer);

        var btnSearchByPOD = document.getElementById('btnSearchByPOD');
        if (btnSearchByPOD) btnSearchByPOD.addEventListener('click', searchByPODName);
        var searchByPODInput = document.getElementById('searchByPOD');
        if (searchByPODInput) searchByPODInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') searchByPODName();
        });

        var attachSelect = document.getElementById('attachShipmentSelect');
        var attachCustomWrap = document.getElementById('attachCustomBlWrap');
        if (attachSelect && attachCustomWrap) {
            attachSelect.addEventListener('change', function () {
                attachCustomWrap.style.display = this.value === '__custom__' ? 'block' : 'none';
            });
        }
        var btnConfirmAttach = document.getElementById('btnConfirmAttach');
        if (btnConfirmAttach) btnConfirmAttach.addEventListener('click', confirmAttachOfferToShipment);

        function applyTableFilters() {
            renderOffersTable(currentOffersList);
        }
        if (offersSearch) offersSearch.addEventListener('input', applyTableFilters);
        if (filterLine) filterLine.addEventListener('change', applyTableFilters);
        if (filterContainerType) filterContainerType.addEventListener('change', applyTableFilters);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
