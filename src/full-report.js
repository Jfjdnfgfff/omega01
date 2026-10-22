// Loaded only when the comprehensive report is requested.
export function createFullReport({ getState, openModal, showToast, logActivity, showSuccessToast, showErrorToast, getPackageById, calculateStatus, getDisplayPhone, getUniqueCoaches, getLocalDateString }) {
    function openFullReportModal() {
        renderFullReport(); openModal('fullReportModal');
    } window.openFullReportModal = openFullReportModal;
    let html2canvasInstance = null;
    async function loadLocalHtml2Canvas() {
        if (!html2canvasInstance) {
            // html2canvas-pro: maintained fork that supports Tailwind v4 oklch()/color-mix()
            // colors (html2canvas 1.4.1 throws "unsupported color function oklch" and fails)
            const mod = await import('html2canvas-pro');
            html2canvasInstance = mod.default || mod.html2canvas || mod;
        }
        return html2canvasInstance;
    }
    // Print ONLY the comprehensive financial report modal content (not the whole app page)
    function printFullReportSheet() {
        const modal = document.getElementById('fullReportModal');
        if (!modal) return;
        const body = document.body;
        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            body.classList.remove('printing-full-report');
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        // Safety net for browsers that never fire the 'afterprint' event
        setTimeout(cleanup, 120000);
        body.classList.add('printing-full-report');
        try {
            window.print();
        } catch (err) {
            console.error('Print failed:', err);
            if (typeof showToast === 'function') showToast('تعذر فتح نافذة الطباعة', 'error');
        }
        if (typeof logActivity === 'function') {
            try { logActivity('system', 'طباعة التقرير المالي الشامل', 'تم فتح نافذة الطباعة للتقرير المالي والإداري الشامل'); } catch (e) { /* noop */ }
        }
    }
    window.printFullReportSheet = printFullReportSheet;
    // In-app preview of the generated PNG so it can be saved even where direct
    // downloads are blocked (sandboxed preview iframes, some mobile browsers)
    let _lastReportBlobUrl = null;
    function releaseReportBlobUrl() {
        if (_lastReportBlobUrl) {
            try { URL.revokeObjectURL(_lastReportBlobUrl); } catch (e) { /* noop */ }
            _lastReportBlobUrl = null;
        }
    }
    function showReportImagePreview(url, filename, blob) {
        const modal = document.getElementById('reportImageModal');
        const img = document.getElementById('reportImagePreview');
        const dlBtn = document.getElementById('reportImageDownloadBtn');
        const shareBtn = document.getElementById('reportImageShareBtn');
        if (!modal || !img) return;
        releaseReportBlobUrl();
        if (blob) _lastReportBlobUrl = url; // only blob: URLs need revoking
        img.src = url;
        const fname = filename || 'التقرير_الشامل_المالي_والإداري.png';
        if (dlBtn) {
            dlBtn.onclick = function () {
                const a = document.createElement('a');
                a.download = fname;
                a.href = url;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
        }
        if (shareBtn) {
            // Web Share lets mobile users save the PNG straight to Photos/Files,
            // which works even when anchor downloads are blocked inside iframes
            let shareFile = null;
            try {
                shareFile = blob ? new File([blob], fname, { type: 'image/png' }) : null;
            } catch (e) { shareFile = null; }
            const canShare = !!(shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] }));
            shareBtn.classList.toggle('hidden', !canShare);
            if (canShare) {
                shareBtn.onclick = function () {
                    navigator.share({ files: [shareFile], title: 'التقرير المالي والإداري الشامل' })
                        .catch(err => console.warn('Share dismissed/failed:', err));
                };
            }
        }
        openModal('reportImageModal');
    }
    window.showReportImagePreview = showReportImagePreview;
    async function printFullReport() {
        const reportElem = document.getElementById('fullReportContent');
        const printBtn = document.getElementById('printReportBtn');
        if (!reportElem) return;
        const originalBtnContent = printBtn ? printBtn.innerHTML : '';
        if (printBtn) {
            printBtn.disabled = true;
            printBtn.innerHTML = `
                <svg class="w-4 h-4 animate-spin text-white inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>جاري حفظ الصورة...</span>
            `;
        }
        try {
            const html2canvas = await loadLocalHtml2Canvas();
            if (typeof html2canvas !== 'function') throw new Error('html2canvas-pro failed to load');
            // Adaptive scale: very long reports at scale 2 can exceed the mobile
            // canvas pixel limit (~16.7M px on iOS) which makes export fail silently
            const TARGET_W = 1050;
            const srcW = Math.max(1, reportElem.scrollWidth || TARGET_W);
            const estH = Math.max(1, Math.round((reportElem.scrollHeight || 1000) * (TARGET_W / srcW)));
            const MAX_CANVAS_AREA = 16000000; // safe under iOS Safari's 16777216 px cap
            let scale = 2;
            if (TARGET_W * estH * 4 > MAX_CANVAS_AREA) {
                scale = Math.max(1, Math.sqrt(MAX_CANVAS_AREA / (TARGET_W * estH)));
            }
            const canvas = await html2canvas(reportElem, {
                scale, useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 1280, width: 1050,
                scrollX: 0, scrollY: 0, logging: false, onclone: (clonedDoc) => {
                    const clonedReport = clonedDoc.getElementById('fullReportContent');
                    if (clonedReport) {
                        clonedReport.style.width = '1050px';
                        clonedReport.style.maxWidth = '1050px';
                        clonedReport.style.minWidth = '1050px';
                        clonedReport.style.padding = '32px';
                        clonedReport.style.backgroundColor = '#ffffff';
                        clonedReport.style.boxSizing = 'border-box';
                    }
                    // Convert all select elements into crystal-clear styled divs for html2canvas
                    const selects = clonedDoc.querySelectorAll('#fullReportContent select');
                    selects.forEach(select => {
                        let text = ''; if (select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
                            text = select.options[select.selectedIndex].text;
                        } else { text = select.value || 'الكل';
                        } const div = clonedDoc.createElement('div');
                        div.style.cssText = 'display: flex; align-items: center; justify-content: flex-start; height: 38px; min-height: 38px; padding: 4px 12px; font-size: 13px; font-weight: 800; color: #0f172a; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; line-height: 1.6; box-sizing: border-box; overflow: visible; font-family: "Tajawal", sans-serif;';
                        div.textContent = text;
                        if (select.parentNode) {
                            select.parentNode.replaceChild(div, select);
                        } });
                    // Convert all input elements into styled divs for html2canvas
                    const inputs = clonedDoc.querySelectorAll('#fullReportContent input');
                    inputs.forEach(input => { if (input.type === 'hidden') return;
                        const text = input.value || input.placeholder || '-';
                        const div = clonedDoc.createElement('div');
                        div.style.cssText = 'display: flex; align-items: center; justify-content: flex-start; height: 38px; min-height: 38px; padding: 4px 12px; font-size: 13px; font-weight: 800; color: #0f172a; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; line-height: 1.6; box-sizing: border-box; overflow: visible; font-family: "Tajawal", sans-serif;';
                        div.textContent = text;
                        if (input.parentNode) {
                            input.parentNode.replaceChild(div, input);
                        } }); }
            });
            // Prefer toBlob (smaller memory footprint, no giant data-URL strings);
            // fall back to toDataURL only if toBlob is unavailable or empty
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const filename = `التقرير_الشامل_المالي_والإداري_${dateStr}.png`;
            let blob = null;
            try {
                blob = await new Promise((resolve, reject) => {
                    if (typeof canvas.toBlob !== 'function') { reject(new Error('toBlob unsupported')); return; }
                    canvas.toBlob(b => b ? resolve(b) : reject(new Error('empty blob')), 'image/png');
                });
            } catch (blobErr) { blob = null; }
            let href = null;
            if (blob) {
                href = URL.createObjectURL(blob);
            } else {
                href = canvas.toDataURL('image/png');
                if (!href || href === 'data:,' || href.length < 128) throw new Error('تم توليد صورة فارغة');
            }
            // 1) Direct download attempt
            const link = document.createElement('a');
            link.download = filename;
            link.href = href;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // 2) In-app preview fallback: lets the user save the image (long-press /
            //    right-click, share button, or the download button) even if the direct
            //    download was silently blocked by the browser or a sandboxed iframe
            showReportImagePreview(href, filename, blob);
            if (typeof showSuccessToast === 'function') {
                showSuccessToast('تم إنشاء صورة التقرير! إن لم يبدأ التنزيل تلقائياً استخدم نافذة المعاينة');
            }
            if (typeof logActivity === 'function') {
                try { logActivity('system', 'تصدير التقرير المالي كصورة', 'تم إنشاء صورة PNG للتقرير المالي والإداري الشامل'); } catch (e) { /* noop */ }
            }
        } catch (err) {
            console.error('Error exporting image:', err);
            const detail = (err && err.message) ? ` (${String(err.message).slice(0, 80)})` : '';
            const msg = 'فشل إنشاء صورة التقرير، حاول مرة أخرى' + detail;
            if (typeof showErrorToast === 'function') showErrorToast(msg);
            else if (typeof showToast === 'function') showToast(msg, 'error');
        } finally {
            if (printBtn) {
                printBtn.disabled = false;
                printBtn.innerHTML = originalBtnContent;
            }
        }
    }
    window.printFullReport = printFullReport;
    function renderFullReport() { const reportContainer = document.getElementById('fullReportContent');
        if (!reportContainer) return; const now = new Date();
        const formattedDate = now.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let totalIncome = 0; let totalDebt = 0;
        let activeCount = 0; let expiredCount = 0;
        (getState().customers || []).forEach(c => {
            const pkg = getPackageById(c.packageId);
            const price = (c.price !== undefined && c.price !== null && c.price !== '') ? Number(c.price) : (pkg ? Number(pkg.price || 0) : 0);
            let paidAmount = 0; if (c.paymentStatus === 'paid') paidAmount = price;
            else if (c.paymentStatus === 'credit') {
                const debt = parseInt(c.debtAmount) || 0;
                totalDebt += debt; paidAmount = Math.max(0, price - debt);
            } totalIncome += paidAmount; const status = calculateStatus ? calculateStatus(c) : 'active';
            if (status === 'active' || status === 'near_expiry') activeCount++;
            else if (status === 'expired') expiredCount++;
        }); const totalStaffPayouts = (getState().staffPayouts || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalExpenses = (getState().expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        // Prefer exact pre-aggregated yearly stats while older sales history is still loading
        const yearlyStatsR = getState().v2Stats && getState().v2Stats.yearly ? getState().v2Stats.yearly : null;
        const salesInterim = Boolean(window.salesHistoryLoading && !window.salesHistoryComplete && yearlyStatsR && Object.keys(yearlyStatsR).length > 0);
        const totalSales = salesInterim
            ? Object.values(yearlyStatsR).reduce((sum, ys) => sum + (Number(ys && ys.sales) || 0), 0)
            : (getState().sales || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const netProfit = (totalIncome + totalSales) - (totalExpenses + totalStaffPayouts);
        let html = `
        <!-- Header -->
        <div class="border-b-2 border-slate-800 pb-4 mb-6 text-right">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 class="text-xl sm:text-2xl font-black text-slate-900">سبيس مانجر برو - التقرير الشامل للمؤسسة</h1>
                    <p class="text-xs text-slate-600 mt-1 font-bold">
                        تاريخ ووقت الاستخراج: <span dir="ltr" class="inline-block">${formattedDate} - ${formattedTime}</span>
                    </p>
                </div>
                <div class="bg-blue-50 border border-blue-200/90 px-3.5 py-2 rounded-xl text-xs font-extrabold text-blue-700 shadow-xs">
                    سجل مالي وإداري محين تلقائياً
                </div>
            </div>
        </div>

        <!-- Summary Cards Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div class="text-[11px] font-bold text-slate-500 mb-0.5">المشتركين الكلي</div>
                <div class="text-base sm:text-lg font-black text-slate-800">${(getState().customers || []).length}</div>
                <div class="text-[10px] text-blue-600 font-bold">${activeCount} نشط</div>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <div class="text-[11px] font-bold text-blue-700 mb-0.5">مداخيل الاشتراكات</div>
                <div class="text-base sm:text-lg font-black text-blue-700">${totalIncome.toLocaleString()} دج</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div class="text-[11px] font-bold text-slate-700 mb-0.5">الديون (الكريدي)</div>
                <div class="text-base sm:text-lg font-black text-slate-800">${totalDebt.toLocaleString()} دج</div>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <div class="text-[11px] font-bold text-blue-700 mb-0.5">خلاص العمال/المدربين</div>
                <div class="text-base sm:text-lg font-black text-blue-700">${totalStaffPayouts.toLocaleString()} دج</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div class="text-[11px] font-bold text-slate-700 mb-0.5">المصاريف العامة</div>
                <div class="text-base sm:text-lg font-black text-slate-700">${totalExpenses.toLocaleString()} دج</div>
            </div>
            <div class="bg-sky-50 p-3 rounded-xl border border-sky-200">
                <div class="text-[11px] font-bold text-sky-700 mb-0.5">الصافي المتبقي</div>
                <div class="text-base sm:text-lg font-black ${netProfit >= 0 ? 'text-blue-700' : 'text-slate-800'}">${netProfit.toLocaleString()} دج</div>
            </div>
        </div>

        <!-- Section 1: Staff & Coach Payouts -->
        <div class="mb-8">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    سجل خلاص العمال والمدربين (${(getState().staffPayouts || []).length})
                </h3>
                <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    المجموع: ${totalStaffPayouts.toLocaleString()} دج
                </span>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-right text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th class="p-2.5 border-l border-slate-200">اسم العامل / الكوتش</th>
                            <th class="p-2.5 border-l border-slate-200">المبلغ المدفوع (دج)</th>
                            <th class="p-2.5 border-l border-slate-200">طبيعة الدفعة</th>
                            <th class="p-2.5 border-l border-slate-200">تاريخ ووقت الخلاص</th>
                            <th class="p-2.5">ملاحظة إضافية</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(getState().staffPayouts || []).length === 0 ? `
                            <tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">لا توجد دفعات خلاص مسجلة للعمال أو المدربين</td></tr>
                        ` : (getState().staffPayouts || []).map(p => {
                            let payoutDateDisplay = p.payoutDate || p.date || '-';
                            if (p.date && p.date.includes('T')) {
                                const dt = new Date(p.date);
                                if (!isNaN(dt.getTime())) {
                                    payoutDateDisplay = `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()} - ${dt.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}`;
                                } } return `
                            <tr class="border-b border-slate-100 hover:bg-slate-50">
                                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800">${p.staffName || p.name || '-'}</td>
                                <td class="p-2.5 border-l border-slate-200 font-bold text-blue-700" dir="ltr" style="text-align: right;">${Number(p.amount || 0).toLocaleString()} دج</td>
                                <td class="p-2.5 border-l border-slate-200 font-medium text-slate-700">${p.payoutType || p.type || 'راتب شهري'}</td>
                                <td class="p-2.5 border-l border-slate-200 text-slate-600 font-medium" dir="ltr" style="text-align: right;">${payoutDateDisplay}</td>
                                <td class="p-2.5 text-slate-500 italic">${p.notes || '-'}</td>
                            </tr>
                            `; }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section: Suppliers Report (سجل معاملات وفواتير الموردين) -->
        <div class="mb-8">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    سجل فواتير ومعاملات الموردين والسلع (${(getState().suppliers || []).length})
                </h3>
                <div class="flex gap-2">
                    <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        مدفوع: ${(getState().suppliers || []).reduce((s, x) => s + (Number(x.paid) || 0), 0).toLocaleString()} دج
                    </span>
                    <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        كريدي: ${(getState().suppliers || []).reduce((s, x) => s + (Number(x.debt) || 0), 0).toLocaleString()} دج
                    </span>
                </div>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-right text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th class="p-2.5 border-l border-slate-200">اسم المورد</th>
                            <th class="p-2.5 border-l border-slate-200">المعلومات / رقم الإثبات</th>
                            <th class="p-2.5 border-l border-slate-200">السلع المشتراة (شاشريت منه)</th>
                            <th class="p-2.5 border-l border-slate-200">شحال خلصت (مدفوع)</th>
                            <th class="p-2.5 border-l border-slate-200">شحال راه كريدي (باقي)</th>
                            <th class="p-2.5 border-l border-slate-200">التاريخ</th>
                            <th class="p-2.5">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(getState().suppliers || []).length === 0 ? `
                            <tr><td colspan="7" class="p-4 text-center text-slate-400 font-medium">لا توجد فواتير أو معاملات موردين مسجلة</td></tr>
                        ` : (getState().suppliers || []).map(sup => {
                            const d = sup.date ? new Date(sup.date) : null;
                            const dStr = d && !isNaN(d.getTime()) ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : '-';
                            return `
                            <tr class="border-b border-slate-100 hover:bg-slate-50">
                                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800">${sup.name || '-'}</td>
                                <td class="p-2.5 border-l border-slate-200 font-medium text-slate-600">${sup.info || '-'}</td>
                                <td class="p-2.5 border-l border-slate-200 text-slate-700 max-w-xs">${sup.items || '-'}</td>
                                <td class="p-2.5 border-l border-slate-200 font-bold text-blue-700" dir="ltr" style="text-align: right;">${Number(sup.paid || 0).toLocaleString()} دج</td>
                                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800" dir="ltr" style="text-align: right;">${Number(sup.debt || 0).toLocaleString()} دج</td>
                                <td class="p-2.5 border-l border-slate-200 text-slate-600" dir="ltr" style="text-align: right;">${dStr}</td>
                                <td class="p-2.5 text-slate-500 italic">${sup.notes || '-'}</td>
                            </tr>
                            `; }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section 2: Subscribers -->
        <div class="mb-8">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    سجل المشتركين التفصيلي (${(getState().customers || []).length})
                </h3>
                <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    مداخيل الاشتراكات: ${totalIncome.toLocaleString()} دج
                </span>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-right text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th class="p-2.5 border-l border-slate-200">اسم المشترك</th>
                            <th class="p-2.5 border-l border-slate-200">رقم الهاتف</th>
                            <th class="p-2.5 border-l border-slate-200">الباقة</th>
                            <th class="p-2.5 border-l border-slate-200">تاريخ البداية</th>
                            <th class="p-2.5 border-l border-slate-200">تاريخ الانتهاء</th>
                            <th class="p-2.5 border-l border-slate-200">حالة الدفع</th>
                            <th class="p-2.5">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(getState().customers || []).length === 0 ? `
                            <tr><td colspan="7" class="p-4 text-center text-slate-400 font-medium">لا يوجد مشتركين مسجلين</td></tr>
                        ` : (getState().customers || []).map(c => {
                            const pkg = getPackageById(c.packageId);
                            const pkgName = pkg ? pkg.name : 'ملاكمة';
                            const status = calculateStatus ? calculateStatus(c) : 'active';
                            const statusLabel = status === 'active' ? 'نشط' : (status === 'near_expiry' ? 'قريب الانتهاء' : 'منتهي');
                            const statusClass = status === 'active' ? 'text-blue-700 font-bold' : (status === 'near_expiry' ? 'text-blue-700 font-bold' : 'text-slate-700 font-bold');
                            const dStart = c.startDate ? new Date(c.startDate) : null;
                            const dEnd = c.endDate ? new Date(c.endDate) : null;
                            const startStr = dStart && !isNaN(dStart.getTime()) ? `${dStart.getFullYear()}/${dStart.getMonth() + 1}/${dStart.getDate()}` : '-';
                            const endStr = dEnd && !isNaN(dEnd.getTime()) ? `${dEnd.getFullYear()}/${dEnd.getMonth() + 1}/${dEnd.getDate()}` : '-';
                            const payStr = c.paymentStatus === 'paid' ? 'خالص بالكامل' : `كريدي (${c.debtAmount || 0} دج)`;
                            const payClass = c.paymentStatus === 'paid' ? 'text-blue-700 font-bold' : 'text-slate-800 font-bold';
                            return `
                            <tr class="border-b border-slate-100 hover:bg-slate-50">
                                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800">${c.name || '-'}</td>
                                <td class="p-2.5 border-l border-slate-200 text-slate-600 font-medium" dir="ltr" style="text-align: right;">${getDisplayPhone(c.phone)}</td>
                                <td class="p-2.5 border-l border-slate-200 font-medium text-slate-800">${pkgName}</td>
                                <td class="p-2.5 border-l border-slate-200 text-slate-600">${startStr}</td>
                                <td class="p-2.5 border-l border-slate-200 text-slate-600">${endStr}</td>
                                <td class="p-2.5 border-l border-slate-200 ${payClass}">${payStr}</td>
                                <td class="p-2.5 ${statusClass}">${statusLabel}</td>
                            </tr>
                            `; }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section 3: Sales Classification & Reports -->
        <div class="mb-8 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
                <div>
                    <h3 class="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                        سجل تصنيف المبيعات والمنتجات التفصيلي (${(getState().sales || []).length})
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">تصنيف ومفلترة المبيعات حسب المنتج أو المدرب لاستخراج تقارير دقيقة</p>
                </div>
                <span class="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                    مجموع كافة المبيعات: ${totalSales.toLocaleString()} دج
                </span>
            </div>

            <!-- Filter Bar for Report Modal -->
            <div class="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mb-4 no-print">
                <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">المخزن (Stock):</label>
                    <select id="reportFilterStock" onchange="updateFullReportSalesSection()" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white font-bold outline-none focus:border-blue-500 h-10 min-h-[40px] leading-relaxed">
                        <option value="all">جميع المخازن</option>
                        <option value="stock1">مخزون 1 (Stock 1)</option>
                        <option value="stock2">مخزون 2 (Stock 2)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">تصنيف حسب المنتج:</label>
                    <select id="reportFilterProduct" onchange="updateFullReportSalesSection()" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white font-bold outline-none focus:border-blue-500 h-10 min-h-[40px] leading-relaxed">
                        <option value="all">جميع المنتجات</option>
                        ${Array.from(new Set((getState().sales || []).map(s => s.prodName || s.productName).filter(Boolean))).map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">تصنيف حسب المدرب:</label>
                    <select id="reportFilterCoach" onchange="updateFullReportSalesSection()" class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white font-bold outline-none focus:border-blue-500 h-10 min-h-[40px] leading-relaxed">
                        <option value="all">جميع المدربين والمسؤولين</option>
                        <option value="عام">عام / مبيعات مباشرة</option>
                        ${getUniqueCoaches().map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1 gap-1">
                        <label class="block text-[11px] font-bold text-slate-700 whitespace-nowrap">التاريخ:</label>
                        <button type="button" onclick="setElemValue('reportFilterDate', ''); updateFullReportSalesSection();" class="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline">الكل</button>
                    </div>
                    <input type="date" id="reportFilterDate" onchange="updateFullReportSalesSection()" class="w-full border border-slate-300 rounded-xl px-2 py-2 text-xs bg-white font-semibold outline-none focus:border-blue-500 h-10 min-h-[40px] leading-relaxed">
                </div>
                <div>
                    <label class="block text-[11px] font-bold text-slate-700 mb-1">بحث سريع:</label>
                    <input type="text" id="reportSearchSales" oninput="updateFullReportSalesSection()" placeholder="بحث بالاسم..." class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white font-bold outline-none focus:border-blue-500 h-10 min-h-[40px] leading-relaxed">
                </div>
            </div>

            <!-- Dynamic Summary Cards -->
            <div id="reportSalesSummaryCards" class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3"></div>

            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table class="w-full text-right text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th class="p-2.5 border-l border-slate-200">اسم المنتج</th>
                            <th class="p-2.5 border-l border-slate-200">المخزن</th>
                            <th class="p-2.5 border-l border-slate-200">المدرب / المسؤول</th>
                            <th class="p-2.5 border-l border-slate-200">الكمية</th>
                            <th class="p-2.5 border-l border-slate-200">المبلغ الإجمالي</th>
                            <th class="p-2.5 border-l border-slate-200">الربح الصافي</th>
                            <th class="p-2.5 border-l border-slate-200">تاريخ البيع</th>
                            <th class="p-2.5 no-print text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="reportSalesTableBody">
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section 4: Expenses -->
        <div class="mb-6">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <h3 class="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
                    سجل المصاريف العامة (${(getState().expenses || []).length})
                </h3>
                <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    مجموع المصاريف: ${totalExpenses.toLocaleString()} دج
                </span>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
                <table class="w-full text-right text-xs border-collapse">
                    <thead>
                        <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th class="p-2.5 border-l border-slate-200">بيان المصروف</th>
                            <th class="p-2.5 border-l border-slate-200">المبلغ (دج)</th>
                            <th class="p-2.5">تاريخ المصروف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(getState().expenses || []).length === 0 ? `
                            <tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">لا توجد مصاريف مسجلة</td></tr>
                        ` : (getState().expenses || []).map(e => {
                            const d = e.date ? new Date(e.date) : null;
                            const dStr = d && !isNaN(d.getTime()) ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : '-';
                            return `
                            <tr class="border-b border-slate-100 hover:bg-slate-50">
                                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800">${e.desc || '-'}</td>
                                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800" dir="ltr" style="text-align: right;">${Number(e.amount || 0).toLocaleString()} دج</td>
                                <td class="p-2.5 text-slate-600" dir="ltr" style="text-align: right;">${dStr}</td>
                            </tr>
                            `; }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Footer signature lines for print -->
        <div class="hidden print:flex justify-between items-center pt-8 border-t border-slate-300 mt-12 text-xs font-bold text-slate-700">
            <div>توقيع وتختم الإدارة: ................................</div>
            <div>تاريخ الاعتماد: ${formattedDate}</div>
        </div>
        `; reportContainer.innerHTML = html;
        updateFullReportSalesSection(); } window.renderFullReport = renderFullReport;
    function updateFullReportSalesSection() {
        const stockSelect = document.getElementById('reportFilterStock');
        const prodSelect = document.getElementById('reportFilterProduct');
        const coachSelect = document.getElementById('reportFilterCoach');
        const dateInput = document.getElementById('reportFilterDate');
        const searchInput = document.getElementById('reportSearchSales');
        const tbody = document.getElementById('reportSalesTableBody');
        const summaryCards = document.getElementById('reportSalesSummaryCards');
        if (!tbody || !getState().sales) return;
        const selectedStock = stockSelect ? stockSelect.value : 'all';
        const selectedProd = prodSelect ? prodSelect.value : 'all';
        const selectedCoach = coachSelect ? coachSelect.value : 'all';
        const selectedDate = dateInput ? dateInput.value : '';
        const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
        let filtered = [...getState().sales]; if (selectedStock !== 'all') {
            if (selectedStock === 'stock2') {
                filtered = filtered.filter(s => s.stockLocation === 'stock2');
            } else { filtered = filtered.filter(s => !s.stockLocation || s.stockLocation === 'stock1');
            } } if (selectedProd !== 'all') {
            filtered = filtered.filter(s => (s.prodName || s.productName) === selectedProd);
        } if (selectedCoach !== 'all') { if (selectedCoach === 'عام') {
                filtered = filtered.filter(s => !s.coachName || s.coachName === 'عام');
            } else { filtered = filtered.filter(s => s.coachName === selectedCoach);
            } } if (selectedDate) { filtered = filtered.filter(s => typeof getLocalDateString === 'function' ? getLocalDateString(s.date) === selectedDate : true);
        } if (searchVal) { filtered = filtered.filter(s =>
                (s.prodName || s.productName || '').toLowerCase().includes(searchVal) ||
                (s.coachName || '').toLowerCase().includes(searchVal)
            ); } const totalRevenue = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const totalProfit = filtered.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
        const totalQty = filtered.reduce((sum, s) => sum + (Number(s.qty) || 1), 0);
        if (summaryCards) { summaryCards.innerHTML = `
                <div class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div class="text-[10px] font-bold text-slate-500 mb-0.5">مبيعات التصنيف</div>
                    <div class="text-sm font-extrabold text-slate-800" dir="ltr">${totalRevenue.toLocaleString()} دج</div>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div class="text-[10px] font-bold text-slate-500 mb-0.5">الربح الصافي للتصنيف</div>
                    <div class="text-sm font-extrabold text-blue-700" dir="ltr">${totalProfit.toLocaleString()} دج</div>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-blue-200/80 shadow-xs">
                    <div class="text-[10px] font-bold text-slate-500 mb-0.5">عدد القطع المباعة</div>
                    <div class="text-sm font-extrabold text-blue-700">${totalQty}</div>
                </div>
                <div class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <div class="text-[10px] font-bold text-slate-500 mb-0.5">عدد العمليات</div>
                    <div class="text-sm font-extrabold text-slate-800">${filtered.length} عملية</div>
                </div>
            `; } if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400 font-medium">لا توجد مبيعات مسجلة تطابق هذا التصنيف</td></tr>`;
            return; } tbody.innerHTML = filtered.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s => {
            const d = s.date ? new Date(s.date) : null;
            const dStr = d && !isNaN(d.getTime()) ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} - ${d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}` : '-';
            const name = s.prodName || s.productName || '-';
            const coach = s.coachName || 'عام';
            const total = Number(s.total || 0);
            const profit = Number(s.profit || 0);
            const isStock2 = s.stockLocation === 'stock2';
            const stockBadge = isStock2 ? `<span class="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">مخزون 2</span>`
                : `<span class="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">مخزون 1</span>`;
            return `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800">${name}</td>
                <td class="p-2.5 border-l border-slate-200 font-medium text-slate-700">${stockBadge}</td>
                <td class="p-2.5 border-l border-slate-200 font-bold text-blue-700">
                    <span class="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">${coach}</span>
                </td>
                <td class="p-2.5 border-l border-slate-200 font-medium text-slate-700">${(s.unitMode === 'kilo' || s.qtyUnit === 'kg') ? `${s.qty || 1} كغ` : s.unitMode === 'dose_gram' ? `${s.qty || 1} دوزة (${Number(s.gramsSold || 0)} غ)` : (s.qty || 1)}</td>
                <td class="p-2.5 border-l border-slate-200 font-bold text-slate-800" dir="ltr" style="text-align: right;">${total.toLocaleString()} دج</td>
                <td class="p-2.5 border-l border-slate-200 font-bold text-blue-600" dir="ltr" style="text-align: right;">${profit.toLocaleString()} دج</td>
                <td class="p-2.5 border-l border-slate-200 text-slate-600" dir="ltr" style="text-align: right;">${dStr}</td>
                <td class="p-2.5 no-print text-center">
                    <button onclick="deleteSale('${s.id}')" class="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded" title="حذف البيع">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
            `; }).join(''); } window.updateFullReportSalesSection = updateFullReportSalesSection;

return { openFullReportModal, renderFullReport, updateFullReportSalesSection, printFullReport, printFullReportSheet, showReportImagePreview };
}
