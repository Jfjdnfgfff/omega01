// Activity logging remains eager; only its viewer and controls are deferred.
export function createActivityLogView({ getState, ensureSeedActivityLogs, escapeHTML, promptWithPassword, saveState, showSuccessToast }) {
    async function openActivityLogModal() {
        ensureSeedActivityLogs();
        const modal = document.getElementById('activityLogModal');
        if (modal) {
            modal.classList.add('active');
            renderActivityLogModal();
        }
        if (window.lazyLoadSection) {
            await window.lazyLoadSection('activityLogs');
            renderActivityLogModal();
        }
    }
    window.openActivityLogModal = openActivityLogModal;

    function getFieldIcon(name) {
        if (!name) return '📝';
        if (name.includes('الاسم')) return '👤';
        if (name.includes('الهاتف')) return '📞';
        if (name.includes('الباقة')) return '📦';
        if (name.includes('السعر') || name.includes('المبلغ') || name.includes('التكلفة')) return '💰';
        if (name.includes('الدين') || name.includes('الكريدي')) return '💳';
        if (name.includes('نوع الاشتراك')) return '🏷️';
        if (name.includes('الحصص')) return '🔢';
        if (name.includes('الانتهاء') || name.includes('التاريخ')) return '⏳';
        if (name.includes('الوزن')) return '🏋️';
        if (name.includes('الكمية') || name.includes('المخزون')) return '📦';
        if (name.includes('المدفوع')) return '💵';
        if (name.includes('السلع')) return '🛒';
        return '✏️';
    }

    function toggleActivityLogDetail(id) {
        const detailEl = document.getElementById('log_detail_' + id);
        const arrowEl = document.getElementById('log_arrow_' + id);
        if (!detailEl) return;
        if (detailEl.classList.contains('hidden')) {
            detailEl.classList.remove('hidden');
            if (arrowEl) arrowEl.classList.add('rotate-180');
        } else {
            detailEl.classList.add('hidden');
            if (arrowEl) arrowEl.classList.remove('rotate-180');
        }
    }
    window.toggleActivityLogDetail = toggleActivityLogDetail;

    function parseDiffItem(diff) {
        let fieldName = 'التعديل';
        let rawValue = diff ? String(diff).trim() : '';
        
        if (rawValue.includes(': ')) {
            const idx = rawValue.indexOf(': ');
            fieldName = rawValue.substring(0, idx).trim();
            rawValue = rawValue.substring(idx + 2).trim();
        } else if (rawValue.includes(':')) {
            const idx = rawValue.indexOf(':');
            fieldName = rawValue.substring(0, idx).trim();
            rawValue = rawValue.substring(idx + 1).trim();
        }

        let beforeVal = '--';
        let afterVal = rawValue;

        if (rawValue.includes('من ') && rawValue.includes(' إلى ')) {
            const fromIdx = rawValue.indexOf('من ');
            const toIdx = rawValue.indexOf(' إلى ');
            
            let rawBefore = rawValue.substring(fromIdx + 3, toIdx).trim();
            let rawAfter = rawValue.substring(toIdx + 5).trim();

            if (rawBefore.startsWith('"') && rawBefore.endsWith('"') && rawBefore.length >= 2) {
                rawBefore = rawBefore.slice(1, -1);
            }
            if (rawAfter.startsWith('"') && rawAfter.endsWith('"') && rawAfter.length >= 2) {
                rawAfter = rawAfter.slice(1, -1);
            }

            beforeVal = rawBefore || 'غير محدد';
            afterVal = rawAfter || 'غير محدد';
        } else if (rawValue.startsWith('إلى ')) {
            beforeVal = 'سابقاً';
            afterVal = rawValue.substring(4).trim();
        }

        // Format dates simply without ISO artifacts
        if (fieldName.includes('تاريخ') || fieldName.includes('الميلاد') || fieldName.includes('الانتهاء') || fieldName.includes('dob') || fieldName.includes('endDate')) {
            if (beforeVal && beforeVal.includes('T')) beforeVal = beforeVal.split('T')[0];
            if (afterVal && afterVal.includes('T')) afterVal = afterVal.split('T')[0];
        }

        return { fieldName, beforeVal, afterVal, rawValue };
    }

    function formatActivityDetailsHtml(detailsText, itemId) {
        if (!detailsText) return '';
        const safeText = escapeHTML(detailsText);
        const safeId = escapeHTML(itemId || 'item_' + Math.random().toString(36).substr(2, 6));
        
        if (safeText.includes(' | ')) {
            const parts = safeText.split(' | ');
            const mainSummary = parts[0];
            const diffs = parts.slice(1);
            
            const badgeList = diffs.map(diff => {
                const parsed = parseDiffItem(diff);
                const icon = getFieldIcon(parsed.fieldName);
                return `
                    <span class="inline-flex items-center flex-wrap gap-1 text-[11px] font-bold px-2 py-1 rounded-xl border bg-blue-50 text-blue-950 border-blue-200 shadow-2xs max-w-full break-words">
                        <span>${icon} <strong>${escapeHTML(parsed.fieldName)}:</strong></span>
                        <span class="text-blue-600 font-bold">من</span>
                        <span class="text-blue-800 font-extrabold break-all">${escapeHTML(parsed.beforeVal)}</span>
                        <span class="text-blue-600 font-bold">إلى</span>
                        <span class="text-blue-950 font-black break-all">${escapeHTML(parsed.afterVal)}</span>
                    </span>
                `;
            }).join(' ');

            const rowsHtml = diffs.map(diff => {
                const parsed = parseDiffItem(diff);
                const icon = getFieldIcon(parsed.fieldName);

                return `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 bg-blue-50/50 rounded-xl border border-blue-200 shadow-2xs transition-colors w-full min-w-0">
                        <div class="flex items-center gap-1.5 shrink-0 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-300 text-blue-950 font-black text-xs w-fit">
                            <span>${icon}</span>
                            <span>${escapeHTML(parsed.fieldName)}</span>
                        </div>
                        <div class="text-xs font-bold text-blue-950 text-right dir-rtl flex-1 leading-normal break-words min-w-0 w-full sm:w-auto">
                            <span class="text-blue-600 font-bold mx-1">من</span>
                            <span class="font-extrabold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200 inline-block max-w-full break-words">${escapeHTML(parsed.beforeVal)}</span>
                            <span class="text-blue-600 font-bold mx-1">إلى</span>
                            <span class="font-black text-blue-950 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-300 inline-block max-w-full break-words">${escapeHTML(parsed.afterVal)}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="mt-1 space-y-1 w-full min-w-0">
                    <p class="text-xs font-extrabold text-slate-800 leading-relaxed break-words">${mainSummary}</p>
                    <div class="flex flex-wrap gap-1 mt-1 w-full min-w-0">${badgeList}</div>

                    <button type="button" onclick="event.stopPropagation(); toggleActivityLogDetail('${safeId}')" class="mt-2 text-xs font-black text-blue-600 hover:text-blue-800 flex items-center justify-between sm:justify-start gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all border border-blue-200 shadow-2xs cursor-pointer w-full sm:w-auto">
                        <span class="truncate">🔍 اضغط لرؤية تفاصيل التغييرات (من ⬅️ إلى) (${diffs.length})</span>
                        <svg id="log_arrow_${safeId}" class="w-3.5 h-3.5 shrink-0 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </button>

                    <div id="log_detail_${safeId}" class="hidden mt-2 p-2.5 bg-blue-50/30 border border-blue-200/90 rounded-2xl space-y-2 shadow-inner w-full min-w-0">
                        <div class="text-[11px] font-black text-blue-900 border-b border-blue-200 pb-1.5 flex items-center justify-between">
                            <span>التعديلات المنجزة (من ⬅️ إلى بالعربية):</span>
                            <span class="text-blue-700 font-extrabold">${diffs.length} حقول</span>
                        </div>
                        <div class="space-y-1.5 mt-2 w-full min-w-0">
                            ${rowsHtml}
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `<p class="text-xs text-slate-600 font-medium leading-relaxed break-words mt-0.5">${safeText}</p>`;
    }

    function renderActivityLogModal() {
        const container = document.getElementById('activityLogList');
        const countElem = document.getElementById('activityLogTotalCount');
        if (!container) return;

        let logs = Array.isArray(getState().activityLogs) ? [...getState().activityLogs] : [];

        const searchInput = document.getElementById('activityLogSearchInput');
        const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
        if (q) {
            logs = logs.filter(l => {
                if (!l) return false;
                const t = (l.title || '').toLowerCase();
                const d = (l.details || '').toLowerCase();
                return t.includes(q) || d.includes(q);
            });
        }

        const catFilter = document.getElementById('activityLogCategoryFilter');
        const cat = catFilter ? catFilter.value : 'all';
        if (cat !== 'all') {
            logs = logs.filter(l => l && l.type === cat);
        }

        logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        if (countElem) {
            countElem.textContent = `${logs.length} عملية`;
        }

        if (logs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div class="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p class="text-sm font-bold text-slate-700">لا توجد عمليات مسجلة في السجل</p>
                    <p class="text-xs text-slate-400 mt-1">سيتم تسجيل كافة التحركات المالية والاشتراكات والتعديلات هنا تلقائياً</p>
                </div>
            `;
            return;
        }

        const typeConfig = {
            customer: { label: 'مشتركين', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>' },
            sale: { label: 'مبيعات', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>' },
            expense: { label: 'مصاريف', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>' },
            credit: { label: 'كريدي', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>' },
            payout: { label: 'خلاص عمال', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' },
            supplier: { label: 'موردين', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 011 1v1M13 16h2.586a1 1 0 00.707-.293l3.414-3.414a1 1 0 00.293-.707V10a1 1 0 00-1-1h-1"></path></svg>' },
            caisse: { label: 'جرد خزينة', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>' },
            system: { label: 'النظام', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>' }
        };

        container.innerHTML = logs.map(item => {
            const safeId = escapeHTML(item.id || '');
            const cfg = typeConfig[item.type] || typeConfig.system;
            const dateObj = new Date(item.timestamp || Date.now());
            const formattedDate = isNaN(dateObj.getTime()) 
                ? (item.dateStr || '') 
                : dateObj.toLocaleDateString('ar-DZ') + ' - ' + dateObj.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

            const amt = Number(item.amount) || 0;
            const amtBadge = amt > 0 
                ? `<span class="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-extrabold text-xs shrink-0 dir-ltr">${amt.toLocaleString()} دج</span>` 
                : '';

            return `
            <div class="p-3 sm:p-4 bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl shadow-2xs transition-all w-full min-w-0 overflow-hidden space-y-2">
                <!-- Top Row: Icon, Category Badge, Title, Amount & Delete Action -->
                <div class="flex items-start justify-between gap-2 min-w-0 w-full">
                    <div class="flex items-start gap-2.5 min-w-0 flex-1">
                        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${cfg.color} border flex items-center justify-center font-bold text-sm sm:text-base shrink-0 mt-0.5">
                            ${cfg.icon}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${cfg.color} border shrink-0">${cfg.label}</span>
                                <h4 class="font-bold text-slate-800 text-xs sm:text-sm break-words leading-snug">${escapeHTML(item.title || '')}</h4>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                        ${amtBadge}
                        <button type="button" onclick="event.stopPropagation(); deleteActivityLog('${safeId}')" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 hover:bg-rose-100 text-slate-400 hover:text-rose-700 border border-slate-200 hover:border-rose-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="حذف من سجل العمليات">
                            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Full Width Details & Timestamp -->
                <div class="w-full min-w-0 text-right dir-rtl">
                    ${formatActivityDetailsHtml(item.details || '', safeId)}
                    <span class="text-[10px] text-slate-400 font-bold block mt-1.5">${formattedDate}</span>
                </div>
            </div>
            `;
        }).join('');
    }
    window.renderActivityLogModal = renderActivityLogModal;

    function deleteActivityLog(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف من سجل العمليات', prompt: 'أدخل كلمة المرور لتأكيد حذف هذا السجل من سجل العمليات العام', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(getState().activityLogs)) return;
            getState().activityLogs = getState().activityLogs.filter(l => String(l && l.id) !== String(id));
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('activityLogs', id);
            }
            saveState();
            showSuccessToast('تم حذف السجل من سجل العمليات بنجاح');
            renderActivityLogModal();
        });
    }
    window.deleteActivityLog = deleteActivityLog;

    function clearAllActivityLogs() {
        promptWithPassword({ title: 'إفراغ سجل العمليات', prompt: 'أدخل كلمة المرور لتأكيد إفراغ سجل العمليات بالكامل', buttonText: 'تأكيد الإفراغ' }, () => {
            getState().activityLogs = [];
            window.appState.activityLogs = [];
            if (window.firebaseDB && window.firebaseRef && window.firebaseRemove) {
                try {
                    window.firebaseRemove(window.firebaseRef(window.firebaseDB, 'v2/activityLogs'));
                } catch(e) {}
            }
            saveState();
            showSuccessToast('تم إفراغ سجل العمليات بالكامل بنجاح');
            renderActivityLogModal();
        });
    }
    window.clearAllActivityLogs = clearAllActivityLogs;


return { openActivityLogModal, renderActivityLogModal, deleteActivityLog, clearAllActivityLogs, toggleActivityLogDetail };
}
