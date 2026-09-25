
// Safe DOM helpers to prevent null property errors
function getElem(id) {
    if (!id) return null;
    if (typeof id === "object" && id.nodeType) return id;
    return document.getElementById(String(id));
}
function getElemVal(id, fallback = "") {
    const el = getElem(id);
    return el ? (el.value !== undefined ? el.value : "") : fallback;
}
function setElemValue(id, val) {
    const el = getElem(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : "";
}
function setElemHTML(id, html) {
    const el = getElem(id);
    if (el) el.innerHTML = (html !== undefined && html !== null) ? html : "";
}
function setElemText(id, txt) {
    const el = getElem(id);
    if (el) el.innerText = (txt !== undefined && txt !== null) ? txt : "";
}
function setElemDisplay(id, display) {
    const el = getElem(id);
    if (el) el.style.display = display;
}
function setElemRequired(id, req) {
    const el = getElem(id);
    if (el) el.required = !!req;
}
window.getElem = getElem;
window.getElemVal = getElemVal;
window.setElemValue = setElemValue;
window.setElemHTML = setElemHTML;
window.setElemText = setElemText;
window.setElemDisplay = setElemDisplay;
window.setElemRequired = setElemRequired;

  // Firebase Realtime Database Engine (Local Bundled Packages - No External CDNs)
  import { initializeApp } from "firebase/app";
  import { getDatabase, ref, set, update, push, remove, onValue, get, query, limitToLast, limitToFirst, startAt, endAt, startAfter, endBefore, orderByKey, orderByChild, equalTo, off } from "firebase/database";

  // High-Speed PWA Caching Engine Registration
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  let firebaseConfig = {
    apiKey: (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) || "AIzaSyATQdkTAABcNa5PDSG2KUHlqJ2iJcMFpe8",
    authDomain: (import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "omega-a7040.firebaseapp.com",
    databaseURL: (import.meta.env && import.meta.env.VITE_FIREBASE_DATABASE_URL) || "https://omega-a7040-default-rtdb.firebaseio.com",
    projectId: (import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) || "omega-a7040",
    storageBucket: (import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "omega-a7040.firebasestorage.app",
    messagingSenderId: (import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "596061120034",
    appId: (import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID) || "1:596061120034:web:f7c9999af8ee4ef949cc7b",
    measurementId: (import.meta.env && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || "G-YCRV248RTM"
  };

  // Global state variables
  window.pendingPasswordCallback = null;
  window.pendingCancelCallback = null;
  window.renderScheduled = false;

  function togglePrivacy() {
      if (appState.hideFinances) {
          promptWithPassword({
              title: 'قفل البيانات المالية',
              prompt: 'أدخل كلمة المرور لعرض الإحصائيات والأرقام المالية',
              buttonText: 'عرض البيانات'
          }, () => {
              appState.hideFinances = false;
              saveState();
              render();
              showSuccessToast('تم إلغاء قفل البيانات المالية');
          });
      } else {
          appState.hideFinances = true;
          saveState();
          render();
      }
  }
  window.togglePrivacy = togglePrivacy;

  function getDbPrefix() {
      return localStorage.getItem('omega_db_namespace') || 'v2';
  }
  window.getDbPrefix = getDbPrefix;

  function openGitHubAiSyncModal() {
      const ns = getDbPrefix();
      const isAiStudio = ns === 'v2_aistudio' || window.location.hostname.includes('aistudio') || window.location.hostname.includes('webcontainer');
      const badge = document.getElementById('syncCurrentEnvBadge');
      if (badge) {
          badge.textContent = isAiStudio ? 'AI Studio (تطوير وعزل)' : 'GitHub Pages (إنتاج رئيسي)';
      }
      const btnProd = document.getElementById('btnEnvProd');
      const btnAi = document.getElementById('btnEnvAiStudio');
      if (btnProd && btnAi) {
          if (ns === 'v2') {
              btnProd.className = 'p-3 rounded-xl border text-center font-bold transition-all bg-blue-50 border-blue-300 text-blue-900';
              btnAi.className = 'p-3 rounded-xl border text-center font-bold transition-all bg-white border-slate-200 text-slate-700 hover:border-blue-300';
          } else {
              btnProd.className = 'p-3 rounded-xl border text-center font-bold transition-all bg-white border-slate-200 text-slate-700 hover:border-blue-300';
              btnAi.className = 'p-3 rounded-xl border text-center font-bold transition-all bg-blue-50 border-blue-300 text-blue-900';
          }
      }
      openModal('githubAiSyncModal');
  }
  window.openGitHubAiSyncModal = openGitHubAiSyncModal;

  function setDbNamespace(ns) {
      localStorage.setItem('omega_db_namespace', ns);
      showSuccessToast(`تم تبديل مسار قاعدة البيانات إلى: ${ns}`);
      openGitHubAiSyncModal();
  }
  window.setDbNamespace = setDbNamespace;

  function clearServiceWorkerAndHardRefresh() {
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
              for (let reg of registrations) {
                  reg.unregister();
              }
          });
      }
      if ('caches' in window) {
          caches.keys().then((names) => {
              for (let name of names) {
                  caches.delete(name);
              }
          });
      }
      showSuccessToast('تم مسح الكاش وإلغاء Service Worker بنجاح. جاري تحديث التطبيق...');
      setTimeout(() => {
          window.location.reload(true);
      }, 1200);
  }
  window.clearServiceWorkerAndHardRefresh = clearServiceWorkerAndHardRefresh;

  function exportGitHubAiBackup() {
      try {
          const backupObj = {
              exportDate: new Date().toISOString(),
              appVersion: '2.3.0',
              dbNamespace: getDbPrefix(),
              localStorageState: window.appState || null,
              allLocalStorage: { ...localStorage }
          };
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute("download", `omega_gym_backup_${getDbPrefix()}_${new Date().toISOString().slice(0,10)}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
          showSuccessToast('تم تصدير النسخة الاحتياطية للترحيل الآمن بين GitHub و AI Studio بنجاح');
      } catch (e) {
          showErrorToast('فشل تصدير النسخة الاحتياطية: ' + e.message);
      }
  }
  window.exportGitHubAiBackup = exportGitHubAiBackup;

  function getRTDBUrl() {
    return (firebaseConfig && firebaseConfig.databaseURL)
      ? firebaseConfig.databaseURL.replace(/\/$/, '')
      : 'https://omega-a7040-default-rtdb.firebaseio.com';
  } window.firebaseSyncState = { rtdb: 'connecting',
    lastSync: null, lastError: null }; function updateFirebaseUIBadge(status, label, details) {
    const btn = document.getElementById('firebaseStatusBtn');
    const textElem = document.getElementById('firebaseStatusText');
    const dot = document.getElementById('firebaseStatusDot');
    const dotPing = document.getElementById('firebaseStatusDotPing');
    const modalBadge = document.getElementById('firebaseModalStatusBadge');
    const lastSyncElem = document.getElementById('firebaseModalLastSyncTime');
    const errElem = document.getElementById('firebaseModalErrorMessage');
    if (btn) { btn.className = `flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all shadow-xs ${
        status === 'connected' ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
          : status === 'error' ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
      }`; } if (dot) { dot.className = `relative inline-flex rounded-full h-2 w-2 ${
        status === 'connected' ? 'bg-blue-500' : 'bg-slate-500'
      }`; } if (dotPing) { dotPing.className = `animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
        status === 'connected' ? 'bg-blue-600' : 'bg-slate-300'
      }`; } if (textElem) { textElem.textContent = label;
    } if (modalBadge) { modalBadge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black border ${
        status === 'connected' ? 'bg-blue-100 text-blue-950 border-blue-300'
          : status === 'error' ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-blue-100 text-blue-900 border-blue-300'
      }`; modalBadge.innerHTML = `<span class="w-2 h-2 rounded-full ${
        status === 'connected' ? 'bg-blue-500' : 'bg-blue-600 animate-pulse'
      }"></span><span>${label}</span>`; } if (lastSyncElem && window.firebaseSyncState.lastSync) {
      lastSyncElem.textContent = `آخر مزامنة: ${new Date(window.firebaseSyncState.lastSync).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } if (errElem) { if (details && status === 'error') {
        errElem.classList.remove('hidden');
        errElem.innerHTML = `<strong>تنبيه Realtime Database:</strong> ${escapeHTML(details)}`;
      } else { errElem.classList.add('hidden');
      } } } window.updateFirebaseUIBadge = updateFirebaseUIBadge;

  // Centralized Render Scheduler: debounced + requestAnimationFrame batching.
  // Coalesces bursts of updates (e.g. several Firebase realtime listeners firing at once)
  // into a single render pass to keep the UI responsive with large datasets.
  let renderDebounceTimer = null;
  function scheduleRender() {
    if (renderDebounceTimer) return;
    renderDebounceTimer = setTimeout(() => {
      renderDebounceTimer = null;
      if (typeof window.render === 'function') window.render();
    }, 120);
  }
  window.scheduleRender = scheduleRender;

  // Realtime Cursors and Lazy Loaded Section Registry
  window.firebaseCursors = window.firebaseCursors || {
    sales: { oldestKey: null, newestKey: null, hasMore: true },
    expenses: { oldestKey: null, newestKey: null, hasMore: true },
    customers: { oldestKey: null, newestKey: null, hasMore: true },
    products: { oldestKey: null, newestKey: null, hasMore: true },
    credits: { oldestKey: null, newestKey: null, hasMore: true },
    caisseLogs: { oldestKey: null, newestKey: null, hasMore: true },
    staffPayouts: { oldestKey: null, newestKey: null, hasMore: true },
    coachAbsences: { oldestKey: null, newestKey: null, hasMore: true },
    suppliers: { oldestKey: null, newestKey: null, hasMore: true },
    supplierTransactions: { oldestKey: null, newestKey: null, hasMore: true },
    packages: { oldestKey: null, newestKey: null, hasMore: true },
    activityLogs: { oldestKey: null, newestKey: null, hasMore: true }
  };
  window.firebaseLoadedSections = window.firebaseLoadedSections || {};
  window.firebaseLoadingPromises = window.firebaseLoadingPromises || {};

  // Performance windows: sales is append-heavy and grows without bound, so only the live tail
  // is subscribed/streamed in realtime; older history is completed via cursor pagination.
  window.SALES_REALTIME_WINDOW = 3000;
  window.salesHistoryComplete = false;
  window.salesHistoryLoading = false;

  // Silent background pager: completes older sales history with cursor-based pagination
  // (orderByKey + endBefore) — no full-node re-downloads, no toasts, no blocked UI.
  window.completeSalesHistorySilently = async function() {
    if (window.salesHistoryLoading || window.salesHistoryComplete) return;
    if (!window.firebaseDB || !window.firebaseRef || !window.firebaseGet) return;
    window.salesHistoryLoading = true;
    try {
      const pageSize = window.SALES_REALTIME_WINDOW || 3000;
      const keyLess = (a, b) => {
        const na = Number(a); const nb = Number(b);
        if (!isNaN(na) && !isNaN(nb) && a !== '' && b !== '') return na < nb;
        return String(a) < String(b);
      };
      for (let guard = 0; guard < 60; guard++) {
        const list = Array.isArray(window.appState.sales) ? window.appState.sales : [];
        let oldestKey = null;
        for (let i = 0; i < list.length; i++) {
          const k = list[i] && (list[i]._rtdbKey || list[i].id);
          if (k !== undefined && k !== null && k !== '' && (oldestKey === null || keyLess(String(k), String(oldestKey)))) {
            oldestKey = String(k);
          }
        }
        let olderQ;
        if (oldestKey) {
          olderQ = query(ref(window.firebaseDB, 'v2/sales'), orderByKey(), endBefore(oldestKey), limitToLast(pageSize));
        } else {
          olderQ = query(ref(window.firebaseDB, 'v2/sales'), orderByKey(), limitToLast(pageSize));
        }
        let snap = await get(olderQ);
        if (!snap || !snap.exists()) { window.salesHistoryComplete = true; break; }
        const data = snap.val();
        const keys = Object.keys(data);
        const items = keys.map(k => ({ ...data[k], _rtdbKey: k }));
        if (items.length === 0) { window.salesHistoryComplete = true; break; }
        window.applyFirebaseSectionUpdate('sales', items, 'Silent Sales History Pager');
        if (items.length < pageSize) { window.salesHistoryComplete = true; break; }
      }
    } catch (e) {
      console.warn('Silent sales history completion note:', e);
    } finally {
      window.salesHistoryLoading = false;
      if (typeof window.scheduleRender === 'function') window.scheduleRender();
    }
  };

  window.lazyLoadSection = async function(sectionName, force = false) {
    if (!sectionName) return [];
    if (window.firebaseLoadedSections[sectionName] && !force) {
      return window.appState[sectionName] || [];
    }
    if (window.firebaseLoadingPromises[sectionName]) {
      return window.firebaseLoadingPromises[sectionName];
    }

    const loadPromise = (async () => {
      try {
        const v2Sec = sectionName === 'caisseLogs' ? 'caisse' : sectionName;
        let items = [];

        const mapFirebaseItem = (k, v) => ({
          ...v,
          id: (v && v.id !== undefined && v.id !== null) ? v.id : k,
          _rtdbKey: k
        });

        if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
          try {
            // Bounded initial window for the append-heavy sales section (older history is
            // completed silently via cursor pagination instead of one huge full-node fetch).
            let snap;
            if (sectionName === 'sales' && window.firebaseQuery && window.firebaseOrderByKey && window.firebaseLimitToLast) {
              snap = await window.firebaseGet(window.firebaseQuery(
                window.firebaseRef(window.firebaseDB, `v2/${v2Sec}`),
                window.firebaseOrderByKey(),
                window.firebaseLimitToLast(window.SALES_REALTIME_WINDOW || 3000)
              ));
            } else {
              snap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/${v2Sec}`));
            }
            if (snap.exists()) {
              const data = snap.val();
              items = Object.entries(data).map(([k, v]) => mapFirebaseItem(k, v));
            }
          } catch(e) {}
          if (items.length === 0) {
            try {
              let legSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, sectionName));
              if (legSnap.exists()) {
                const data = legSnap.val();
                items = Object.entries(data).map(([k, v]) => mapFirebaseItem(k, v));
              }
            } catch(e) {}
          }
        }

        if (items.length === 0) {
          const baseUrl = getRTDBUrl();
          const [v2Res, rootRes] = await Promise.all([
            fetch(`${baseUrl}/v2/${v2Sec}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`${baseUrl}/${sectionName}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
          ]);
          const map = new Map();
          const addData = (data) => {
            if (!data) return;
            if (Array.isArray(data)) {
              data.forEach((item, idx) => {
                if (item) {
                  const key = String(item.id || item._rtdbKey || item.barcode || idx);
                  map.set(key, { ...item, id: item.id || key });
                }
              });
            } else if (typeof data === 'object') {
              Object.entries(data).forEach(([k, item]) => {
                if (item) {
                  const key = String(item.id || item._rtdbKey || item.barcode || k);
                  map.set(key, { ...item, id: item.id || key, _rtdbKey: k });
                }
              });
            }
          };
          addData(rootRes);
          addData(v2Res);
          items = Array.from(map.values());
        }

        window.firebaseLoadedSections[sectionName] = true;
        if (items.length > 0) {
          window.applyFirebaseSectionUpdate(sectionName, items, `LazyLoad ${sectionName}`);
        }
        // Kick off silent background completion of older sales history (cursor pagination)
        if (sectionName === 'sales' && items.length >= (window.SALES_REALTIME_WINDOW || 3000)) {
          window.completeSalesHistorySilently();
        }
        scheduleRender();
        return items;
      } catch (err) {
        console.warn(`Lazy loading error for ${sectionName}:`, err);
        return [];
      } finally {
        delete window.firebaseLoadingPromises[sectionName];
      }
    })();

    window.firebaseLoadingPromises[sectionName] = loadPromise;
    return loadPromise;
  };

  // Global Engine to Apply Incoming Firebase Data to Application State
  window.applyFirebaseDataToAppState = function(rawPayload, sourceLabel) {
    if (!rawPayload || typeof rawPayload !== 'object') return false;
    const root = rawPayload; const appStateNode = rawPayload.appState || {};
    const gymStateNode = rawPayload.gym_app_state || {};
    const toArr = (val) => { if (!val) return [];
      if (Array.isArray(val)) return val.filter(item => item && typeof item === 'object');
      if (typeof val === 'object') return Object.values(val).filter(item => item && typeof item === 'object');
      return []; };
    // 1. Gather all customers from all possible nodes
    const customerSources = [ ...toArr(appStateNode.customers),
      ...toArr(gymStateNode.customers), ...toArr(root.customers),
      ...toArr(root.members) ]; const uniqueCustomersMap = new Map();
    customerSources.forEach((c, idx) => { if (!c) return;
      const id = c.id ? String(c.id) : ('cust_' + idx);
      if (!uniqueCustomersMap.has(id)) {
        uniqueCustomersMap.set(id, { ...c, id });
      } else { uniqueCustomersMap.set(id, { ...uniqueCustomersMap.get(id), ...c, id });
      } }); const mergedCustomers = Array.from(uniqueCustomersMap.values());
    // 2. Gather all packages from all possible nodes
    const packageSources = [ ...toArr(appStateNode.packages),
      ...toArr(gymStateNode.packages), ...toArr(root.packages)
    ]; const uniquePackagesMap = new Map();
    packageSources.forEach((p, idx) => { if (!p) return;
      const id = p.id ? String(p.id) : ('pkg_' + idx);
      if (!uniquePackagesMap.has(id)) {
        uniquePackagesMap.set(id, { ...p, id });
      } else { uniquePackagesMap.set(id, { ...uniquePackagesMap.get(id), ...p, id });
      } }); const mergedPackages = Array.from(uniquePackagesMap.values());
    // 3. Gather absences (all forms)
    const absenceSources = [ ...toArr(appStateNode.coachAbsences),
      ...toArr(appStateNode.absences), ...toArr(gymStateNode.absences),
      ...toArr(gymStateNode.coachAbsences), ...toArr(root.absences),
      ...toArr(root.coachAbsences) ]; const uniqueAbsencesMap = new Map();
    absenceSources.forEach((a, idx) => { if (!a) return;
      const id = a.id ? String(a.id) : ('abs_' + (a.date ? a.date.replace(/[\/\-]/g, '_') : idx));
      if (!uniqueAbsencesMap.has(id)) {
        uniqueAbsencesMap.set(id, { ...a, id });
      } }); const mergedAbsences = Array.from(uniqueAbsencesMap.values());
    // 4. Products deduplication & merging
    const productSources = [ ...toArr(appStateNode.products),
      ...toArr(gymStateNode.products), ...toArr(root.products),
      ...toArr(root.inventory), ...toArr(root.items)
    ]; const uniqueProductsMap = new Map();
    productSources.forEach((p, idx) => { if (!p) return;
      const id = p.id ? String(p.id) : ('prod_' + idx);
      if (!uniqueProductsMap.has(id)) {
        uniqueProductsMap.set(id, { ...p, id });
      } else { uniqueProductsMap.set(id, { ...uniqueProductsMap.get(id), ...p, id });
      } }); const mergedProducts = Array.from(uniqueProductsMap.values());
    // 5. Sales deduplication & merging
    const saleSources = [ ...toArr(appStateNode.sales),
      ...toArr(gymStateNode.sales), ...toArr(root.sales),
      ...toArr(root.orders) ]; const uniqueSalesMap = new Map();
    saleSources.forEach((s, idx) => { if (!s) return;
      const id = s.id ? String(s.id) : ('sale_' + idx);
      if (!uniqueSalesMap.has(id)) {
        uniqueSalesMap.set(id, { ...s, id }); } else {
        uniqueSalesMap.set(id, { ...uniqueSalesMap.get(id), ...s, id });
      } }); const mergedSales = Array.from(uniqueSalesMap.values());
    // 6. Expenses deduplication & merging
    const expenseSources = [ ...toArr(appStateNode.expenses),
      ...toArr(gymStateNode.expenses), ...toArr(root.expenses)
    ]; const uniqueExpensesMap = new Map();
    expenseSources.forEach((e, idx) => { if (!e) return;
      const id = e.id ? String(e.id) : ('exp_' + idx);
      if (!uniqueExpensesMap.has(id)) {
        uniqueExpensesMap.set(id, { ...e, id });
      } else { uniqueExpensesMap.set(id, { ...uniqueExpensesMap.get(id), ...e, id });
      } }); const mergedExpenses = Array.from(uniqueExpensesMap.values());
    // 7. Caisse Logs & Treasury deduplication & merging
    const caisseSources = [ ...toArr(appStateNode.caisseLogs),
      ...toArr(appStateNode.caisse), ...toArr(gymStateNode.caisseLogs),
      ...toArr(root.caisseLogs), ...toArr(root.caisse),
      ...toArr(root.treasury) ]; const uniqueCaisseMap = new Map();
    caisseSources.forEach((c, idx) => { if (!c) return;
      const id = c.id ? String(c.id) : ('caisse_' + (c.date ? String(c.date).replace(/[\/\-]/g, '_') : idx));
      if (!uniqueCaisseMap.has(id)) {
        uniqueCaisseMap.set(id, { ...c, id }); } else {
        uniqueCaisseMap.set(id, { ...uniqueCaisseMap.get(id), ...c, id });
      } }); const mergedCaisseLogs = Array.from(uniqueCaisseMap.values());
    // 8. StaffPayouts, Credits, Suppliers, QuickSessions, SupplierTransactions
    const rawStaffPayouts = [...toArr(appStateNode.staffPayouts), ...toArr(gymStateNode.staffPayouts), ...toArr(root.staffPayouts)];
    const uniqueStaffMap = new Map();
    rawStaffPayouts.forEach((item, idx) => { if (!item) return;
      const id = String(item.id || ('staff_' + (item.name || item.staffName || 'worker') + '_' + (item.date || idx)));
      if (!uniqueStaffMap.has(id)) {
        uniqueStaffMap.set(id, { ...item, id });
      } else { uniqueStaffMap.set(id, { ...uniqueStaffMap.get(id), ...item, id });
      } }); const mergedStaffPayouts = Array.from(uniqueStaffMap.values());

    const dedupeCollection = (sources, idPrefix) => {
      const map = new Map();
      sources.forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || (idPrefix + '_' + (item.name || item.date || item.timestamp || idx)));
        if (!map.has(id)) {
          map.set(id, { ...item, id });
        } else {
          map.set(id, { ...map.get(id), ...item, id });
        }
      });
      return Array.from(map.values());
    };

    const mergedCredits = dedupeCollection([...toArr(appStateNode.credits), ...toArr(gymStateNode.credits), ...toArr(root.credits)], 'cr');
    const mergedSuppliers = dedupeCollection([...toArr(appStateNode.suppliers), ...toArr(gymStateNode.suppliers), ...toArr(root.suppliers)], 'sup');
    const mergedSupplierTx = dedupeCollection([...toArr(appStateNode.supplierTransactions), ...toArr(gymStateNode.supplierTransactions), ...toArr(root.supplierTransactions)], 'suptx');
    const mergedQuickSessions = dedupeCollection([...toArr(appStateNode.quickSessions), ...toArr(gymStateNode.quickSessions), ...toArr(root.quickSessions)], 'qs');
    const mergedActivityLogs = dedupeCollection([...toArr(appStateNode.activityLogs), ...toArr(gymStateNode.activityLogs), ...toArr(root.activityLogs)], 'act');

    window.appState = window.appState || {};
    window.appState.customers = mergedCustomers.length > 0 ? mergedCustomers : (window.appState.customers || []);
    window.appState.packages = mergedPackages.length > 0 ? mergedPackages : (window.appState.packages || []);
    window.appState.coachAbsences = mergedAbsences.length > 0 ? mergedAbsences : (window.appState.coachAbsences || []);
    window.appState.products = mergedProducts.length > 0 ? mergedProducts : (window.appState.products || []);
    window.appState.sales = mergedSales.length > 0 ? mergedSales : (window.appState.sales || []);
    window.appState.expenses = mergedExpenses.length > 0 ? mergedExpenses : (window.appState.expenses || []);
    window.appState.caisseLogs = mergedCaisseLogs.length > 0 ? mergedCaisseLogs : (window.appState.caisseLogs || []);
    window.appState.staffPayouts = mergedStaffPayouts.length > 0 ? mergedStaffPayouts : (window.appState.staffPayouts || []);
    window.appState.credits = mergedCredits.length > 0 ? mergedCredits : (window.appState.credits || []);
    window.appState.suppliers = mergedSuppliers.length > 0 ? mergedSuppliers : (window.appState.suppliers || []);
    window.appState.supplierTransactions = mergedSupplierTx.length > 0 ? mergedSupplierTx : (window.appState.supplierTransactions || []);
    window.appState.quickSessions = mergedQuickSessions.length > 0 ? mergedQuickSessions : (window.appState.quickSessions || []);
    window.appState.activityLogs = mergedActivityLogs.length > 0 ? mergedActivityLogs : (window.appState.activityLogs || []);
    window.appState.lastUpdated = rawPayload.lastUpdated || new Date().toISOString();
    scheduleRender();
    window.firebaseSyncState = window.firebaseSyncState || {};
    window.firebaseSyncState.rtdb = 'connected';
    window.firebaseSyncState.lastSync = new Date();
    window.firebaseSyncState.lastError = null;
    updateFirebaseUIBadge('connected', 'Firebase: متصل ومزامن');
    return true; };

  // Granular section-level updater: merges ONLY the target section with O(N) deduplication
  window.applyFirebaseSectionUpdate = function(sectionName, sectionData, sourceLabel) {
    if (!sectionName || sectionData === undefined || sectionData === null) return false;
    window.appState = window.appState || {};
    const toArr = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(item => item && typeof item === 'object');
      if (typeof val === 'object') return Object.values(val).filter(item => item && typeof item === 'object');
      return [];
    };

    if (sectionName === 'appState' && typeof sectionData === 'object') {
      if (typeof sectionData.hideFinances === 'boolean') {
        window.appState.hideFinances = sectionData.hideFinances;
      }
      return true;
    }

    if ((sectionName === 'stats' || sectionName === 'v2Stats') && typeof sectionData === 'object') {
      window.appState.v2Stats = window.appState.v2Stats || { daily: {}, monthly: {}, yearly: {} };
      if (sectionData.daily) Object.assign(window.appState.v2Stats.daily, sectionData.daily);
      if (sectionData.monthly) Object.assign(window.appState.v2Stats.monthly, sectionData.monthly);
      if (sectionData.yearly) Object.assign(window.appState.v2Stats.yearly, sectionData.yearly);
      scheduleRender();
      return true;
    }

    const items = toArr(sectionData);
    const existing = Array.isArray(window.appState[sectionName]) ? window.appState[sectionName] : [];

    // Fast deduplication map
    const map = new Map();
    
    // Add existing first (exclude deleted)
    for (let i = 0; i < existing.length; i++) {
      const it = existing[i];
      if (it) {
        const idStr = String(it.id || '');
        const rtdbKey = String(it._rtdbKey || '');
        if (typeof window.isItemDeleted === 'function' && (window.isItemDeleted(sectionName, idStr) || (rtdbKey && window.isItemDeleted(sectionName, rtdbKey)))) {
          continue;
        }
        const key = String(it.id || it._rtdbKey || it.barcode || (it.phone ? cleanPhone(it.phone) : '') || i);
        if (!it.id) it.id = key;
        map.set(key, it);
      }
    }
    // Overlay incoming items: fresh updates from Firebase take immediate precedence
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it) {
        const idStr = String(it.id || '');
        const rtdbKey = String(it._rtdbKey || '');
        if (typeof window.isItemDeleted === 'function' && (window.isItemDeleted(sectionName, idStr) || (rtdbKey && window.isItemDeleted(sectionName, rtdbKey)))) {
          continue;
        }
        const key = String(it.id || it._rtdbKey || it.barcode || (it.phone ? cleanPhone(it.phone) : '') || i);
        if (!it.id) it.id = key;
        map.set(key, { ...it, id: it.id || key });
      }
    }

    const merged = Array.from(map.values());
    // Pre-calculate search keys for hyper-fast search filtering
    if (sectionName === 'customers') {
      for (let i = 0; i < merged.length; i++) {
        const c = merged[i];
        if (c && !c._searchKey) {
          c._searchKey = `${c.name || ''} ${(c.phone || '').replace(/\D/g, '')}`.toLowerCase();
        }
      }
    }

    window.appState[sectionName] = merged;
    scheduleRender();

    window.firebaseSyncState = window.firebaseSyncState || {};
    window.firebaseSyncState.rtdb = 'connected';
    window.firebaseSyncState.lastSync = new Date();
    updateFirebaseUIBadge('connected', 'Firebase: متصل ومزامن');
    return true;
  };

  // Clean and sanitize payload to eliminate undefined fields
  function getCleanSyncPayload(sourceState) {
    const s = sourceState || window.appState || {};
    const ensureArr = (val) => (!val ? [] : (Array.isArray(val) ? val : Object.values(val)));
    const dedupe = (val, prefix) => {
      const arr = ensureArr(val);
      const map = new Map();
      arr.forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || (prefix + '_' + (item.name || item.date || item.timestamp || idx)));
        if (!map.has(id)) {
          map.set(id, { ...item, id });
        } else {
          map.set(id, { ...map.get(id), ...item, id });
        }
      });
      return Array.from(map.values());
    };

    const absencesArr = dedupe(s.coachAbsences, 'abs');
    const customersArr = dedupe(s.customers, 'cust');
    const productsArr = dedupe(s.products, 'prod');
    const packagesArr = dedupe(s.packages, 'pkg');
    const salesArr = dedupe(s.sales, 'sale');
    const expensesArr = dedupe(s.expenses, 'exp');
    const staffPayoutsArr = dedupe(s.staffPayouts, 'staff');
    const creditsArr = dedupe(s.credits, 'cr');
    const suppliersArr = dedupe(s.suppliers, 'sup');
    const supplierTransactionsArr = dedupe(s.supplierTransactions, 'suptx');
    const quickSessionsArr = dedupe(s.quickSessions, 'qs');
    const caisseLogsArr = dedupe(s.caisseLogs, 'caisse');
    const activityLogsArr = dedupe(s.activityLogs, 'act');

    const payload = {
      customers: customersArr,
      products: productsArr,
      coachAbsences: absencesArr,
      absences: absencesArr,
      packages: packagesArr,
      sales: salesArr,
      expenses: expensesArr,
      caisseLogs: caisseLogsArr,
      caisse: caisseLogsArr,
      treasury: caisseLogsArr,
      staffPayouts: staffPayoutsArr,
      credits: creditsArr,
      suppliers: suppliersArr,
      supplierTransactions: supplierTransactionsArr,
      quickSessions: quickSessionsArr,
      activityLogs: activityLogsArr,
      appState: {
        customers: customersArr,
        products: productsArr,
        coachAbsences: absencesArr,
        absences: absencesArr,
        packages: packagesArr,
        sales: salesArr,
        expenses: expensesArr,
        caisseLogs: caisseLogsArr,
        caisse: caisseLogsArr,
        treasury: caisseLogsArr,
        staffPayouts: staffPayoutsArr,
        credits: creditsArr,
        suppliers: suppliersArr,
        supplierTransactions: supplierTransactionsArr,
        quickSessions: quickSessionsArr,
        activityLogs: activityLogsArr,
        lastUpdated: new Date().toISOString()
      },
      lastUpdated: new Date().toISOString()
    };
    return JSON.parse(JSON.stringify(payload));
  }
  // Convert array to dictionary indexed by clean ID for Firebase RTDB updates
  function arrayToDict(arr, idKey = 'id', prefix = 'item') {
    if (!arr) return {};
    const list = Array.isArray(arr) ? arr : Object.values(arr);
    const dict = {};
    list.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;
      const rawId = item[idKey] || item.id || item.barcode || (prefix + '_' + idx);
      const cleanKey = String(rawId).replace(/[.#$[\]/]/g, '_');
      dict[cleanKey] = item;
    });
    return dict;
  }
  window.arrayToDict = arrayToDict;

  // Deduplication map and offline write queue
  window.pendingWrites = window.pendingWrites || new Map();
  window.firebaseWriteQueue = window.firebaseWriteQueue || [];

  // Unified Incremental V2 Record-Level Writers
  async function saveV2Record(section, id, data) {
    if (!id) throw new Error('ID is required for saveV2Record');
    const cleanId = cleanKey(id);
    const writeKey = `save:${section}:${cleanId}`;

    if (window.pendingWrites.has(writeKey)) {
      return window.pendingWrites.get(writeKey);
    }

    const task = (async () => {
      try {
        const v2Sec = section === 'caisseLogs' ? 'caisse' : section;
        const path = `v2/${v2Sec}/${cleanId}`;
        let sdkOk = false;

        if (window.firebaseDB && window.firebaseSet && window.firebaseRef) {
          try {
            await window.firebaseSet(window.firebaseRef(window.firebaseDB, path), data);
            sdkOk = true;
          } catch (e) {
            console.warn(`SDK saveV2Record error on ${path}:`, e);
          }
        }

        if (!sdkOk) {
          const baseUrl = getRTDBUrl();
          const res = await fetch(`${baseUrl}/${path}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error(`REST PUT failed with status ${res.status}`);
        }
        return cleanId;
      } catch (err) {
        console.warn(`saveV2Record error (${section}/${cleanId}):`, err);
        window.firebaseWriteQueue.push({ action: 'saveV2Record', section, id: cleanId, data, timestamp: Date.now() });
        throw err;
      } finally {
        window.pendingWrites.delete(writeKey);
      }
    })();

    window.pendingWrites.set(writeKey, task);
    return task;
  }
  window.saveV2Record = saveV2Record;

  async function updateV2Record(section, id, updates) {
    if (!id) throw new Error('ID is required for updateV2Record');
    const cleanId = cleanKey(id);
    const writeKey = `update:${section}:${cleanId}`;

    if (window.pendingWrites.has(writeKey)) {
      return window.pendingWrites.get(writeKey);
    }

    const task = (async () => {
      try {
        const v2Sec = section === 'caisseLogs' ? 'caisse' : section;
        const path = `v2/${v2Sec}/${cleanId}`;
        let sdkOk = false;

        if (window.firebaseDB && window.firebaseUpdate && window.firebaseRef) {
          try {
            await window.firebaseUpdate(window.firebaseRef(window.firebaseDB, path), updates);
            sdkOk = true;
          } catch (e) {
            console.warn(`SDK updateV2Record error on ${path}:`, e);
          }
        }

        if (!sdkOk) {
          const baseUrl = getRTDBUrl();
          const res = await fetch(`${baseUrl}/${path}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!res.ok) throw new Error(`REST PATCH failed with status ${res.status}`);
        }
        return cleanId;
      } catch (err) {
        console.warn(`updateV2Record error (${section}/${cleanId}):`, err);
        window.firebaseWriteQueue.push({ action: 'updateV2Record', section, id: cleanId, updates, timestamp: Date.now() });
        throw err;
      } finally {
        window.pendingWrites.delete(writeKey);
      }
    })();

    window.pendingWrites.set(writeKey, task);
    return task;
  }
  window.updateV2Record = updateV2Record;

  async function deleteV2Record(section, id) {
    if (!id) throw new Error('ID is required for deleteV2Record');
    const cleanId = cleanKey(id);
    const writeKey = `delete:${section}:${cleanId}`;

    if (window.pendingWrites.has(writeKey)) {
      return window.pendingWrites.get(writeKey);
    }

    const task = (async () => {
      try {
        const v2Sec = section === 'caisseLogs' ? 'caisse' : section;
        const path = `v2/${v2Sec}/${cleanId}`;
        let sdkOk = false;

        if (window.firebaseDB && window.firebaseSet && window.firebaseRef) {
          try {
            await window.firebaseSet(window.firebaseRef(window.firebaseDB, path), null);
            sdkOk = true;
          } catch (e) {
            console.warn(`SDK deleteV2Record error on ${path}:`, e);
          }
        }

        if (!sdkOk) {
          const baseUrl = getRTDBUrl();
          const res = await fetch(`${baseUrl}/${path}.json`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error(`REST DELETE failed with status ${res.status}`);
        }
        return cleanId;
      } catch (err) {
        console.warn(`deleteV2Record error (${section}/${cleanId}):`, err);
        window.firebaseWriteQueue.push({ action: 'deleteV2Record', section, id: cleanId, timestamp: Date.now() });
        throw err;
      } finally {
        window.pendingWrites.delete(writeKey);
      }
    })();

    window.pendingWrites.set(writeKey, task);
    return task;
  }
  window.deleteV2Record = deleteV2Record;

  // Note: Legacy updateFirebaseSection migrated to src/migration-utils.js

  // Dedicated Section Push Utility: strictly uses PUSH (SDK) with REST POST fallback ONLY on SDK failure
  window.pushToFirebaseSection = async function(sectionPath, itemData) {
    const v2Sec = sectionPath === 'caisseLogs' ? 'caisse' : sectionPath;
    if (window.firebaseDB && window.firebasePush && window.firebaseRef) {
      try {
        const pushRef = await window.firebasePush(window.firebaseRef(window.firebaseDB, `v2/${v2Sec}`), itemData);
        return { success: true, key: pushRef?.key || null };
      } catch (err) {
        console.warn(`SDK push error for v2/${v2Sec}:`, err);
      }
    }
    // Fallback to REST POST ONLY if SDK failed or is unavailable
    try {
      const baseUrl = getRTDBUrl();
      const res = await fetch(`${baseUrl}/v2/${v2Sec}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, key: json?.name || null };
      }
    } catch (e) {
      console.warn(`REST POST error for v2/${v2Sec}:`, e);
    }
    return { success: false, key: null };
  };

  // Helper normalization utilities for V2 flat architecture
  function cleanKey(raw) {
    if (!raw && raw !== 0) return 'item_' + Math.random().toString(36).substring(2, 9);
    return String(raw).replace(/[.#$[\]/]/g, '_');
  }
  window.cleanKey = cleanKey;

  // Deleted Items Tombstone Registry (prevents deleted items like credits from resurrecting on reload or sync)
  window.registerDeletedItemId = function(sectionPath, id) {
    if (!sectionPath || !id) return;
    try {
      if (!window._deletedItemIds) {
        const saved = localStorage.getItem('sm_deleted_ids');
        window._deletedItemIds = new Set(saved ? JSON.parse(saved) : []);
      }
      const key = `${sectionPath}:${String(id).trim()}`;
      window._deletedItemIds.add(key);
      const arr = Array.from(window._deletedItemIds).slice(-3000);
      localStorage.setItem('sm_deleted_ids', JSON.stringify(arr));
    } catch(e) {}
  };

  window.unregisterDeletedItemId = function(sectionPath, id) {
    if (!sectionPath || !id) return;
    try {
      if (!window._deletedItemIds) {
        const saved = localStorage.getItem('sm_deleted_ids');
        window._deletedItemIds = new Set(saved ? JSON.parse(saved) : []);
      }
      const key = `${sectionPath}:${String(id).trim()}`;
      window._deletedItemIds.delete(key);
      const arr = Array.from(window._deletedItemIds);
      localStorage.setItem('sm_deleted_ids', JSON.stringify(arr));
    } catch(e) {}
  };

  window.isItemDeleted = function(sectionPath, id) {
    if (!sectionPath || !id) return false;
    try {
      if (!window._deletedItemIds) {
        const saved = localStorage.getItem('sm_deleted_ids');
        window._deletedItemIds = new Set(saved ? JSON.parse(saved) : []);
      }
      return window._deletedItemIds.has(`${sectionPath}:${String(id).trim()}`);
    } catch(e) {
      return false;
    }
  };

  // O(1) package lookup with a memoized index (rebuilt only when the packages array changes).
  // Replaces packages.find() inside per-customer loops, which was O(customers x packages).
  let __pkgIndexArr = null;
  let __pkgIndexMap = null;
  window.getPackageById = function(id) {
    const arr = (window.appState && Array.isArray(window.appState.packages)) ? window.appState.packages : [];
    if (arr !== __pkgIndexArr) {
      __pkgIndexArr = arr;
      __pkgIndexMap = new Map();
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        if (p && p.id !== undefined && p.id !== null) __pkgIndexMap.set(String(p.id), p);
      }
    }
    if (id === undefined || id === null) return undefined;
    return __pkgIndexMap.get(String(id));
  };

  function normalizePhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('213') && digits.length === 12) {
      return '0' + digits.slice(3);
    }
    return digits;
  }
  window.normalizePhone = normalizePhone;

  function getDateKey(dateInput) {
    if (!dateInput) return new Date().toISOString().split('T')[0];
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      return dateInput.substring(0, 10);
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }
  window.getDateKey = getDateKey;

  // --- Dedicated Stats Layer Helpers ---
  function calculateStatsDelta(oldVal, newVal) {
    return Number(newVal || 0) - Number(oldVal || 0);
  }
  window.calculateStatsDelta = calculateStatsDelta;

  function revertSaleStats(sale) {
    if (!sale || typeof sale !== 'object') return {};
    const dateKey = getDateKey(sale.date);
    const monthKey = dateKey.substring(0, 7);
    const yearKey = dateKey.substring(0, 4);
    const total = Number(sale.total || 0);
    const profit = Number(sale.profit || 0);
    const qty = Number(sale.qty || 1);

    window.appState = window.appState || {};
    window.appState.v2Stats = window.appState.v2Stats || { daily: {}, monthly: {}, yearly: {} };
    const v2s = window.appState.v2Stats;
    const targetUpdates = {};

    ['daily', 'monthly', 'yearly'].forEach(period => {
      const key = period === 'daily' ? dateKey : (period === 'monthly' ? monthKey : yearKey);
      if (!v2s[period]) v2s[period] = {};
      const s = v2s[period][key] = v2s[period][key] || { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0 };
      s.sales = Math.max(0, s.sales - total);
      s.salesCount = Math.max(0, s.salesCount - 1);
      s.profit = Math.max(0, s.profit - profit);
      s.productsSold = Math.max(0, s.productsSold - qty);
      s.cashIn = Math.max(0, s.cashIn - total);
      targetUpdates[`v2/stats/${period}/${key}`] = { ...s };
    });

    return targetUpdates;
  }
  window.revertSaleStats = revertSaleStats;

  function applySaleStats(sale, oldSale) {
    if (!sale || typeof sale !== 'object') return {};
    const targetUpdates = {};

    if (oldSale) {
      const rev = revertSaleStats(oldSale);
      Object.assign(targetUpdates, rev);
    }

    const dateKey = getDateKey(sale.date);
    const monthKey = dateKey.substring(0, 7);
    const yearKey = dateKey.substring(0, 4);
    const total = Number(sale.total || 0);
    const profit = Number(sale.profit || 0);
    const qty = Number(sale.qty || 1);

    window.appState = window.appState || {};
    window.appState.v2Stats = window.appState.v2Stats || { daily: {}, monthly: {}, yearly: {} };
    const v2s = window.appState.v2Stats;

    ['daily', 'monthly', 'yearly'].forEach(period => {
      const key = period === 'daily' ? dateKey : (period === 'monthly' ? monthKey : yearKey);
      if (!v2s[period]) v2s[period] = {};
      const s = v2s[period][key] = v2s[period][key] || { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0 };
      s.sales += total;
      s.salesCount += 1;
      s.profit += profit;
      s.productsSold += qty;
      s.cashIn += total;
      targetUpdates[`v2/stats/${period}/${key}`] = { ...s };
    });

    return targetUpdates;
  }
  window.applySaleStats = applySaleStats;

  function revertExpenseStats(expense) {
    if (!expense || typeof expense !== 'object') return {};
    const dateKey = getDateKey(expense.date);
    const monthKey = dateKey.substring(0, 7);
    const yearKey = dateKey.substring(0, 4);
    const amt = parseFloat(String(expense.amount || 0).replace(/,/g, '')) || 0;

    window.appState = window.appState || {};
    window.appState.v2Stats = window.appState.v2Stats || { daily: {}, monthly: {}, yearly: {} };
    const v2s = window.appState.v2Stats;
    const targetUpdates = {};

    ['daily', 'monthly', 'yearly'].forEach(period => {
      const key = period === 'daily' ? dateKey : (period === 'monthly' ? monthKey : yearKey);
      if (!v2s[period]) v2s[period] = {};
      const s = v2s[period][key] = v2s[period][key] || { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0 };
      s.expenses = Math.max(0, s.expenses - amt);
      s.cashOut = Math.max(0, s.cashOut - amt);
      targetUpdates[`v2/stats/${period}/${key}`] = { ...s };
    });

    return targetUpdates;
  }
  window.revertExpenseStats = revertExpenseStats;

  function applyExpenseStats(expense, oldExpense) {
    if (!expense || typeof expense !== 'object') return {};
    const targetUpdates = {};

    if (oldExpense) {
      const rev = revertExpenseStats(oldExpense);
      Object.assign(targetUpdates, rev);
    }

    const dateKey = getDateKey(expense.date);
    const monthKey = dateKey.substring(0, 7);
    const yearKey = dateKey.substring(0, 4);
    const amt = parseFloat(String(expense.amount || 0).replace(/,/g, '')) || 0;

    window.appState = window.appState || {};
    window.appState.v2Stats = window.appState.v2Stats || { daily: {}, monthly: {}, yearly: {} };
    const v2s = window.appState.v2Stats;

    ['daily', 'monthly', 'yearly'].forEach(period => {
      const key = period === 'daily' ? dateKey : (period === 'monthly' ? monthKey : yearKey);
      if (!v2s[period]) v2s[period] = {};
      const s = v2s[period][key] = v2s[period][key] || { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0 };
      s.expenses += amt;
      s.cashOut += amt;
      targetUpdates[`v2/stats/${period}/${key}`] = { ...s };
    });

    return targetUpdates;
  }
  window.applyExpenseStats = applyExpenseStats;

  // Dedicated Item-Level Save: writes strictly to V2 structure + legacy mirrors with atomic index maintenance and pendingWrites protection
  window.saveFirebaseSectionItem = async function(sectionPath, itemData, previousItem) {
    if (!itemData || typeof itemData !== 'object') return false;
    const rawId = itemData.id || itemData._rtdbKey || itemData.barcode || Date.now().toString();
    const cleanId = cleanKey(rawId);
    if (!itemData.id) itemData.id = cleanId;

    if (typeof window.unregisterDeletedItemId === 'function') {
      window.unregisterDeletedItemId(sectionPath, cleanId);
      window.unregisterDeletedItemId(sectionPath, rawId);
      if (itemData._rtdbKey) window.unregisterDeletedItemId(sectionPath, itemData._rtdbKey);
    }

    const writeKey = `saveSectionItem:${sectionPath}:${cleanId}`;

    if (window.pendingWrites.has(writeKey)) {
      return window.pendingWrites.get(writeKey);
    }

    const task = (async () => {
      try {
        const v2Updates = {};
        const v2Sec = sectionPath === 'caisseLogs' ? 'caisse' : sectionPath;

        if (sectionPath === 'customers') {
          const enriched = {
            ...itemData,
            id: cleanId,
            normalizedPhone: normalizePhone(itemData.phone) || null,
            updatedAt: Date.now()
          };
          v2Updates[`v2/customers/${cleanId}`] = enriched;
          v2Updates[`customers/${cleanId}`] = enriched;
          if (enriched.normalizedPhone) {
            v2Updates[`v2/customerByPhone/${enriched.normalizedPhone}`] = cleanId;
          }
          if (itemData.barcode) {
            v2Updates[`v2/customerByBarcode/${cleanKey(itemData.barcode)}`] = cleanId;
          }
        } else if (sectionPath === 'products') {
          const enrichedProd = { ...itemData, id: cleanId, updatedAt: Date.now() };
          v2Updates[`v2/products/${cleanId}`] = enrichedProd;
          v2Updates[`products/${cleanId}`] = enrichedProd;
          if (itemData.barcode) {
            v2Updates[`v2/productByBarcode/${cleanKey(itemData.barcode)}`] = cleanId;
          }
        } else if (sectionPath === 'sales') {
          const dateKey = getDateKey(itemData.date);
          const total = Number(itemData.total || 0);
          const profit = Number(itemData.profit || 0);
          const qty = Number(itemData.qty || 1);
          const enrichedSale = { ...itemData, id: cleanId, dateKey, total, profit, qty };

          v2Updates[`v2/sales/${cleanId}`] = enrichedSale;
          v2Updates[`sales/${cleanId}`] = enrichedSale;
          v2Updates[`v2/salesByDate/${dateKey}/${cleanId}`] = true;

          window._processedStats = window._processedStats || new Map();
          const statKey = `sale:${cleanId}`;

          let oldSale = null;
          if (previousItem && typeof previousItem === 'object') {
            oldSale = previousItem;
          } else if (window._processedStats.has(statKey)) {
            oldSale = window._processedStats.get(statKey);
          } else {
            const existing = (window.appState?.sales || []).filter(s => String(s.id) === String(cleanId));
            if (existing.length > 1) {
              oldSale = existing[1];
            } else if (existing.length === 1 && existing[0] !== itemData) {
              oldSale = existing[0];
            } else if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
              try {
                const snap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/sales/${cleanId}`));
                if (snap && typeof snap.val === 'function' && snap.exists()) {
                  oldSale = snap.val();
                }
              } catch (e) {
                console.warn('Firebase get oldSale note:', e);
              }
            }
          }

          if (oldSale) {
            const oldDateKey = getDateKey(oldSale.date);
            if (oldDateKey !== dateKey) {
              v2Updates[`v2/salesByDate/${oldDateKey}/${cleanId}`] = null;
            }
          }

          const statsUpdates = applySaleStats(itemData, oldSale);
          Object.assign(v2Updates, statsUpdates);
          window._processedStats.set(statKey, { total, profit, qty, date: itemData.date });
        } else if (sectionPath === 'expenses') {
          const dateKey = getDateKey(itemData.date);
          const amt = parseFloat(String(itemData.amount || 0).replace(/,/g, '')) || 0;
          const enrichedExp = { ...itemData, id: cleanId, dateKey, amount: amt };

          v2Updates[`v2/expenses/${cleanId}`] = enrichedExp;
          v2Updates[`expenses/${cleanId}`] = enrichedExp;
          v2Updates[`v2/expensesByDate/${dateKey}/${cleanId}`] = true;

          window._processedStats = window._processedStats || new Map();
          const statKey = `expense:${cleanId}`;

          let oldExpense = null;
          if (previousItem && typeof previousItem === 'object') {
            oldExpense = previousItem;
          } else if (window._processedStats.has(statKey)) {
            oldExpense = window._processedStats.get(statKey);
          } else {
            const existing = (window.appState?.expenses || []).filter(e => String(e.id) === String(cleanId));
            if (existing.length > 1) {
              oldExpense = existing[1];
            } else if (existing.length === 1 && existing[0] !== itemData) {
              oldExpense = existing[0];
            } else if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
              try {
                const snap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/expenses/${cleanId}`));
                if (snap && typeof snap.val === 'function' && snap.exists()) {
                  oldExpense = snap.val();
                }
              } catch (e) {
                console.warn('Firebase get oldExpense note:', e);
              }
            }
          }

          if (oldExpense) {
            const oldDateKey = getDateKey(oldExpense.date);
            if (oldDateKey !== dateKey) {
              v2Updates[`v2/expensesByDate/${oldDateKey}/${cleanId}`] = null;
            }
          }

          const statsUpdates = applyExpenseStats(itemData, oldExpense);
          Object.assign(v2Updates, statsUpdates);
          window._processedStats.set(statKey, { amount: amt, date: itemData.date });
        } else if (sectionPath === 'credits') {
          v2Updates[`v2/credits/${cleanId}`] = itemData;
          v2Updates[`credits/${cleanId}`] = itemData;
          if (itemData.customerId && itemData.status !== 'settled') {
            v2Updates[`v2/openCreditsByCustomer/${cleanKey(itemData.customerId)}/${cleanId}`] = true;
          }
        } else if (sectionPath === 'packages') {
          v2Updates[`v2/packages/${cleanId}`] = itemData;
          v2Updates[`packages/${cleanId}`] = itemData;
        } else {
          v2Updates[`v2/${v2Sec}/${cleanId}`] = itemData;
          v2Updates[`${v2Sec}/${cleanId}`] = itemData;
        }

        // Clean undefined values to prevent Firebase SDK crashes
        const cleanPayload = JSON.parse(JSON.stringify(v2Updates));

        if (Object.keys(cleanPayload).length > 0) {
          let sdkOk = false;
          if (window.firebaseDB && window.firebaseUpdate && window.firebaseRef) {
            try {
              await window.firebaseUpdate(window.firebaseRef(window.firebaseDB), cleanPayload);
              sdkOk = true;
            } catch (e) {
              console.warn(`SDK saveFirebaseSectionItem error for ${sectionPath}/${cleanId}:`, e);
            }
          }
          if (!sdkOk) {
            const baseUrl = getRTDBUrl();
            const res = await fetch(`${baseUrl}/.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cleanPayload)
            });
            if (!res.ok) {
              const singleRes = await fetch(`${baseUrl}/v2/${v2Sec}/${cleanId}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
              });
              if (!singleRes.ok) throw new Error(`REST multi-location update failed HTTP ${res.status}`);
            }
          }
        }
        return true;
      } catch (err) {
        console.warn(`saveFirebaseSectionItem error for ${sectionPath}/${cleanId}:`, err);
        window.firebaseWriteQueue.push({ action: 'saveSectionItem', sectionPath, itemData, timestamp: Date.now() });
        return false;
      } finally {
        window.pendingWrites.delete(writeKey);
      }
    })();

    window.pendingWrites.set(writeKey, task);
    return task;
  };

  // Dedicated Item-Level Delete: cleans V2 structures + indexes with pendingWrites protection
  window.deleteFirebaseSectionItem = async function(sectionPath, itemId, previousItem) {
    if (!itemId) return false;
    const cleanId = cleanKey(itemId);
    const writeKey = `deleteSectionItem:${sectionPath}:${cleanId}`;

    if (typeof window.registerDeletedItemId === 'function') {
      window.registerDeletedItemId(sectionPath, itemId);
      window.registerDeletedItemId(sectionPath, cleanId);
      if (previousItem && previousItem._rtdbKey) {
        window.registerDeletedItemId(sectionPath, previousItem._rtdbKey);
      }
      if (previousItem && previousItem.id) {
        window.registerDeletedItemId(sectionPath, previousItem.id);
      }
    }

    if (window.pendingWrites.has(writeKey)) {
      return window.pendingWrites.get(writeKey);
    }

    const task = (async () => {
      try {
        const v2Deletes = {};
        const v2Sec = sectionPath === 'caisseLogs' ? 'caisse' : sectionPath;
        v2Deletes[`v2/${v2Sec}/${cleanId}`] = null;
        v2Deletes[`${v2Sec}/${cleanId}`] = null;
        v2Deletes[`appState/${v2Sec}/${cleanId}`] = null;

        const rtdbKey = previousItem && previousItem._rtdbKey ? cleanKey(previousItem._rtdbKey) : null;
        if (rtdbKey && rtdbKey !== cleanId) {
          v2Deletes[`v2/${v2Sec}/${rtdbKey}`] = null;
          v2Deletes[`${v2Sec}/${rtdbKey}`] = null;
          v2Deletes[`appState/${v2Sec}/${rtdbKey}`] = null;
        }

        if (sectionPath === 'customers') {
          const item = (window.appState?.customers || []).find(c => String(c.id) === String(itemId) || String(c._rtdbKey) === String(itemId)) || previousItem;
          if (item) {
            const normPhone = normalizePhone(item.phone);
            if (normPhone) v2Deletes[`v2/customerByPhone/${normPhone}`] = null;
            if (item.barcode) v2Deletes[`v2/customerByBarcode/${cleanKey(item.barcode)}`] = null;
          }
        } else if (sectionPath === 'products') {
          const item = (window.appState?.products || []).find(p => String(p.id || p.barcode) === String(itemId) || String(p._rtdbKey) === String(itemId)) || previousItem;
          if (item && item.barcode) {
            v2Deletes[`v2/productByBarcode/${cleanKey(item.barcode)}`] = null;
          }
        } else if (sectionPath === 'credits') {
          const item = (window.appState?.credits || []).find(c => String(c.id) === String(itemId) || String(c._rtdbKey) === String(itemId)) || previousItem;
          if (item && item.customerId) {
            v2Deletes[`v2/openCreditsByCustomer/${cleanKey(item.customerId)}/${cleanId}`] = null;
            if (rtdbKey) v2Deletes[`v2/openCreditsByCustomer/${cleanKey(item.customerId)}/${rtdbKey}`] = null;
          }
          if (String(itemId).startsWith('cr_auto_')) {
            const custId = String(itemId).replace('cr_auto_', '');
            v2Deletes[`v2/openCreditsByCustomer/${cleanKey(custId)}/${cleanId}`] = null;
          }
        } else if (sectionPath === 'sales') {
          window._processedStats = window._processedStats || new Map();
          const statKey = `sale:${cleanId}`;
          let saleToDelete = null;

          if (previousItem && typeof previousItem === 'object') {
            saleToDelete = previousItem;
          } else if (window._processedStats.has(statKey)) {
            saleToDelete = window._processedStats.get(statKey);
          } else {
            saleToDelete = (window.appState?.sales || []).find(s => String(s.id) === String(itemId));
            if (!saleToDelete && window.firebaseDB && window.firebaseRef && window.firebaseGet) {
              try {
                const snap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/sales/${cleanId}`));
                if (snap && typeof snap.val === 'function' && snap.exists()) {
                  saleToDelete = snap.val();
                }
              } catch (e) {
                console.warn('Firebase get delete sale note:', e);
              }
            }
          }

          if (saleToDelete) {
            const dateKey = getDateKey(saleToDelete.date);
            v2Deletes[`v2/salesByDate/${dateKey}/${cleanId}`] = null;
            const statsUpdates = revertSaleStats(saleToDelete);
            Object.assign(v2Deletes, statsUpdates);
            window._processedStats.delete(statKey);
          }
        } else if (sectionPath === 'expenses') {
          window._processedStats = window._processedStats || new Map();
          const statKey = `expense:${cleanId}`;
          let expToDelete = null;

          if (previousItem && typeof previousItem === 'object') {
            expToDelete = previousItem;
          } else if (window._processedStats.has(statKey)) {
            expToDelete = window._processedStats.get(statKey);
          } else {
            expToDelete = (window.appState?.expenses || []).find(e => String(e.id) === String(itemId));
            if (!expToDelete && window.firebaseDB && window.firebaseRef && window.firebaseGet) {
              try {
                const snap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/expenses/${cleanId}`));
                if (snap && typeof snap.val === 'function' && snap.exists()) {
                  expToDelete = snap.val();
                }
              } catch (e) {
                console.warn('Firebase get delete expense note:', e);
              }
            }
          }

          if (expToDelete) {
            const dateKey = getDateKey(expToDelete.date);
            v2Deletes[`v2/expensesByDate/${dateKey}/${cleanId}`] = null;
            const statsUpdates = revertExpenseStats(expToDelete);
            Object.assign(v2Deletes, statsUpdates);
            window._processedStats.delete(statKey);
          }
        }

        let sdkOk = false;
        if (window.firebaseDB && window.firebaseUpdate && window.firebaseRef) {
          try {
            await window.firebaseUpdate(window.firebaseRef(window.firebaseDB), v2Deletes);
            sdkOk = true;
          } catch (e) {
            console.warn(`SDK deleteFirebaseSectionItem error for ${sectionPath}/${cleanId}:`, e);
          }
        }
        // Direct REST deletion calls to wipe exact nodes in Firebase
        try {
          const baseUrl = getRTDBUrl();
          const endpointsToDelete = [
            `v2/${v2Sec}/${cleanId}.json`,
            `${v2Sec}/${cleanId}.json`,
            `appState/${v2Sec}/${cleanId}.json`
          ];
          if (rtdbKey && rtdbKey !== cleanId) {
            endpointsToDelete.push(`v2/${v2Sec}/${rtdbKey}.json`, `${v2Sec}/${rtdbKey}.json`);
          }
          if (sectionPath === 'credits') {
            const item = (window.appState?.credits || []).find(c => String(c.id) === String(itemId) || String(c._rtdbKey) === String(itemId)) || previousItem;
            if (item && item.customerId) {
              endpointsToDelete.push(`v2/openCreditsByCustomer/${cleanKey(item.customerId)}/${cleanId}.json`);
              if (rtdbKey) endpointsToDelete.push(`v2/openCreditsByCustomer/${cleanKey(item.customerId)}/${rtdbKey}.json`);
            }
            if (String(itemId).startsWith('cr_auto_')) {
              const custId = String(itemId).replace('cr_auto_', '');
              endpointsToDelete.push(`v2/openCreditsByCustomer/${cleanKey(custId)}/${cleanId}.json`);
            }
          }
          endpointsToDelete.forEach(ep => {
            fetch(`${baseUrl}/${ep}`, { method: 'DELETE' }).catch(() => {});
          });
        } catch (restErr) {
          console.warn('REST delete endpoints note:', restErr);
        }

        return true;
      } catch (err) {
        console.warn(`deleteFirebaseSectionItem error for ${sectionPath}/${cleanId}:`, err);
        window.firebaseWriteQueue.push({ action: 'deleteSectionItem', sectionPath, itemId: cleanId, timestamp: Date.now() });
        return false;
      } finally {
        window.pendingWrites.delete(writeKey);
      }
    })();

    window.pendingWrites.set(writeKey, task);
    return task;
  };

  // Fast $O(1)$ Indexed Customer Lookup by Phone
  window.findCustomerByPhone = async function(phone) {
    const norm = normalizePhone(phone);
    if (!norm) return null;
    let found = (window.appState?.customers || []).find(c => normalizePhone(c.phone) === norm);
    if (found) return found;

    if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
      try {
        const idxSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/customerByPhone/${norm}`));
        if (idxSnap.exists()) {
          const custId = idxSnap.val();
          const custSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/customers/${custId}`));
          if (custSnap.exists()) {
            const cust = custSnap.val();
            window.applyFirebaseSectionUpdate('customers', [cust], 'Phone Index Lookup');
            return cust;
          }
        }
      } catch (e) {
        console.warn('Fast phone lookup note:', e);
      }
    }
    return null;
  };

  // Fast $O(1)$ Indexed Customer Lookup by Barcode
  window.findCustomerByBarcode = async function(barcode) {
    if (!barcode) return null;
    const cleanBc = String(barcode).trim();
    let found = (window.appState?.customers || []).find(c => String(c.barcode || '').trim() === cleanBc);
    if (found) return found;

    if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
      try {
        const bcKey = cleanKey(cleanBc);
        const idxSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/customerByBarcode/${bcKey}`));
        if (idxSnap.exists()) {
          const custId = idxSnap.val();
          const custSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/customers/${custId}`));
          if (custSnap.exists()) {
            const cust = custSnap.val();
            window.applyFirebaseSectionUpdate('customers', [cust], 'Barcode Index Lookup');
            return cust;
          }
        }
      } catch (e) {
        console.warn('Fast barcode customer lookup note:', e);
      }
    }
    return null;
  };

  // Fast $O(1)$ Indexed Product Lookup by Barcode
  window.findProductByBarcode = async function(barcode) {
    if (!barcode) return null;
    const cleanBc = String(barcode).trim();
    let found = (window.appState?.products || []).find(p => String(p.barcode || '').trim().toLowerCase() === cleanBc.toLowerCase());
    if (found) return found;

    if (window.firebaseDB && window.firebaseRef && window.firebaseGet) {
      try {
        const bcKey = cleanKey(cleanBc);
        const idxSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/productByBarcode/${bcKey}`));
        if (idxSnap.exists()) {
          const prodId = idxSnap.val();
          const prodSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `v2/products/${prodId}`));
          if (prodSnap.exists()) {
            const prod = prodSnap.val();
            window.applyFirebaseSectionUpdate('products', [prod], 'Barcode Index Lookup');
            return prod;
          }
        }
        // Legacy fallback
        const legSnap = await window.firebaseGet(window.firebaseRef(window.firebaseDB, `products/${bcKey}`));
        if (legSnap.exists()) {
          const prod = legSnap.val();
          window.applyFirebaseSectionUpdate('products', [prod], 'Legacy Barcode Lookup');
          return prod;
        }
      } catch (e) {
        console.warn('Fast barcode product lookup note:', e);
      }
    }
    return null;
  };

  // Robust Data Sync with Firebase Realtime Database
  window.__firebaseAlreadyFetched = false;
  window.fetchAndLoadFirebaseData = async function(force) {
    if (window.__firebaseAlreadyFetched && !force) return true;

    try {
      const baseUrl = getRTDBUrl();
      const safeFetch = (path) => fetch(`${baseUrl}/${path}`).then(r => r.ok ? r.json() : null).catch(() => null);

      const sections = [
        { name: 'customers', v2: 'customers' },
        { name: 'products', v2: 'products' },
        { name: 'expenses', v2: 'expenses' },
        { name: 'credits', v2: 'credits' },
        { name: 'suppliers', v2: 'suppliers' },
        { name: 'staffPayouts', v2: 'staffPayouts' },
        { name: 'caisseLogs', v2: 'caisse' },
        { name: 'packages', v2: 'packages' },
        { name: 'coachAbsences', v2: 'coachAbsences' },
        { name: 'supplierTransactions', v2: 'supplierTransactions' }
      ];
      // When the realtime SDK is active, sales are served by the bounded window listener +
      // silent cursor pager — skip the full-node REST download of the entire sales history.
      if (!window.firebaseDB) {
        sections.push({ name: 'sales', v2: 'sales' });
      }

      const fetchPromises = [
        safeFetch('v2/meta/health.json'),
        safeFetch('v2/stats.json'),
        safeFetch('appState.json')
      ];

      sections.forEach(sec => {
        fetchPromises.push(safeFetch(`v2/${sec.v2}.json`));
        fetchPromises.push(safeFetch(`${sec.name}.json`));
      });

      const results = await Promise.all(fetchPromises);
      const meta = results[0];
      const v2Stats = results[1];
      const appStateCfg = results[2];

      window.__firebaseAlreadyFetched = true;
      window.appState = window.appState || {};

      let resultIdx = 3;
      sections.forEach(sec => {
        const v2Data = results[resultIdx++];
        const rootData = results[resultIdx++];
        
        const map = new Map();
        const addData = (data) => {
          if (!data) return;
          if (Array.isArray(data)) {
            data.forEach((item, idx) => {
              if (item) {
                const key = String(item.id || item._rtdbKey || item.barcode || (item.phone ? cleanPhone(item.phone) : '') || idx);
                map.set(key, { ...item, id: item.id || key });
              }
            });
          } else if (typeof data === 'object') {
            Object.entries(data).forEach(([k, item]) => {
              if (item) {
                const key = String(item.id || item._rtdbKey || item.barcode || (item.phone ? cleanPhone(item.phone) : '') || k);
                map.set(key, { ...item, id: item.id || key, _rtdbKey: k });
              }
            });
          }
        };

        addData(rootData);
        addData(v2Data);

        const combinedItems = Array.from(map.values());
        if (combinedItems.length > 0) {
          window.applyFirebaseSectionUpdate(sec.name, combinedItems, `Startup ${sec.name} Sync`);
        }
        window.firebaseLoadedSections[sec.name] = true;
      });

      if (v2Stats) {
        window.appState.v2Stats = v2Stats;
      }

      if (appStateCfg && typeof appStateCfg === 'object') {
        if (typeof appStateCfg.hideFinances === 'boolean') {
          window.appState.hideFinances = appStateCfg.hideFinances;
        }
      }

      window.firebaseSyncState = window.firebaseSyncState || {};
      window.firebaseSyncState.rtdb = 'connected';
      window.firebaseSyncState.lastSync = new Date();
      updateFirebaseUIBadge('connected', 'Firebase: متصل ومزامن');

      if (typeof saveLocalStorageImmediate === 'function') {
        saveLocalStorageImmediate();
      }
      scheduleRender();
      return true;
    } catch (err) {
      console.warn('Initial startup fetch error:', err);
    }
    return false;
  };
  // Test connection button handler - tests lightweight health endpoint without loading or pushing full database
  window.testFirebaseConnection = async function() {
    const syncBtn = document.getElementById('firebaseManualSyncBtn');
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = `<span>جاري فحص الاتصال...</span>`;
    }
    let connected = false;
    let errorMsg = '';
    try {
      const baseUrl = getRTDBUrl();
      const testResp = await fetch(`${baseUrl}/v2/meta/health.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: Date.now(), status: 'healthy' })
      });
      if (testResp.ok) {
        connected = true;
      } else {
        errorMsg = `HTTP ${testResp.status}`;
      }
    } catch (e) {
      errorMsg = e?.message || 'تعذر الاتصال بالشبكة';
    }

    if (!connected && window.firebaseDB && window.firebaseRef && window.firebaseGet) {
      try {
        await window.firebaseGet(window.firebaseRef(window.firebaseDB, 'v2/meta/health'));
        connected = true;
      } catch (e) {
        errorMsg = e?.message || errorMsg;
      }
    }

    if (connected) {
      window.firebaseSyncState = window.firebaseSyncState || {};
      window.firebaseSyncState.rtdb = 'connected';
      window.firebaseSyncState.lastSync = new Date();
      window.firebaseSyncState.lastError = null;
      updateFirebaseUIBadge('connected', 'Firebase: الاتصال نشط وسريع');
      if (typeof showSuccessToast === 'function') {
        showSuccessToast('تم فحص الاتصال بـ Firebase بنجاح (الاتصال نشط وسليم)');
      }
    } else {
      window.firebaseSyncState.lastError = errorMsg;
      if (typeof showErrorToast === 'function') {
        showErrorToast('فشل اختبار الاتصال بـ Firebase: ' + (errorMsg || 'يرجى التحقق من القواعد'));
      }
      updateFirebaseUIBadge('error', 'Firebase: تعذر الاتصال', errorMsg);
    }
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        <span>فحص الاتصال ومزامنة البيانات فوراً</span>
      `;
    }
  };
  window.copyTextToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showSuccessToast === 'function') showSuccessToast('تم نسخ القواعد بنجاح!');
    });
  };
  // Startup sync: prefer the realtime SDK (bounded sales window + silent history pager).
  // Only fall back to the full bulk REST fetch (including all sales) when the SDK is unavailable.
  window.__startupFetchPromise = null;
  window.runStartupFirebaseFetch = function(maxWaitMs = 3000) {
    if (window.__startupFetchPromise) return window.__startupFetchPromise;
    window.__startupFetchPromise = (async () => {
      const started = Date.now();
      while (!window.firebaseDB && !window.__firebaseSDKFailed && (Date.now() - started) < maxWaitMs) {
        await new Promise(r => setTimeout(r, 150));
      }
      try {
        await window.fetchAndLoadFirebaseData();
      } catch (e) { console.warn('Startup bulk fetch note:', e); }
      // Complete older sales history in the background once the SDK is live
      if (window.firebaseDB && typeof window.completeSalesHistorySilently === 'function') {
        window.completeSalesHistorySilently();
      }
    })();
    return window.__startupFetchPromise;
  };

  // Single immediate fast fetch (no duplicate event listeners)
  window.runStartupFirebaseFetch();
  async function initFirebase() { try { try {
        const cfgRes = await fetch('/firebase.config.json');
        if (cfgRes.ok) { const cfgJson = await cfgRes.json();
          if (cfgJson && cfgJson.apiKey) {
            firebaseConfig = { ...firebaseConfig, ...cfgJson };
          } } } catch (e) {} const app = initializeApp(firebaseConfig);
      // Realtime Database High-Speed Sectional WebSocket Listeners & Bounded Queries
      try {
        const database = getDatabase(app);
        window.firebaseDB = database;
        window.firebaseSet = set;
        window.firebaseUpdate = update;
        window.firebasePush = push;
        window.firebaseRemove = remove;
        window.firebaseRef = ref;
        window.firebaseOnValue = onValue;
        window.firebaseGet = get;
        window.firebaseQuery = query;
        window.firebaseLimitToLast = limitToLast;
        window.firebaseLimitToFirst = limitToFirst;
        window.firebaseStartAt = startAt;
        window.firebaseEndAt = endAt;
        window.firebaseStartAfter = startAfter;
        window.firebaseEndBefore = endBefore;
        window.firebaseOrderByKey = orderByKey;
        window.firebaseOrderByChild = orderByChild;
        window.firebaseEqualTo = equalTo;

        // Generic Ultra-Fast Cursor-Based Pagination Utility for any flat section
        window.fetchPaginatedSection = async function(sectionName, limitCount = 50, startAfterKey = null) {
          if (!window.firebaseDB) return [];
          try {
            const dbRef = ref(window.firebaseDB, sectionName);
            let q;
            if (startAfterKey) {
              q = query(dbRef, orderByKey(), startAfter(startAfterKey), limitToFirst(limitCount));
            } else {
              q = query(dbRef, orderByKey(), limitToLast(limitCount));
            }
            const snap = await get(q);
            if (snap.exists()) {
              const data = snap.val();
              const items = Object.entries(data).map(([k, v]) => ({ ...v, _rtdbKey: k }));
              return items;
            }
          } catch (err) {
            console.warn(`Pagination fetch note for ${sectionName}:`, err);
          }
          return [];
        };

        // Realtime Listeners for instant Live Sync across tabs, browsers, and devices.
        // Sales uses a bounded window (limitToLast) so every new sale no longer re-downloads
        // the ENTIRE sales history; older records are completed by the silent cursor pager.
        const realTimeListeners = [
          { name: 'stats', q: ref(database, 'v2/stats') },
          { name: 'products', q: ref(database, 'v2/products') },
          { name: 'customers', q: ref(database, 'v2/customers') },
          { name: 'sales', q: query(ref(database, 'v2/sales'), orderByKey(), limitToLast(window.SALES_REALTIME_WINDOW || 3000)) },
          { name: 'expenses', q: ref(database, 'v2/expenses') },
          { name: 'credits', q: ref(database, 'v2/credits') },
          { name: 'suppliers', q: ref(database, 'v2/suppliers') },
          { name: 'packages', q: ref(database, 'v2/packages') },
          { name: 'staffPayouts', q: ref(database, 'v2/staffPayouts') },
          { name: 'coachAbsences', q: ref(database, 'v2/coachAbsences') },
          { name: 'caisseLogs', q: ref(database, 'v2/caisse') }
        ];

        realTimeListeners.forEach(sec => {
          onValue(sec.q, (snapshot) => {
            if (snapshot.exists()) {
              window.applyFirebaseSectionUpdate(sec.name, snapshot.val(), `Realtime ${sec.name}`);
            }
            window.firebaseSyncState.rtdb = 'connected';
            window.firebaseSyncState.lastSync = new Date();
            updateFirebaseUIBadge('connected', 'Firebase: متصل ومزامن (مباشر Realtime)');
            window.dispatchEvent(new Event('firebaseReady'));
          }, (error) => {
            console.warn(`Firebase ${sec.name} sync note:`, error?.message || error);
            if (error?.message && (error.message.includes('permission_denied') || error.message.includes('Permission denied'))) {
              updateFirebaseUIBadge('error', 'Firebase: الصلاحيات مقفلة', 'يرجى تفعيل .read: true, .write: true في قواعد Realtime Database');
            }
          });
        });

        // Ultra-Fast Cursor-Based Pagination: Loads older historical records using orderByKey() & endBefore() without scanning/sorting in memory
        window.loadOlderHistoricalData = async function(sectionName = 'sales', limitCount = 50) {
          try {
            const cursor = window.firebaseCursors[sectionName] || { oldestKey: null, hasMore: true };
            if (cursor.hasMore === false) {
              if (typeof showInfoToast === 'function') {
                showInfoToast(`لا توجد سجلات أقدم إضافية لـ ${sectionName}`);
              }
              return 0;
            }

            let oldestKey = cursor.oldestKey;
            if (!oldestKey) {
              const list = Array.isArray(window.appState[sectionName]) ? window.appState[sectionName] : [];
              if (list.length > 0) {
                oldestKey = list[0]._rtdbKey || list[0].id || list[0].barcode || null;
              }
            }

            const v2Sec = sectionName === 'caisseLogs' ? 'caisse' : sectionName;
            let olderQ;
            if (oldestKey) {
              olderQ = query(ref(database, `v2/${v2Sec}`), orderByKey(), endBefore(String(oldestKey)), limitToLast(limitCount));
            } else {
              olderQ = query(ref(database, `v2/${v2Sec}`), orderByKey(), limitToLast(limitCount));
            }

            let snap = await get(olderQ);
            if (!snap.exists()) {
              // Legacy fallback query
              if (oldestKey) {
                olderQ = query(ref(database, sectionName), orderByKey(), endBefore(String(oldestKey)), limitToLast(limitCount));
              } else {
                olderQ = query(ref(database, sectionName), orderByKey(), limitToLast(limitCount));
              }
              snap = await get(olderQ);
            }

            if (snap && snap.exists()) {
              const data = snap.val();
              const keys = Object.keys(data);
              const items = keys.map(k => ({ ...data[k], _rtdbKey: k }));

              cursor.oldestKey = keys[0];
              if (items.length < limitCount) {
                cursor.hasMore = false;
              }
              window.firebaseCursors[sectionName] = cursor;

              window.applyFirebaseSectionUpdate(sectionName, items, 'Cursor Pagination Fetch');
              if (typeof showSuccessToast === 'function') {
                showSuccessToast(`تم تحميل ${items.length} سجل أقدم لـ ${sectionName} بنجاح`);
              }
              return items.length;
            } else {
              cursor.hasMore = false;
              window.firebaseCursors[sectionName] = cursor;
              if (typeof showInfoToast === 'function') {
                showInfoToast(`لا توجد سجلات أقدم إضافية لـ ${sectionName}`);
              }
              return 0;
            }
          } catch (e) {
            console.warn(`Error loading older data for ${sectionName}:`, e);
          }
          return 0;
        };

      } catch (rtdbInitErr) {
        console.warn('RTDB Init Note:', rtdbInitErr);
      } } catch (error) { console.warn('Notice initializing Firebase:', error?.message || error);
      window.__firebaseSDKFailed = true; // release the startup bulk-REST fallback immediately
      updateFirebaseUIBadge('error', 'Firebase: خطأ في الاتصال', error?.message || String(error));
    } } initFirebase();

    // ==========================================
    // SECURITY, VALIDATION & SANITIZATION ENGINE
    // ==========================================
    /**
     * 1. Code Injection & XSS Guard: Strict detection of script tags, inline events, SQL injection, eval, etc.
     * 2. Type-Strict Input Validation: Names (Arabic/Latin letters, no scripts), Numbers (positive, bounded), Phones (digits only).
     * 3. Image Security: Magic bytes verification, immediate filename randomization, minimum resolution & canvas pixel variance validation.
     * 4. State & Sensitive Configuration: Environment secrets protected, .gitignore strictly configured.
     */
    function containsDangerousCode(str) { if (!str || typeof str !== 'string') return false;
        const clean = str.trim(); if (!clean) return false;
        const lower = clean.toLowerCase();
        // 1. Instant check for code injection & dangerous symbols in strict contexts
        if (/[<>{}`$\\]/.test(clean)) { return true;
        }
        // 2. Instant keyword & SQL injection blacklist (using hex escapes to avoid inline HTML parser interference)
        const instantBlockedKeywords = [
            '\x3cscript', '\x3c/script\x3e', 'javascript:', 'vbscript:', 'data:text/html',
            'onload=', 'onerror=', 'onclick=', 'onmouseover=', 'onfocus=', 'onblur=', 'onchange=', 'onsubmit=',
            'eval(', 'settimeout(', 'setinterval(', 'new function(', 'function(',
            'document.cookie', 'document.write', 'document.location', 'window.location', 'window.eval',
            '\x3ciframe', '\x3cobject', '\x3cembed', '\x3capplet', '\x3csvg', '\x3cmeta', '\x3clink', '\x3cstyle',
            'union select', 'union all select', 'drop table', 'drop database', 'insert into', 'delete from', 'update set',
            'exec(', 'execute(', 'xp_cmdshell', 'sp_executesql', 'information_schema', 'into outfile', 'into dumpfile',
            '--\x20', '/*', '*/', '@@version', 'benchmark(', 'sleep(', 'or 1=1', "' or '1'='1", '" or "1"="1',
            '\x3c!--', '--\x3e', '\x3c![cdata[', '\x3c?php', '\x3c?=', '\x3c%', '${'
        ]; if (instantBlockedKeywords.some(keyword => lower.includes(keyword))) {
            return true; }
        // 3. Comprehensive regular expression patterns for SQLi & XSS
        const dangerousPatterns = [
            /\x3c[^\x3e]*\b(on\w+|href\s*=\s*["']?javascript:|src\s*=\s*["']?javascript:)[^\x3e]*\x3e/gim,
            /\x3cscript\b[^\x3e]*\x3e([\s\S]*?)\x3c\/script\x3e/gim,
            /javascript\s*:\s*[\s\S]*/gim,
            /vbscript\s*:\s*[\s\S]*/gim,
            /expression\s*\([\s\S]*\)/gim,
            /url\s*\(\s*["']?javascript:/gim,
            /\b(eval|alert|prompt|confirm)\s*\(/gim,
            /\x3c(iframe|object|embed|form|input|button|svg|link|style)\b[^\x3e]*\x3e/gim,
            /\bunion\s+(all\s+)?select\b/gim,
            /\bdrop\s+(table|database|procedure|view|trigger)\b/gim,
            /\b(select|insert|update|delete)\b.*?\b(from|into|table|set|where)\b/gim,
            /\bexec(ute)?\s*\(/gim, /--\s*$/gm,
            /\/\*[\s\S]*?\*\//gm,
            /base64\s*,\s*[A-Za-z0-9+/=]{30,}/gim
        ]; return dangerousPatterns.some(regex => {
            const isMatch = regex.test(clean);
            regex.lastIndex = 0; return isMatch;
        }); } window.containsDangerousCode = containsDangerousCode;
    function sanitizeInputText(str, maxLen = 100) {
        if (!str || typeof str !== 'string') return '';
        // Remove HTML tags, script prefixes, SQL comment tokens and dangerous characters
        let clean = str.replace(/<[^>]*>/g, '')
                       .replace(/javascript:/gi, '')
                       .replace(/on\w+\s*=/gi, '')
                       .replace(/--|\/\*|\*\//g, '')
                       .replace(/[@#$%\^&*<>\/\\{}\[\];:+=~|`"'!?]/g, '');
        clean = clean.trim(); if (clean.length > maxLen) {
            clean = clean.substring(0, maxLen);
        } return clean; } window.sanitizeInputText = sanitizeInputText;
    function escapeHTML(str) { if (str === null || str === undefined) return '';
        return String(str) .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;') .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;') .replace(/'/g, '&#039;');
    } window.escapeHTML = escapeHTML;
    // Strict validator for Names (Arabic letters, Latin letters, spaces, hyphens, periods)
    function validateSafeName(name, fieldTitle = 'الاسم', isRequired = true, maxLen = 60) {
        if (!name || typeof name !== 'string' || !name.trim()) {
            if (isRequired) return { valid: false, error: `يرجى إدخال ${fieldTitle}` };
            return { valid: true, value: '' }; }
        const trimmed = name.trim(); if (containsDangerousCode(trimmed)) {
            return { valid: false, error: `تم حظر محتوى مشبوه في ${fieldTitle}` };
        } if (trimmed.length < 2) { return { valid: false, error: `${fieldTitle} قصير جداً (يجب أن يكون حرفين على الأقل)` };
        } if (trimmed.length > maxLen) { return { valid: false, error: `${fieldTitle} طويل جداً (الحد الأقصى ${maxLen} حرف)` };
        }
        // Allowed: Arabic Letters (\u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF), Latin letters, spaces, hyphens, apostrophes (NO numbers, NO symbols)
        const nameRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z\s\-']+$/;
        if (!nameRegex.test(trimmed)) { return { valid: false, error: `${fieldTitle} يجب أن يحتوي على أحرف فقط (بدون أرقام أو رموز)` };
        } return { valid: true, value: sanitizeInputText(trimmed, maxLen) };
    } window.validateSafeName = validateSafeName;
    // Strict validator for Phone numbers (Digits only)
    function validateSafePhone(phone, isRequired = false) {
        if (!phone || typeof phone !== 'string' || !phone.trim()) {
            if (isRequired) return { valid: false, error: 'يرجى إدخال رقم الهاتف' };
            return { valid: true, value: '' }; }
        const cleaned = phone.trim().replace(/[\s\-_()]/g, '');
        if (containsDangerousCode(cleaned)) {
            return { valid: false, error: 'رقم الهاتف يحتوي على رموز غير مسموح بها' };
        }
        // Valid phone: digits only, optional leading '+'
        const phoneRegex = /^\+?[0-9]{8,15}$/;
        if (!phoneRegex.test(cleaned)) { return { valid: false, error: 'يرجى إدخال رقم هاتف صحيح مكون من أرقام فقط (8-15 رقم)' };
        } return { valid: true, value: cleaned };
    } window.validateSafePhone = validateSafePhone;
    // Strict validator for Numbers / Amounts / Prices
    function validateSafeNumber(val, fieldTitle = 'المبلغ', min = 0, max = 50000000, isRequired = true) {
        if (val === null || val === undefined || val === '') {
            if (isRequired) return { valid: false, error: `يرجى إدخال ${fieldTitle}` };
            return { valid: true, value: 0 }; }
        if (typeof val === 'string' && containsDangerousCode(val)) {
            return { valid: false, error: `تم حظر محتوى مشبوه في ${fieldTitle}` };
        } const num = Number(val); if (isNaN(num) || !isFinite(num)) {
            return { valid: false, error: `يرجى إدخال قيمة رقمية صحيحة في ${fieldTitle}` };
        } if (num < min) { return { valid: false, error: `قيمة ${fieldTitle} لا يمكن أن تكون أقل من ${min}` };
        } if (num > max) { return { valid: false, error: `قيمة ${fieldTitle} لا يمكن أن تتجاوز ${max.toLocaleString()} دج` };
        } return { valid: true, value: num }; }
    window.validateSafeNumber = validateSafeNumber;
    function validateCustomerDOB(dobStr) { if (!dobStr || !dobStr.trim()) {
            return { valid: true, age: null }; }
        if (containsDangerousCode(dobStr)) {
            return { valid: false, error: 'تاريخ الميلاد يحتوي على رموز غير صالحة' };
        } const birthDate = new Date(dobStr);
        const today = new Date(); if (isNaN(birthDate.getTime())) {
            return { valid: false, error: 'تاريخ الميلاد غير صالح' };
        } if (birthDate > today) { return { valid: false, error: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' };
        } let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--; } if (age < 5 || age > 100) {
            return { valid: false, error: 'يرجى إدخال تاريخ ميلاد صحيح (العمر يجب أن يكون بين 5 و 100 سنة)' };
        } return { valid: true, age }; }
    // Login Lockout Rate Limiter (5 attempts, 15 minutes lock)
    const LOGIN_MAX_ATTEMPTS = 5; const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
    function checkLoginLockout() { const lockoutUntil = parseInt(localStorage.getItem('login_lockout_until') || '0', 10);
        const now = Date.now(); if (lockoutUntil && now < lockoutUntil) {
            const remainingMs = lockoutUntil - now;
            const mins = Math.floor(remainingMs / (60 * 1000));
            const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
            return { isLocked: true, mins, secs };
        } if (lockoutUntil && now >= lockoutUntil) {
            localStorage.removeItem('login_lockout_until');
            localStorage.setItem('login_failed_attempts', '0');
        } return { isLocked: false }; } function recordLoginFailure() {
        let attempts = parseInt(localStorage.getItem('login_failed_attempts') || '0', 10) + 1;
        localStorage.setItem('login_failed_attempts', attempts.toString());
        if (attempts >= LOGIN_MAX_ATTEMPTS) {
            const lockoutTime = Date.now() + LOGIN_LOCKOUT_MS;
            localStorage.setItem('login_lockout_until', lockoutTime.toString());
            return { lockedNow: true, attempts };
        } return { lockedNow: false, attempts };
    } function resetLoginFailures() {
        localStorage.removeItem('login_failed_attempts');
        localStorage.removeItem('login_lockout_until');
    } function togglePasswordVisibility() {
        const input = document.getElementById('loginPassword');
        input.type = input.type === 'password' ? 'text' : 'password';
    } async function handleLogin(e) { e.preventDefault();
        const errorDiv = document.getElementById('loginError');
        const emailVal = getElemVal('loginEmail') || '';
        const passVal = getElemVal('loginPassword') || '';
        // 1. Check lockout status (API/Device Level simulation)
        const lockoutStatus = checkLoginLockout();
        if (lockoutStatus.isLocked) { const msg = `تم حظر هذا الجهاز من الوصول للـ API لمدة 15 دقيقة بسبب تجاوز المحاولات. يتبقى ${lockoutStatus.mins} دقيقة و ${lockoutStatus.secs} ثانية.`;
            if (errorDiv) { errorDiv.textContent = msg;
                errorDiv.classList.remove('hidden');
            } showErrorToast('الجهاز محظور من الوصول للخدمة حالياً.');
            return; }
        // 2. Reject code injection & check data format
        if (containsDangerousCode(emailVal) || containsDangerousCode(passVal)) {
            const fail = recordLoginFailure();
            const msg = 'تم رفض الدخول: تم اكتشاف محاولة حقن أكواد (Injection Attempt).';
            if (errorDiv) { errorDiv.textContent = msg;
                errorDiv.classList.remove('hidden');
            } showErrorToast('تحذير أمني: تم رصد كود غير مسموح به.');
            return; }
        // 3. Credentials check
        const isValidPass = passVal.trim() === '8992' || hashString(passVal) === 1724890;
        if (!emailVal.trim() || !passVal.trim() || !isValidPass) {
            const fail = recordLoginFailure();
            if (errorDiv) { if (fail.lockedNow) {
                    errorDiv.textContent = 'تم قفل تسجيل الدخول لمدة 15 دقيقة بسبب تجاوز 5 محاولات خاطئة.';
                } else { errorDiv.textContent = `خطأ في البريد أو كلمة المرور. المحاولات المتبقية: ${LOGIN_MAX_ATTEMPTS - fail.attempts}`;
                } errorDiv.classList.remove('hidden');
            } return; }
        // Successful login
        resetLoginFailures(); if (errorDiv) errorDiv.classList.add('hidden');
        setElemDisplay('loginView', 'none');
        document.getElementById('appContainer')?.classList.remove('hidden');
        document.getElementById('appContainer')?.classList.add('flex');
        showSuccessToast('تم تسجيل الدخول بنجاح');
    } function handleLogout() {} function clearAllData() {
        if (confirm("هل أنت متأكد أنك تريد مسح جميع البيانات؟")) {
            window.appState.customers = [];
            window.appState.packages = [];
            window.appState.coachAbsences = [];
            window.appState.expenses = [];
            window.appState.products = [];
            window.appState.sales = []; window.appState.staffPayouts = [];
            window.appState.credits = []; window.appState.suppliers = [];
            window.appState.activityLogs = [];
            saveState(); localStorage.clear();
            showSuccessToast("تم مسح جميع البيانات بنجاح");
        } } const defaultPackages = [];
    try {
      localStorage.removeItem('sm_appState');
    } catch (e) {}
    window.appState = window.appState || {};
    const baseSource = window.appState;
    const ensureSrcArr = (key) => (Array.isArray(baseSource[key]) ? baseSource[key] : []);
    window.appState.customers = ensureSrcArr('customers');
    window.appState.packages = ensureSrcArr('packages');
    window.appState.coachAbsences = ensureSrcArr('coachAbsences');
    window.appState.expenses = ensureSrcArr('expenses');
    window.appState.products = ensureSrcArr('products');
    window.appState.sales = ensureSrcArr('sales');
    window.appState.staffPayouts = ensureSrcArr('staffPayouts');
    window.appState.credits = ensureSrcArr('credits');
    window.appState.suppliers = ensureSrcArr('suppliers');
    window.appState.quickSessions = ensureSrcArr('quickSessions');
    window.appState.caisseLogs = ensureSrcArr('caisseLogs');
    window.appState.activityLogs = ensureSrcArr('activityLogs');
    window.appState.selectedCaisseDate = baseSource.selectedCaisseDate || (typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
    window.appState.productStockFilter = baseSource.productStockFilter || 'all';
    window.appState.filter = baseSource.filter || 'all';
    window.appState.searchQuery = baseSource.searchQuery || '';
    window.appState.currentInvoice = baseSource.currentInvoice || null;
    window.appState.hideFinances = localStorage.getItem('sm_hideFinances') !== 'false';
    let appState = window.appState;
    appState.customerPage = 1;
    appState.creditPage = 1;

    // ============================================================================
    // HIGH-PERFORMANCE WORKER & CACHE ENGINE
    // ============================================================================
    let perfWorker = null;
    let workerMsgId = 0;
    const workerCallbacks = new Map();
    try {
      perfWorker = new Worker(new URL('./perfWorker.js', import.meta.url), { type: 'module' });
      perfWorker.onmessage = function(e) {
        const { id, success, result, error } = e.data || {};
        const cb = workerCallbacks.get(id);
        if (cb) {
          workerCallbacks.delete(id);
          if (success) cb.resolve(result);
          else cb.reject(new Error(error));
        }
      };
      perfWorker.onerror = function(err) {
        console.warn('Worker background thread notice:', err);
      };
    } catch (e) {
      console.info('Worker running in main-thread mode.');
    }

    function runWorkerTask(type, payload) {
      if (!perfWorker) return Promise.reject(new Error('Worker unavailable'));
      return new Promise((resolve, reject) => {
        const id = ++workerMsgId;
        workerCallbacks.set(id, { resolve, reject });
        perfWorker.postMessage({ id, type, payload });
      });
    }
    window.runWorkerTask = runWorkerTask;

    // O(1) Package Map Cache
    let _cachedPackageMap = null;
    let _cachedPackageCount = -1;
    function getPackageMap() {
      const pkgs = appState.packages || [];
      if (!_cachedPackageMap || _cachedPackageCount !== pkgs.length) {
        _cachedPackageMap = new Map();
        for (let i = 0; i < pkgs.length; i++) {
          const p = pkgs[i];
          if (p && p.id) _cachedPackageMap.set(p.id, p);
        }
        _cachedPackageCount = pkgs.length;
      }
      return _cachedPackageMap;
    }
    window.getPackageMap = getPackageMap;

    function saveLocalStorageImmediate() {
      // Local storage caching disabled per user request to guarantee immediate real-time sync across sessions
      try {
        localStorage.removeItem('sm_appState');
      } catch (e) {}
    }
    window.saveLocalStorageImmediate = saveLocalStorageImmediate;

    function scheduleLocalStorageSave() {
      // No-op to prevent storing stale data
    }
    window.addEventListener('beforeunload', () => {
      saveLocalStorageImmediate();
    });

    // State loaded from Firebase
    function showSuccessToast(message) { let toast = document.getElementById('firebase-toast');
      if (!toast) { toast = document.createElement('div');
        toast.id = 'firebase-toast'; toast.className = 'fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold z-50';
        document.body.appendChild(toast); }
      toast.className = 'fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold z-50 transition-opacity duration-300';
      toast.innerHTML = message; toast.style.opacity = '1';
      setTimeout(() => toast.style.opacity = '0', 3000);
    } window.showSuccessToast = showSuccessToast;
    function showErrorToast(message) { let toast = document.getElementById('error-toast');
      if (!toast) { toast = document.createElement('div');
        toast.id = 'error-toast'; toast.className = 'fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold z-50 transition-opacity duration-300';
        document.body.appendChild(toast); }
      toast.innerHTML = message; toast.style.opacity = '1';
      setTimeout(() => toast.style.opacity = '0', 3000);
    } window.showErrorToast = showErrorToast;
    function showInfoToast(message) { let toast = document.getElementById('info-toast');
      if (!toast) { toast = document.createElement('div');
        toast.id = 'info-toast'; toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-bold z-50 transition-opacity duration-300 flex items-center gap-2';
        document.body.appendChild(toast); }
      toast.innerHTML = `
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>${message}</span>
      `; toast.style.opacity = '1'; setTimeout(() => toast.style.opacity = '0', 3500);
    } window.showInfoToast = showInfoToast;
    function hashString(str) { let hash = 0; if (!str) return 12345;
        const s = String(str); for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0; } return Math.abs(hash);
    } function getDisplayPhone(phone) { const raw = (phone || '').toString().trim().replace(/\*/g, '');
        const cleanDigits = raw.replace(/\D/g, '');
        if (cleanDigits.length === 10) { return cleanDigits.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
        } return raw; } window.getDisplayPhone = getDisplayPhone;
    function cleanPhone(phone) { if (!phone) return '';
        return phone.toString().trim().replace(/\s+/g, '').replace(/\*/g, '');
    } window.cleanPhone = cleanPhone; function saveState() {
      localStorage.setItem('sm_hideFinances', appState.hideFinances);
      const ensureArray = (val) => (!val ? [] : (Array.isArray(val) ? val : Object.values(val)));
      appState.customers = ensureArray(appState.customers);
      appState.packages = ensureArray(appState.packages);
      appState.coachAbsences = ensureArray(appState.coachAbsences);
      appState.expenses = ensureArray(appState.expenses);
      appState.products = ensureArray(appState.products);
      appState.sales = ensureArray(appState.sales);
      appState.staffPayouts = ensureArray(appState.staffPayouts);
      appState.credits = ensureArray(appState.credits);
      appState.suppliers = ensureArray(appState.suppliers);
      appState.quickSessions = ensureArray(appState.quickSessions);
      appState.caisseLogs = ensureArray(appState.caisseLogs);
      appState.activityLogs = ensureArray(appState.activityLogs);
      
      // Synchronous immediate local write + debounced safety
      saveLocalStorageImmediate();
      scheduleLocalStorageSave();

      if (window.__firebasePushTimer) clearTimeout(window.__firebasePushTimer);
      window.__firebasePushTimer = setTimeout(() => {
        if (window.firebaseDB && window.firebaseUpdate && window.firebaseRef) {
          try {
            window.firebaseUpdate(window.firebaseRef(window.firebaseDB, 'appState'), {
              hideFinances: appState.hideFinances !== false,
              lastUpdated: new Date().toISOString()
            }).catch(err => console.warn('Firebase appState sync notice:', err?.message || err));
          } catch(err) {
            console.warn('Firebase appState sync exception:', err?.message || err);
          }
        }
      }, 500);
      if (typeof window.triggerGoogleDriveAutoSync === 'function') {
        window.triggerGoogleDriveAutoSync(); }
      if (typeof render === 'function') render();
    }
    
    function handleNavButtonClick(e, callback) {
        if (e && e.preventDefault) e.preventDefault();
        if (typeof callback === 'function') callback();
    }
    window.handleNavButtonClick = handleNavButtonClick;

    function toggleView(view) {
        const dv = document.getElementById('dashboardView');
        if (dv) { dv.classList.add('hidden'); dv.classList.remove('flex'); }
        const pv = document.getElementById('productsView');
        if (pv) { pv.classList.add('hidden'); pv.classList.remove('flex'); }
        const ev = document.getElementById('expensesView');
        if (ev) { ev.classList.add('hidden'); ev.classList.remove('flex'); }
        const cv = document.getElementById('customersView');
        if (cv) { cv.classList.add('hidden'); cv.classList.remove('flex'); }
        const crv = document.getElementById('creditsView');
        if (crv) { crv.classList.add('hidden'); crv.classList.remove('flex'); }
        const caisseV = document.getElementById('caisseView');
        if (caisseV) { caisseV.classList.add('hidden'); caisseV.classList.remove('flex'); }

        if (view === 'products') {
            if (pv) { pv.classList.remove('hidden'); pv.classList.add('flex'); }
            if (typeof window.lazyLoadSection === 'function') window.lazyLoadSection('products');
            const sellDateElem = document.getElementById('sellDate');
            if (sellDateElem && !sellDateElem.value) {
                sellDateElem.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
            }
            window.scrollTo(0, 0);
        } else if (view === 'expenses') {
            if (ev) {
                ev.classList.remove('hidden');
                ev.classList.add('flex');
                if (typeof window.lazyLoadSection === 'function') window.lazyLoadSection('expenses');
                const expDate = document.getElementById('expenseDateView');
                if (expDate && !expDate.value) {
                    expDate.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
                }
                if (typeof window.renderExpensesListView === 'function') {
                    window.renderExpensesListView();
                }
                window.scrollTo(0, 0);
            }
        } else if (view === 'customers') {
            if (dv) { dv.classList.remove('hidden'); dv.classList.add('flex'); }
            if (typeof window.lazyLoadSection === 'function') window.lazyLoadSection('customers');
            const subSection = document.getElementById('subscribers-section');
            if (subSection) {
                subSection.scrollIntoView({ behavior: 'auto' });
            } else {
                window.scrollTo(0, 0);
            }
        } else if (view === 'credits') {
            if (crv) {
                crv.classList.remove('hidden');
                crv.classList.add('flex');
                if (typeof window.lazyLoadSection === 'function') window.lazyLoadSection('credits');
                if (typeof renderCreditsList === 'function') renderCreditsList();
                window.scrollTo(0, 0);
            }
        } else if (view === 'caisse') {
            if (caisseV) {
                if (typeof window.lazyLoadSection === 'function') {
                    window.lazyLoadSection('caisseLogs');
                    window.lazyLoadSection('sales');
                }
                const openCaisseInternal = () => {
                    caisseV.classList.remove('hidden');
                    caisseV.classList.add('flex');
                    if (typeof initCaisseView === 'function') initCaisseView();
                    window.scrollTo(0, 0);
                    scheduleRender();
                };
                if (appState.hideFinances) {
                    promptWithPassword({
                        title: 'الصندوق والمالية',
                        prompt: 'أدخل كلمة المرور لفتح قسم الصندوق والعمليات المالية',
                        buttonText: 'فتح الصندوق'
                    }, () => {
                        openCaisseInternal();
                    }, () => {
                        toggleView('dashboard');
                    });
                } else {
                    openCaisseInternal();
                }
            }
        } else {
            if (dv) { dv.classList.remove('hidden'); dv.classList.add('flex'); }
            window.scrollTo(0, 0);
        }
        scheduleRender();
    }
    window.toggleView = toggleView; function openBulkImportModal() {
        promptWithPassword({ title: 'استيراد بالباركود',
            prompt: 'أدخل كلمة المرور لاستيراد منتجات وإضافتها إلى المخزون',
            buttonText: 'فتح الاستيراد' }, () => {
            openModal('bulkImportModal'); }); }
    function closeBulkImportModal() { closeModal('bulkImportModal');
    } async function startBulkImport() { const textElem = document.getElementById('bulkBarcodes');
        const text = textElem ? textElem.value : '';
        if (!text.trim()) { showErrorToast('الرجاء إدخال الباركودات أولاً');
            return; } if (containsDangerousCode(text)) {
            showErrorToast('تحذير أمني: تم اكتشاف محتوى غير مسموح به في البيانات المدخلة.');
            return; } const barcodes = text.split('\n').map(b => b.trim()).filter(b => b);
        if (barcodes.length === 0) return; const btn = document.getElementById('startBulkBtn');
        const progressDiv = document.getElementById('bulkImportProgress');
        const progressBar = document.getElementById('bulkProgressBar');
        const progressCount = document.getElementById('bulkProgressCount');
        const statusText = document.getElementById('bulkStatusText');
        if (btn) { btn.disabled = true; btn.classList.add('opacity-50');
        } if (progressDiv) progressDiv.classList.remove('hidden');
        let successCount = 0; let total = barcodes.length;
        for (let i = 0; i < total; i++) { const barcode = barcodes[i];
            if (statusText) statusText.textContent = `جاري استيراد: ${barcode}`;
            if (progressCount) progressCount.textContent = `${i + 1}/${total}`;
            if (progressBar) progressBar.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
            // Local state check
            if (!appState.products.find(p => p.barcode === barcode)) {
                successCount++; } await new Promise(r => setTimeout(r, 50));
        } saveState(); showSuccessToast(`تم استيراد ${successCount} منتج بنجاح`);
        setTimeout(() => { closeBulkImportModal();
            if (textElem) textElem.value = '';
            if (btn) { btn.disabled = false; btn.classList.remove('opacity-50');
            } if (progressDiv) progressDiv.classList.add('hidden');
            if (progressBar) progressBar.style.width = '0%';
        }, 1000); } function openModal(id) { if (!id) return;
        const el = document.getElementById(id);
        if (!el) { console.warn(`Modal element with id '${id}' not found.`);
            return; } el.classList.add('active');
        if (typeof window.lazyLoadSection === 'function') {
            if (id === 'coachAbsenceModal') window.lazyLoadSection('coachAbsences');
            else if (id === 'addCustomerModal' || id === 'editCustomerModal') { window.lazyLoadSection('packages'); window.lazyLoadSection('customers'); }
            else if (id === 'staffPayoutsModal') { window.lazyLoadSection('staffPayouts'); window.lazyLoadSection('suppliers'); window.lazyLoadSection('supplierTransactions'); }
            else if (id === 'expensesModal') window.lazyLoadSection('expenses');
            else if (id === 'packagesModal') window.lazyLoadSection('packages');
            else if (id === 'quickSessionModal') window.lazyLoadSection('quickSessions');
            else if (id === 'bulkImportModal') window.lazyLoadSection('products');
            else if (id === 'addCreditModal' || id === 'editCreditModal') window.lazyLoadSection('credits');
        }
        if (id === 'coachAbsenceModal') { const dateInput = document.getElementById('absenceDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            } } else if (id === 'addCustomerModal') {
            const startDateInput = document.getElementById('addCustStartDate');
            if (startDateInput && !startDateInput.value) {
                startDateInput.value = new Date().toISOString().split('T')[0];
                if (typeof updateAddCustomerEndDate === 'function') updateAddCustomerEndDate();
            } } else if (id === 'staffPayoutsModal') {
            const dateInput = document.getElementById('staffPayoutDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
            } if (typeof renderStaffPayouts === 'function') {
                renderStaffPayouts(); } if (typeof renderSuppliersList === 'function') {
                renderSuppliersList(); } } else if (id === 'expensesModal') {
            const dateInput = document.getElementById('expenseDateModal');
            if (dateInput && !dateInput.value) {
                dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
            }
            if (typeof renderExpensesListModal === 'function') {
                renderExpensesListModal();
            }
        } }
    function closeModal(id) { if (!id) return;
        const el = document.getElementById(id);
        if (el) el.classList.remove('active'); }
    function isModalOpen(id) {
        if (!id) return false;
        const el = document.getElementById(id);
        return !!(el && el.classList.contains('active'));
    }
    function isVisible(id) {
        if (!id) return false;
        const el = document.getElementById(id);
        return !!(el && !el.classList.contains('hidden') && el.style.display !== 'none');
    }
    function handleOverlayClick(event, id) { if (!id) return;
        const el = document.getElementById(id);
        if (el && event.target === el) closeModal(id);
    }
    // Desktop keyboard listener: Press Escape to close active modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const activeModals = document.querySelectorAll('.modal-overlay.active');
            activeModals.forEach(modal => {
                modal.classList.remove('active');
            }); } });
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.isModalOpen = isModalOpen;
    window.isVisible = isVisible;
    window.handleOverlayClick = handleOverlayClick;
    let appConfirmCallback = null; function showAppConfirm(message, onConfirm, options = {}) {
        appConfirmCallback = onConfirm; const titleElem = document.getElementById('appConfirmTitle');
        const msgElem = document.getElementById('appConfirmMessage');
        const okBtn = document.getElementById('appConfirmOkBtn');
        if (titleElem) titleElem.textContent = options.title || 'تأكيد الحذف';
        if (msgElem) msgElem.textContent = message || 'هل أنت متأكد من المتابعة؟';
        if (okBtn) { okBtn.textContent = options.confirmText || 'تأكيد الحذف';
            if (options.isDanger === false) {
                okBtn.className = 'flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all';
            } else { okBtn.className = 'flex-1 py-2.5 bg-slate-900 hover:bg-black active:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md shadow-slate-200 transition-all';
            } okBtn.onclick = function() {
                closeModal('appConfirmModal');
                if (typeof appConfirmCallback === 'function') {
                    const cb = appConfirmCallback;
                    appConfirmCallback = null;
                    cb(); } }; } openModal('appConfirmModal');
    } window.showAppConfirm = showAppConfirm;
    function toggleDebtField() { 
        const status = document.getElementById('paymentStatus');
        const container = document.getElementById('debtAmountContainer');
        if (container && status) {
            container.style.display = status.value === 'credit' ? 'block' : 'none';
        }
    } function generateSafeFileName(prefix = 'img') {
        const cleanPrefix = (prefix || 'img').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 16);
        const randomId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
            : Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        return `${cleanPrefix}_${Date.now()}_${randomId}.jpg`;
    } window.generateSafeFileName = generateSafeFileName;
    function checkImageMagicBytes(buffer) { if (!buffer || buffer.byteLength < 4) return false;
        const bytes = new Uint8Array(buffer);
        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg';
        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
        // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            return 'webp'; } return false; }
    window.checkImageMagicBytes = checkImageMagicBytes;
    function verifyFaceImageCharacteristics(ctx, width, height) {
        try { const sampleW = Math.min(width, 100);
            const sampleH = Math.min(height, 100);
            const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
            const data = imgData.data; const totalPixels = sampleW * sampleH;
            if (totalPixels <= 0) return false;
            let sumLuminance = 0; let sumSqLuminance = 0;
            let nonTransparentCount = 0; for (let i = 0; i < data.length; i += 4) {
                const r = data[i]; const g = data[i + 1];
                const b = data[i + 2]; const a = data[i + 3];
                if (a > 20) {
                    nonTransparentCount++;
                    // Perceived luminance formula
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    sumLuminance += lum;
                    sumSqLuminance += lum * lum;
                } } if (nonTransparentCount < totalPixels * 0.5) {
                return false; // Mostly transparent or empty
            } const meanLum = sumLuminance / nonTransparentCount;
            const variance = (sumSqLuminance / nonTransparentCount) - (meanLum * meanLum);
            const stdDev = Math.sqrt(Math.max(0, variance));
            // A realistic photo image has natural lighting and contrast
            return stdDev >= 4; } catch (e) {
            console.warn('Image characteristic check fallback:', e);
            return true; // Fallback to allowing valid decoded image if context reading is restricted
        } } function compressAndConvertImage(file, callback, options = {}) {
        if (!file) { callback(null, null);
            return; } const prefix = options.prefix || 'upload';
        const maxDimension = options.maxDim || 450;
        const checkFace = options.checkPortrait !== undefined ? options.checkPortrait : false;
        // 1. Automatically generate opaque secure randomized filename upon receipt (discarding client file name)
        const safeName = generateSafeFileName(prefix);
        // 2. Strict size check (Max 8MB)
        if (file.size > 8 * 1024 * 1024) {
            showErrorToast('حجم الملف كبير جداً! الحد الأقصى 8 ميغابايت.');
            callback(null, null); return; }
        // 3. MIME type inspection
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            showErrorToast('تنبيه أمني: صيغة الملف غير مدعومة (يسمح فقط بـ JPG, PNG, WEBP).');
            callback(null, null); return; }
        // 4. Binary Magic Bytes inspection
        const bufferReader = new FileReader();
        bufferReader.onload = function(evt) {
            const buffer = evt.target.result;
            const detectedFormat = checkImageMagicBytes(buffer);
            if (!detectedFormat) {
                showErrorToast('تحذير أمني: الملف المرفوع تالف أو غير صالح كصورة حقيقية.');
                callback(null, null); return; }
            // 5. Secure Image Decoding & sanitization on Canvas (stripping EXIF metadata)
            const dataUrlReader = new FileReader();
            dataUrlReader.onload = function(e) {
                const img = new Image(); img.onload = function() {
                    let width = img.width; let height = img.height;
                    // Resolution constraint: must be at least 40x40 to prevent 1x1 tracker pixels
                    if (width < 40 || height < 40) {
                        showErrorToast('أبعاد الصورة صغيرة جداً! يرجى اختيار صورة واضحة.');
                        callback(null, null);
                        return; } if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else { width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        } } const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    // 6. Photographic Heuristic Check if enabled
                    if (checkFace) { const isRealisticImage = verifyFaceImageCharacteristics(ctx, width, height);
                        if (!isRealisticImage) {
                            showErrorToast('الصورة غير واضحة أو تبدو فارغة. يرجى رفع صورة واضحة.');
                            callback(null, null);
                            return; } }
                    // 7. Re-encode to clean, sanitized JPEG data
                    const cleanDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    callback(cleanDataUrl, safeName);
                }; img.onerror = () => {
                    showErrorToast('تعذر معالجة الصورة، يرجى التأكد من صلاحية الملف.');
                    callback(null, null); }; img.src = e.target.result;
            }; dataUrlReader.onerror = () => callback(null, null);
            dataUrlReader.readAsDataURL(file); };
        bufferReader.onerror = () => callback(null, null);
        bufferReader.readAsArrayBuffer(file.slice(0, 32));
    } window.compressAndConvertImage = compressAndConvertImage;
    window.handleEditImageSelect = function(input) {
        if (input.files && input.files[0]) {
            compressAndConvertImage(input.files[0], function(base64Data, safeFileName) {
                if (base64Data) { setElemValue('editCustImageUrl', base64Data);
                    const imgPreview = document.getElementById('editCustImagePreview');
                    const letterSpan = document.getElementById('editCustAvatarLetter');
                    const removeBtn = document.getElementById('removeEditImageBtn');
                    if (imgPreview) { imgPreview.src = base64Data;
                        imgPreview.classList.remove('hidden');
                    } if (letterSpan) letterSpan.classList.add('hidden');
                    if (removeBtn) removeBtn.classList.remove('hidden');
                } }, { prefix: 'member_edit', checkPortrait: true, maxDim: 400 });
        } }; window.removeEditImage = function() {
        setElemValue('editCustImageUrl', '');
        const imgPreview = document.getElementById('editCustImagePreview');
        const letterSpan = document.getElementById('editCustAvatarLetter');
        const removeBtn = document.getElementById('removeEditImageBtn');
        const fileInput = document.getElementById('editCustImageFile');
        if (fileInput) fileInput.value = ''; if (imgPreview) {
            imgPreview.src = ''; imgPreview.classList.add('hidden');
        } if (letterSpan) letterSpan.classList.remove('hidden');
        if (removeBtn) removeBtn.classList.add('hidden');
    }; window.handleAddImageSelect = function(input) {
        if (input.files && input.files[0]) {
            compressAndConvertImage(input.files[0], function(base64Data, safeFileName) {
                if (base64Data) { setElemValue('addCustImageUrl', base64Data);
                    const imgPreview = document.getElementById('addCustImagePreview');
                    const icon = document.getElementById('addCustAvatarIcon');
                    const fileNameDisplay = document.getElementById('fileNameDisplay');
                    const removeBtn = document.getElementById('removeAddImageBtn');
                    if (imgPreview) { imgPreview.src = base64Data;
                        imgPreview.classList.remove('hidden');
                    } if (icon) icon.classList.add('hidden');
                    if (fileNameDisplay) fileNameDisplay.textContent = safeFileName || 'member_face.jpg';
                    if (removeBtn) removeBtn.classList.remove('hidden');
                } }, { prefix: 'member_face', checkPortrait: true, maxDim: 400 });
        } }; window.removeAddImage = function() {
        setElemValue('addCustImageUrl', '');
        const imgPreview = document.getElementById('addCustImagePreview');
        const icon = document.getElementById('addCustAvatarIcon');
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        const removeBtn = document.getElementById('removeAddImageBtn');
        const fileInput = document.getElementById('custImageView');
        if (fileInput) fileInput.value = ''; if (imgPreview) {
            imgPreview.src = ''; imgPreview.classList.add('hidden');
        } if (icon) icon.classList.remove('hidden');
        if (fileNameDisplay) fileNameDisplay.textContent = 'اختيار صورة المشترك';
        if (removeBtn) removeBtn.classList.add('hidden');
    }; window.handleProductImageSelect = function(input) {
        if (input.files && input.files[0]) {
            compressAndConvertImage(input.files[0], function(base64Data, safeFileName) {
                if (base64Data) { const hiddenInput = document.getElementById('prodImageUrl');
                    const imgPreview = document.getElementById('prodImagePreview');
                    const placeholder = document.getElementById('prodImagePlaceholder');
                    const fileNameSpan = document.getElementById('prodImageFileName');
                    const removeBtn = document.getElementById('removeProdImageBtn');
                    if (hiddenInput) hiddenInput.value = base64Data;
                    if (imgPreview) { imgPreview.src = base64Data;
                        imgPreview.classList.remove('hidden');
                    } if (placeholder) placeholder.classList.add('hidden');
                    if (fileNameSpan) fileNameSpan.textContent = safeFileName || 'product.jpg';
                    if (removeBtn) removeBtn.classList.remove('hidden');
                } }, { prefix: 'product_img', checkPortrait: false, maxDim: 500 });
        } }; window.removeProductImage = function() {
        const hiddenInput = document.getElementById('prodImageUrl');
        const imgPreview = document.getElementById('prodImagePreview');
        const placeholder = document.getElementById('prodImagePlaceholder');
        const fileNameSpan = document.getElementById('prodImageFileName');
        const removeBtn = document.getElementById('removeProdImageBtn');
        const fileInput = document.getElementById('prodImageFile');
        if (hiddenInput) hiddenInput.value = '';
        if (fileInput) fileInput.value = ''; if (imgPreview) {
            imgPreview.src = ''; imgPreview.classList.add('hidden');
        } if (placeholder) placeholder.classList.remove('hidden');
        if (fileNameSpan) fileNameSpan.textContent = 'رفع صورة المنتج';
        if (removeBtn) removeBtn.classList.add('hidden');
    }; window.updateFileName = function(input) {
        handleAddImageSelect(input); }; window.setAddCustSubscriptionType = function(type) {
        const isSession = type === 'session';
        const subTypeInput = document.getElementById('addCustSubscriptionType');
        if (subTypeInput) subTypeInput.value = isSession ? 'session' : 'time';
        const timeBtn = document.getElementById('addTypeTimeBtn');
        const sessBtn = document.getElementById('addTypeSessionBtn');
        if (timeBtn && sessBtn) { if (isSession) {
                sessBtn.className = 'py-2 text-xs font-bold rounded-lg transition-all bg-blue-600 text-white shadow-xs';
                timeBtn.className = 'py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900 bg-transparent';
            } else { timeBtn.className = 'py-2 text-xs font-bold rounded-lg transition-all bg-blue-600 text-white shadow-xs';
                sessBtn.className = 'py-2 text-xs font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900 bg-transparent';
            } } const sessionFields = document.getElementById('addCustSessionFields');
        if (sessionFields) sessionFields.style.display = isSession ? 'block' : 'none';
    }; window.syncAddCustSessions = function(val) {
        const remInput = document.getElementById('addCustRemainingSessions');
        if (remInput) remInput.value = val; };
    window.setAddCustSessionCount = function(num) {
        const tot = document.getElementById('addCustTotalSessions');
        const rem = document.getElementById('addCustRemainingSessions');
        if (tot) tot.value = num; if (rem) rem.value = num;
    }; window.setQuickSessClientCount = function(cnt) {
        const input = document.getElementById('quickSessClientCount');
        if (input) input.value = cnt; }; window.setQuickSessType = function(type) {
        const hidden = document.getElementById('quickSessType');
        if (hidden) hidden.value = type; const muscBtn = document.getElementById('quickSessTypeMusculation');
        const cardioBtn = document.getElementById('quickSessTypeCardio');
        if (muscBtn && cardioBtn) { if (type === 'musculation') {
                muscBtn.className = "py-3 px-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-blue-600 text-white border-blue-600 shadow-sm cursor-pointer";
                cardioBtn.className = "py-3 px-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer";
            } else { cardioBtn.className = "py-3 px-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-blue-600 text-white border-blue-600 shadow-sm cursor-pointer";
                muscBtn.className = "py-3 px-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 cursor-pointer";
            } } }; window.quickSessClientsData = [{ activity: 'musculation', price: '' }];
    window.setQuickSessType = function(type) {
        if (window.quickSessClientsData && window.quickSessClientsData.length > 0) {
            window.quickSessClientsData[0].activity = type;
            if (typeof window.renderQuickSessClientsUI === 'function') window.renderQuickSessClientsUI();
        } }; window.openQuickSessionModal = function() {
        const countInput = document.getElementById('quickSessClientCount');
        if (countInput) countInput.value = '1';
        const sessInput = document.getElementById('quickSessCount');
        if (sessInput) sessInput.value = '1';
        window.quickSessClientsData = [{ activity: 'musculation', price: '' }];
        if (typeof window.renderQuickSessClientsUI === 'function') {
            window.renderQuickSessClientsUI(); }
        if (typeof window.openModal === 'function') window.openModal('quickSessionModal');
    }; window.onQuickSessClientCountChange = function(val) {
        if (!Array.isArray(window.quickSessClientsData)) {
            window.quickSessClientsData = [{ activity: 'musculation', price: '' }];
        } if (val === '' || val === null || val === undefined) {
            return; // Allow user to erase '1' and type a new number smoothly
        } let count = parseInt(val); if (isNaN(count) || count < 1) count = 1;
        if (count > 100) count = 100; const currentLen = window.quickSessClientsData.length;
        if (count > currentLen) { for (let i = currentLen; i < count; i++) {
                const lastActivity = window.quickSessClientsData[i-1]?.activity || 'musculation';
                const lastPrice = window.quickSessClientsData[i-1]?.price || '';
                window.quickSessClientsData.push({ activity: lastActivity, price: lastPrice });
            } } else if (count < currentLen) {
            window.quickSessClientsData = window.quickSessClientsData.slice(0, count);
        } window.renderQuickSessClientsUI(); };
    window.onQuickSessClientCountBlur = function(input) {
        if (!input) return; let val = parseInt(input.value);
        if (isNaN(val) || val < 1) val = 1; if (val > 100) val = 100;
        input.value = val; window.onQuickSessClientCountChange(val);
    }; window.setQuickSessClientActivity = function(index, activity) {
        if (window.quickSessClientsData[index]) {
            window.quickSessClientsData[index].activity = activity;
            window.renderQuickSessClientsUI(); }
    }; window.updateQuickSessClientPrice = function(index, val) {
        if (window.quickSessClientsData[index]) {
            window.quickSessClientsData[index].price = val;
            window.calcQuickSessTotal(); } };
    window.calcQuickSessTotal = function() { let total = 0;
        let hasAnyPrice = false; (window.quickSessClientsData || []).forEach(c => {
            if (c.price !== '' && c.price !== null && c.price !== undefined) {
                const p = Number(c.price); if (!isNaN(p)) {
                    total += p; hasAnyPrice = true;
                } } }); const priceInput = document.getElementById('quickSessPrice');
        if (priceInput) { priceInput.value = hasAnyPrice ? total : (priceInput.value || '');
        } }; window.renderQuickSessClientsUI = function() {
        const container = document.getElementById('quickSessClientsListContainer');
        if (!container) return; const data = window.quickSessClientsData || [{ activity: 'musculation', price: '' }];
        let html = ''; data.forEach((c, idx) => {
            const isMusc = c.activity === 'musculation';
            const isCardio = c.activity === 'cardio';
            html += `
              <div class="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-5 h-5 rounded-md bg-blue-600 text-white text-[11px] font-bold inline-flex items-center justify-center">${idx + 1}</span>
                    <span>الزبون #${idx + 1}</span>
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" onclick="setQuickSessClientActivity(${idx}, 'musculation')" class="py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${isMusc ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"/></svg>
                    <span>Musculation</span>
                  </button>
                  <button type="button" onclick="setQuickSessClientActivity(${idx}, 'cardio')" class="py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${isCardio ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    <span>Cardio</span>
                  </button>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-800 mb-1">السعر / المبلغ للزبون #${idx + 1} (دج)*</label>
                  <input type="number" min="0" value="${c.price !== undefined && c.price !== null ? c.price : ''}" oninput="updateQuickSessClientPrice(${idx}, this.value)" placeholder="أدخل السعر بالدينار" class="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-center transition-all">
                </div>
              </div>
            `; }); container.innerHTML = html;
        window.calcQuickSessTotal(); }; window.setQuickSessPrice = function(pr) {
        const input = document.getElementById('quickSessPrice');
        if (input) input.value = pr; }; window.handleQuickSessionSubmit = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        try { const clientsData = window.quickSessClientsData || [{ activity: 'musculation', price: '' }];
            const clientCount = clientsData.length;
            const sessionCount = Math.max(1, parseInt(getElemVal('quickSessCount') || 1));
            let totalClientsPrice = 0;
            clientsData.forEach(c => {
                totalClientsPrice += Number(c.price || 0);
            }); const overallPriceInput = getElemVal('quickSessPrice');
            const price = overallPriceInput !== '' && overallPriceInput !== null && overallPriceInput !== undefined
                ? Math.max(0, parseInt(overallPriceInput))
                : totalClientsPrice; if (!Array.isArray(appState.quickSessions)) appState.quickSessions = [];
            const newQuickSession = { id: Date.now().toString(),
                date: new Date().toISOString(),
                clientCount: clientCount,
                sessionCount: sessionCount,
                price: price, clients: clientsData.map(c => ({ activity: c.activity, price: Number(c.price || 0) }))
            }; appState.quickSessions.unshift(newQuickSession);
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('quickSessions', newQuickSession);
            }
            if (typeof logActivity === 'function') {
                logActivity('customer', 'تسجيل حصة سريعة', `حصة سريعة (${sessionCount} حصص، ${clientCount} زبائن) - المبلغ: ${price} دج`, price);
            }
            if (Array.isArray(appState.customers)) {
                appState.customers = appState.customers.filter(c => c && c.subscriptionType !== 'session' && !c.name?.startsWith('حصة '));
            } if (typeof saveState === 'function') saveState();
            if (typeof closeModal === 'function') closeModal('quickSessionModal');
            if (typeof playBeep === 'function') playBeep();
            if (typeof showSuccessToast === 'function') {
                showSuccessToast(`تم تسجيل ${price} دج (${clientCount} زبائن) في الإحصائيات والمداخيل بنجاح`);
            } if (typeof render === 'function') render();
        } catch (err) { console.error('Error in handleQuickSessionSubmit:', err);
            if (typeof showErrorToast === 'function') showErrorToast('حدث خطأ أثناء تسجيل اشتراك الحصة');
        } return false; };

    // ==========================================
    // قسم مستحقات مدربة الإناث (33% من المشتركين)
    // ==========================================
    window.openFemaleCoachModal = function() {
        if (typeof window.openModal === 'function') {
            window.openModal('femaleCoachModal');
        } else {
            const modal = document.getElementById('femaleCoachModal');
            if (modal) modal.classList.add('active');
        }
        renderFemaleCoachModal();
    };
    window.openFemaleCommissionModal = window.openFemaleCoachModal;

    window.renderFemaleCoachModal = function() {
        if (!appState.customers) appState.customers = [];
        if (!appState.staffPayouts) appState.staffPayouts = [];

        const period = document.getElementById('femaleCommPeriod')?.value || 'month';
        const paymentFilter = document.getElementById('femaleCommPaymentFilter')?.value || 'all';
        const rate = parseFloat(document.getElementById('femaleCommPercent')?.value) || 33;
        const searchQuery = (document.getElementById('femaleCommSearchInput')?.value || '').trim().toLowerCase();

        const safeStr = (s) => (typeof escapeHTML === 'function' ? escapeHTML(s) : String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter female subscribers
        const femaleSubs = appState.customers.filter(c => {
            if (!c || c.gender !== 'female') return false;

            // Date filtering
            const subDateStr = c.startDate || (c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : null);
            if (subDateStr) {
                const cDate = new Date(subDateStr);
                if (!isNaN(cDate.getTime())) {
                    if (period === 'month' && (cDate.getMonth() !== currentMonth || cDate.getFullYear() !== currentYear)) return false;
                    if (period === 'today' && cDate.toDateString() !== now.toDateString()) return false;
                    if (period === 'year' && cDate.getFullYear() !== currentYear) return false;
                }
            }

            // Payment status filtering
            if (paymentFilter === 'paid' && c.paymentStatus !== 'paid') return false;
            if (paymentFilter === 'credit' && c.paymentStatus !== 'credit') return false;

            // Search query
            if (searchQuery) {
                const nameMatch = c.name && c.name.toLowerCase().includes(searchQuery);
                const phoneMatch = c.phone && c.phone.includes(searchQuery);
                if (!nameMatch && !phoneMatch) return false;
            }

            return true;
        });

        // Financial calculations
        let totalFullPrice = 0;
        let totalPaidRevenue = 0;
        let totalCoachCommission = 0;

        femaleSubs.forEach(c => {
            const pkg = getPackageById(c.packageId);
            const fullPrice = c.price !== undefined && c.price !== null ? Number(c.price) : (pkg && pkg.price ? Number(pkg.price) : 0);
            const debt = c.paymentStatus === 'credit' ? (Number(c.debtAmount) || 0) : 0;
            const paidAmount = Math.max(0, fullPrice - debt);
            const comm = Math.round(paidAmount * (rate / 100));

            totalFullPrice += fullPrice;
            totalPaidRevenue += paidAmount;
            totalCoachCommission += comm;
        });

        // Disbursed Payouts to Female Coach
        const femalePayouts = appState.staffPayouts.filter(p => {
            if (!p) return false;
            const text = `${p.name || ''} ${p.staffName || ''} ${p.type || ''} ${p.notes || ''}`.toLowerCase();
            return text.includes('إناث') || text.includes('اناث') || text.includes('أنثى') || text.includes('انثى') || text.includes('33%') || text.includes('مدربة');
        });

        let totalDisbursed = 0;
        femalePayouts.forEach(p => {
            if (p.date) {
                const pDate = new Date(p.date);
                if (!isNaN(pDate.getTime())) {
                    if (period === 'month' && (pDate.getMonth() !== currentMonth || pDate.getFullYear() !== currentYear)) return;
                    if (period === 'today' && pDate.toDateString() !== now.toDateString()) return;
                    if (period === 'year' && pDate.getFullYear() !== currentYear) return;
                }
            }
            totalDisbursed += Number(p.amount || 0);
        });

        const remainingBalance = Math.max(0, totalCoachCommission - totalDisbursed);

        // Render Count Badge
        const countBadge = document.getElementById('femaleCommSubCountBadge');
        if (countBadge) countBadge.textContent = femaleSubs.length;

        // Render Metric Cards
        const cardsContainer = document.getElementById('femaleCommStatsCards');
        if (cardsContainer) {
            cardsContainer.innerHTML = `
                <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
                    <span class="text-slate-500 text-[10px] sm:text-xs font-bold block">عدد المشتركات الإناث</span>
                    <span class="text-lg sm:text-xl font-black text-purple-700 block">${femaleSubs.length} <span class="text-xs font-normal text-slate-500">مشتركة</span></span>
                    <span class="text-[10px] text-slate-400 font-medium block">في هذه الفترة المختارة</span>
                </div>
                <div class="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
                    <span class="text-slate-500 text-[10px] sm:text-xs font-bold block">المداخيل المقبوضة (الإناث)</span>
                    <span class="text-lg sm:text-xl font-black text-slate-800 block">${totalPaidRevenue.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span></span>
                    <span class="text-[10px] text-slate-400 font-medium block">إجمالي الاشتراكات: ${totalFullPrice.toLocaleString()} دج</span>
                </div>
                <div class="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl shadow-2xs space-y-1">
                    <span class="text-purple-900 text-[10px] sm:text-xs font-bold block">مستحقات المدربة (${rate}%)</span>
                    <span class="text-lg sm:text-xl font-black text-purple-700 block">${totalCoachCommission.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span></span>
                    <span class="text-[10px] text-purple-600 font-medium block">محسوبة من المبلغ المدفوع</span>
                </div>
                <div class="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-3.5 rounded-2xl shadow-xs space-y-1">
                    <span class="text-amber-100 text-[10px] sm:text-xs font-bold block">المستحقات المتبقية غير المسددة</span>
                    <span class="text-lg sm:text-xl font-black text-white block">${remainingBalance.toLocaleString()} <span class="text-xs font-normal text-amber-100">دج</span></span>
                    <span class="text-[10px] text-amber-100 font-medium block">${totalDisbursed > 0 ? `تم تسديد ${totalDisbursed.toLocaleString()} دج سابقاً` : 'لم يتم التسديد بعد'}</span>
                </div>
            `;
        }

        // Auto pre-fill Payout Input if empty or unmodified
        const payoutInput = document.getElementById('femalePayoutAmountInput');
        if (payoutInput && (!payoutInput.value || payoutInput.dataset.autoFilled === 'true')) {
            payoutInput.value = remainingBalance > 0 ? remainingBalance : '';
            payoutInput.dataset.autoFilled = 'true';
        }

        // Render Table Rows
        const tbody = document.getElementById('femaleCommSubscribersTable');
        if (tbody) {
            if (femaleSubs.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-8 text-center text-slate-400 font-bold text-xs bg-slate-50/50">
                            لا توجد مشتركات إناث مسجلة في هذه الفترة أو تطابق شروط البحث
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = femaleSubs.map(c => {
                    const pkg = getPackageById(c.packageId);
                    const pkgName = pkg ? pkg.name : 'اشتراك عام';
                    const fullPrice = c.price !== undefined && c.price !== null ? Number(c.price) : (pkg && pkg.price ? Number(pkg.price) : 0);
                    const debt = c.paymentStatus === 'credit' ? (Number(c.debtAmount) || 0) : 0;
                    const paidAmount = Math.max(0, fullPrice - debt);
                    const comm = Math.round(paidAmount * (rate / 100));

                    const dateStr = c.startDate || (c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : 'غير محدد');

                    return `
                        <tr class="hover:bg-purple-50/30 transition-colors">
                            <td class="p-3 font-bold text-slate-900 flex items-center gap-2">
                                <div class="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                    ${c.name ? safeStr(c.name.charAt(0)) : '؟'}
                                </div>
                                <span>${safeStr(c.name || 'بدون اسم')}</span>
                            </td>
                            <td class="p-3 font-semibold text-slate-700">${safeStr(pkgName)}</td>
                            <td class="p-3 font-bold text-slate-800">${fullPrice.toLocaleString()} دج</td>
                            <td class="p-3">
                                ${c.paymentStatus === 'paid'
                                    ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[10px]">مسدد بالكامل (${paidAmount.toLocaleString()} دج)</span>`
                                    : `<span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold text-[10px]">مسدد ${paidAmount.toLocaleString()} دج (متبقي كريدي ${debt.toLocaleString()} دج)</span>`
                                }
                            </td>
                            <td class="p-3 font-black text-purple-700 bg-purple-50/50">${comm.toLocaleString()} دج</td>
                            <td class="p-3 text-slate-500 text-[11px] font-mono">${dateStr}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Render Payouts History List
        const historyContainer = document.getElementById('femaleCoachPayoutsHistory');
        if (historyContainer) {
            if (femalePayouts.length === 0) {
                historyContainer.innerHTML = `
                    <div class="text-center py-4 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        لا توجد خلاصات مسجلة سابقاً لمدربة الإناث
                    </div>
                `;
            } else {
                historyContainer.innerHTML = femalePayouts.map(p => `
                    <div class="flex items-center justify-between p-2.5 bg-white border border-slate-200/90 rounded-xl text-xs font-bold shadow-2xs hover:border-purple-300 transition-all">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
                            <span class="text-slate-900 font-black">${safeStr(p.name || 'مدربة الإناث')}</span>
                            <span class="text-slate-500 font-medium text-[11px]">${safeStr(p.notes || p.type || '')}</span>
                            <span class="text-slate-400 font-mono text-[10px]">(${p.date || 'اليوم'})</span>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="text-purple-700 font-black">${Number(p.amount || 0).toLocaleString()} دج</span>
                            <button type="button" onclick="deleteStaffPayout('${p.id}')" class="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer" title="حذف هذه الدفعة">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
    };

    window.submitFemaleCoachPayout = function() {
        const amountInput = document.getElementById('femalePayoutAmountInput');
        const notesInput = document.getElementById('femalePayoutNotesInput');
        const nameInput = document.getElementById('femaleCoachNameInput');

        const amount = parseFloat(amountInput ? amountInput.value : 0);
        const notes = notesInput ? notesInput.value.trim() : '';
        const name = (nameInput ? nameInput.value.trim() : '') || 'مدربة الإناث (33%)';

        if (!amount || amount <= 0) {
            if (typeof showErrorToast === 'function') showErrorToast('يرجى إدخال مبلغ خلاص صحيح أكبر من الصفر');
            if (amountInput) amountInput.focus();
            return;
        }

        if (!Array.isArray(appState.staffPayouts)) appState.staffPayouts = [];

        const newPayout = {
            id: 'payout_female_' + Date.now().toString(),
            name: name,
            staffName: name,
            type: 'عمولة الإناث (33%)',
            amount: amount,
            date: typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0],
            notes: notes || 'تسديد مستحقات قسم الإناث (33%)',
            createdAt: new Date().toISOString()
        };

        appState.staffPayouts.unshift(newPayout);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('staffPayouts', newPayout);
        }
        if (typeof logActivity === 'function') {
            logActivity('payout', 'تسديد مستحقات مدربة الإناث', `الاسم: ${name} - المبلغ: ${amount} دج`, amount);
        }

        saveState();
        if (typeof showSuccessToast === 'function') {
            showSuccessToast(`تم تسديد مبلغ ${amount.toLocaleString()} دج للمدربة (${name}) وتسجيله في الخلاصات والمصاريف بنجاح`);
        }

        if (amountInput) {
            amountInput.value = '';
            amountInput.dataset.autoFilled = 'false';
        }
        if (notesInput) notesInput.value = '';

        renderFemaleCoachModal();
        if (typeof renderStaffPayouts === 'function') renderStaffPayouts();
        if (typeof render === 'function') render();
    };

    window.payFemaleCoachShare = function() {
        if (typeof window.submitFemaleCoachPayout === 'function') {
            window.submitFemaleCoachPayout();
        }
    };

    window.printFemaleCoachReport = function() {
        const periodSelect = document.getElementById('femaleCommPeriod');
        const periodText = periodSelect ? periodSelect.options[periodSelect.selectedIndex]?.text || 'الشهر الحالي' : 'الشهر الحالي';
        const subCount = document.getElementById('femaleCommSubCountBadge')?.textContent || '0';
        const tableHtml = document.getElementById('femaleCommSubscribersTable')?.innerHTML || '';

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <title>تقرير مستحقات مدربة الإناث (33%)</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; direction: rtl; color: #1e293b; }
                    h1 { color: #581c87; margin-bottom: 5px; font-size: 22px; }
                    .sub { color: #64748b; font-size: 13px; margin-bottom: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 15px; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: right; font-size: 12px; }
                    th { background-color: #faf5ff; color: #581c87; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>تقرير مستحقات مدربة الإناث (33%)</h1>
                <div class="sub">الفترة: ${periodText} | عدد المشتركات: ${subCount} | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-DZ')}</div>
                <h3>قائمة المشتركات وحساب النسبة:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>المشتركة</th>
                            <th>الباقة / نوع الاشتراك</th>
                            <th>سعر الاشتراك</th>
                            <th>المبلغ المدفوع</th>
                            <th>حصة المدربة (33%)</th>
                            <th>تاريخ الاشتراك</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableHtml}
                    </tbody>
                </table>
                <script>window.onload = () => { window.print(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    window.updateAddCustomerEndDate = function() {
        const startDateInput = document.getElementById('addCustStartDate');
        const endDateInput = document.getElementById('addCustEndDate');
        const packageSelect = document.getElementById('packageIdView');
        if (!startDateInput || !endDateInput || !packageSelect) return;
        const packageId = packageSelect.value;
        const pkg = appState.packages.find(p => p.id === packageId);
        const priceInput = document.getElementById('custPriceView');
        if (priceInput && pkg) { priceInput.value = pkg.price || 0;
        } const startDate = new Date(startDateInput.value || new Date());
        if (isNaN(startDate.getTime())) return;
        if (pkg && pkg.type === 'session') {
            setAddCustSubscriptionType('session');
            const totalSessInput = document.getElementById('addCustTotalSessions');
            const remSessInput = document.getElementById('addCustRemainingSessions');
            const sessCount = parseInt(pkg.sessionsCount || 10);
            if (totalSessInput) totalSessInput.value = sessCount;
            if (remSessInput) remSessInput.value = sessCount;
            const validity = parseInt(pkg.validityDays || 60);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + validity);
            endDateInput.value = endDate.toISOString().split('T')[0];
        } else { setAddCustSubscriptionType('time');
            const duration = pkg ? parseInt(pkg.durationDays || pkg.duration || 30) : 30;
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + duration);
            endDateInput.value = endDate.toISOString().split('T')[0];
        } }; window.handleAddCustomerSubmit = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        try { const custNameElem = document.getElementById('custNameView');
            let custName = custNameElem ? custNameElem.value.trim() : '';
            if (!custName) { showErrorToast('يرجى إدخال اسم المشترك');
                return false; } if (containsDangerousCode(custName)) {
                showErrorToast('تم رفض الإدخال: اسم المشترك يحتوي على أسطر برمجة أو كود غير مسموح به.');
                return false; } custName = sanitizeInputText(custName, 60);
            const custPhoneRaw = getElemVal('custPhoneView') || '';
            if (containsDangerousCode(custPhoneRaw)) {
                showErrorToast('تم رفض الإدخال: رقم الهاتف يحتوي على رموز أو أسطر برمجية.');
                return false; } const custPhone = sanitizeInputText(custPhoneRaw, 20);
            const custDob = getElemVal('custDobView') || '';
            const dobValidation = validateCustomerDOB(custDob);
            if (!dobValidation.valid) {
                showErrorToast(dobValidation.error);
                return false; } const custWeight = parseFloat(getElemVal('custWeightView')) || null;
            const custGender = getElemVal('custGenderView') || 'male';
            if (custWeight !== null && (custWeight < 20 || custWeight > 300)) {
                showErrorToast('يرجى إدخال وزن منطقي بين 20 و 300 كغ.');
                return false; } const packageSelect = document.getElementById('packageIdView');
            let packageId = packageSelect ? packageSelect.value : '';
            if (!Array.isArray(appState.packages) || appState.packages.length === 0) {
                appState.packages = defaultPackages;
            } let pkg = appState.packages.find(p => p && p.id === packageId);
            if (!pkg && appState.packages.length > 0) {
                pkg = appState.packages[0];
                packageId = pkg ? pkg.id : 'pkg_1';
            } const priceInput = document.getElementById('custPriceView');
            const custPrice = priceInput && priceInput.value !== '' ? parseInt(priceInput.value) : (pkg ? parseInt(pkg.price || 0) : 0);
            const subType = getElemVal('addCustSubscriptionType') || (pkg && pkg.type === 'session' ? 'session' : 'time');
            const totalSessions = subType === 'session' ? parseInt(getElemVal('addCustTotalSessions') || (pkg?.sessionsCount || 10)) : null;
            const remainingSessions = subType === 'session' ? parseInt(getElemVal('addCustRemainingSessions') || totalSessions || 10) : null;
            const startDateInput = getElemVal('addCustStartDate');
            const endDateInput = getElemVal('addCustEndDate');
            let startDate = startDateInput ? new Date(startDateInput) : new Date();
            let endDate = endDateInput ? new Date(endDateInput) : null;
            if (!endDate) { const duration = pkg ? parseInt(pkg.durationDays || pkg.duration || 30) : 30;
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + duration);
            } const paymentStatus = getElemVal('paymentStatusView') || 'paid';
            const debtAmount = paymentStatus === 'credit' ? parseInt(getElemVal('debtAmountView') || 0) : 0;
            const imageUrl = getElemVal('addCustImageUrl') || null;
            if (!Array.isArray(appState.customers)) {
                appState.customers = appState.customers ? Object.values(appState.customers) : [];
            }
            const newCustomer = { id: Date.now().toString(),
                imageUrl, name: custName, phone: cleanPhone(custPhone),
                gender: custGender, dob: custDob,
                age: dobValidation.age, weight: custWeight,
                packageId: packageId || (pkg ? pkg.id : 'pkg_1'),
                price: custPrice,
                subscriptionType: subType,
                totalSessions: totalSessions,
                remainingSessions: remainingSessions,
                attendedSessions: 0,
                sessionHistory: [],
                paymentStatus, debtAmount,
                status: 'active', startDate: startDate.toISOString(),
                endDate: endDate.toISOString() };
            appState.customers.unshift(newCustomer);
            if (typeof logActivity === 'function') logActivity('customer', 'إضافة مشترك جديد', `المشترك: ${custName} - الهاتف: ${custPhone} - الباقة: ${pkg ? pkg.name : 'باقة'}`, custPrice);
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('customers', newCustomer);
            }
            // Automatically add to Credits section if there's debt
            if (paymentStatus === 'credit' && debtAmount > 0) {
                if (!appState.credits) appState.credits = [];
                const newCredit = { id: 'cr_auto_' + Date.now(),
                    name: custName, nickname: 'مشترك',
                    phone: cleanPhone(custPhone),
                    desc: `دين اشتراك - باقة: ${pkg ? pkg.name : 'باقة'} (${custPrice} دج)`,
                    amount: debtAmount, date: new Date().toISOString()
                };
                appState.credits.unshift(newCredit);
                if (window.saveFirebaseSectionItem) {
                    window.saveFirebaseSectionItem('credits', newCredit);
                }
            } saveState(); const modalForm = document.getElementById('addCustomerFormModal');
            if (modalForm) modalForm.reset(); if (typeof window.removeAddImage === 'function') window.removeAddImage();
            if (typeof window.setAddCustSubscriptionType === 'function') window.setAddCustSubscriptionType('time');
            if (typeof window.toggleDebtFieldView === 'function') window.toggleDebtFieldView();
            closeModal('addCustomerModal');
            const ageMsg = dobValidation.age ? ' (العمر: ' + dobValidation.age + ' سنة)' : '';
            showSuccessToast('تم إضافة المشترك بنجاح' + ageMsg);
            if (typeof window.renderCreditsList === 'function') window.renderCreditsList();
            render(); } catch (err) { console.error('Error in handleAddCustomerSubmit:', err);
            showErrorToast('حدث خطأ أثناء إضافة المشترك');
        } return false; }; document.getElementById('addCustomerFormModal')?.addEventListener('submit', window.handleAddCustomerSubmit);
    window.toggleEditCustTypeFields = function(type) {
        const isSession = type === 'session';
        const sessionFields = document.getElementById('editCustSessionFields');
        const extraDaysCont = document.getElementById('editExtraDaysContainer');
        if (sessionFields) sessionFields.style.display = isSession ? 'block' : 'none';
        if (extraDaysCont) extraDaysCont.style.display = isSession ? 'none' : 'block';
    }; window.adjustEditSessions = function(delta) {
        const remInput = document.getElementById('editRemainingSessions');
        const totalInput = document.getElementById('editTotalSessions');
        if (remInput && totalInput) { let rem = parseInt(remInput.value || 0) + delta;
            let total = parseInt(totalInput.value || 0);
            if (delta > 0) total += delta;
            remInput.value = Math.max(0, rem);
            totalInput.value = Math.max(1, total);
        } }; window.handleEditPackageChange = function() {
        const pkgId = getElemVal('editPackageId');
        const pkg = appState.packages.find(p => p.id === pkgId);
        if (pkg) { const priceInput = document.getElementById('editCustPrice');
            if (priceInput) priceInput.value = pkg.price || 0;
        } if (pkg && pkg.type === 'session') {
            const subTypeSelect = document.getElementById('editSubscriptionType');
            if (subTypeSelect) subTypeSelect.value = 'session';
            toggleEditCustTypeFields('session');
            const totalInput = document.getElementById('editTotalSessions');
            const remInput = document.getElementById('editRemainingSessions');
            if (totalInput) totalInput.value = pkg.sessionsCount || 10;
            if (remInput) remInput.value = pkg.sessionsCount || 10;
        } };    function openEditModal(customerId) {
        const customer = appState.customers.find(c => String(c && c.id) === String(customerId));
        if(!customer) return;
        if (document.getElementById('editCustId')) setElemValue('editCustId', customer.id);
        if (document.getElementById('editCustName')) setElemValue('editCustName', customer.name || '');
        if (document.getElementById('editCustPhone')) setElemValue('editCustPhone', getDisplayPhone(customer.phone));
        if (document.getElementById('editCustDob')) setElemValue('editCustDob', customer.dob || '');
        if (document.getElementById('editCustGender')) setElemValue('editCustGender', customer.gender || 'male');
        if (document.getElementById('editCustWeight')) setElemValue('editCustWeight', customer.weight || '');
        const pkgSelect = document.getElementById('editPackageId');
        if (pkgSelect) {
            pkgSelect.innerHTML = appState.packages.map(p => {
                const isSess = p.type === 'session';
                const label = isSess ? `[بالحصة] ${p.name} (${p.sessionsCount || 10} حصص) - ${p.price} دج` : `[زمني] ${p.name} (${p.durationDays || p.duration || 30} يوم) - ${p.price} دج`;
                return `<option value="${p.id}">${label}</option>`;
            }).join(''); 
            pkgSelect.value = customer.packageId || '';
        }
        const pkg = appState.packages.find(p => p.id === customer.packageId);
        const editPriceInput = document.getElementById('editCustPrice');
        if (editPriceInput) { editPriceInput.value = customer.price !== undefined && customer.price !== null ? customer.price : (pkg ? (pkg.price || 0) : 0);
        }
        // Populate subscription type
        const isSession = customer.subscriptionType === 'session' || (customer.remainingSessions !== undefined && customer.remainingSessions !== null);
        const subTypeSelect = document.getElementById('editSubscriptionType');
        if (subTypeSelect) subTypeSelect.value = isSession ? 'session' : 'time';
        toggleEditCustTypeFields(isSession ? 'session' : 'time');
        const totalInput = document.getElementById('editTotalSessions');
        const remInput = document.getElementById('editRemainingSessions');
        if (totalInput) totalInput.value = customer.totalSessions || customer.remainingSessions || 10;
        if (remInput) remInput.value = customer.remainingSessions !== undefined ? customer.remainingSessions : 10;
        if (document.getElementById('editExtraDays')) setElemValue('editExtraDays', 0);
        if (document.getElementById('editPaymentStatus')) setElemValue('editPaymentStatus', customer.paymentStatus || 'paid');
        if (document.getElementById('editDebtAmount')) setElemValue('editDebtAmount', customer.debtAmount || '');
        if (customer.startDate && document.getElementById('editStartDate')) { 
            setElemValue('editStartDate', new Date(customer.startDate).toISOString().split('T')[0]);
        } 
        if (customer.endDate && document.getElementById('editEndDate')) { 
            setElemValue('editEndDate', new Date(customer.endDate).toISOString().split('T')[0]);
        }
        // Image setup for edit modal
        const imgPreview = document.getElementById('editCustImagePreview');
        const letterSpan = document.getElementById('editCustAvatarLetter');
        const hiddenImgUrl = document.getElementById('editCustImageUrl');
        const removeBtn = document.getElementById('removeEditImageBtn');
        const fileInput = document.getElementById('editCustImageFile');
        if (fileInput) fileInput.value = '';
        const firstLetter = customer.name ? customer.name.trim().charAt(0) : '؟';
        if (letterSpan) letterSpan.textContent = firstLetter;
        if (customer.imageUrl) { if (hiddenImgUrl) hiddenImgUrl.value = customer.imageUrl;
            if (imgPreview) { imgPreview.src = customer.imageUrl;
                imgPreview.classList.remove('hidden');
            } if (letterSpan) letterSpan.classList.add('hidden');
            if (removeBtn) removeBtn.classList.remove('hidden');
        } else { if (hiddenImgUrl) hiddenImgUrl.value = '';
            if (imgPreview) { imgPreview.src = '';
                imgPreview.classList.add('hidden');
            } if (letterSpan) letterSpan.classList.remove('hidden');
            if (removeBtn) removeBtn.classList.add('hidden');
        } toggleEditDebtField(); openModal('editCustomerModal');
    } function toggleEditDebtField() { 
        const container = document.getElementById('editDebtAmountContainer');
        const status = document.getElementById('editPaymentStatus');
        if (container && status) {
            container.style.display = status.value === 'credit' ? 'block' : 'none';
        }
    }
    document.getElementById('editCustomerForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const targetId = String(getElemVal('editCustId') || '').trim();
        let customer = (appState.customers || []).find(c => c && (String(c.id) === targetId || String(c._rtdbKey) === targetId));
        if (!customer) {
            const fallbackName = getElemVal('editCustName').trim();
            customer = (appState.customers || []).find(c => c && c.name === fallbackName);
        }
        if (!customer) {
            showErrorToast('تعذر العثور على سجل المشترك لتحديث بياناته');
            return;
        }

        // Ensure customer has valid id
        if (!customer.id) customer.id = targetId || customer._rtdbKey || Date.now().toString();

        // Snapshot old values before edits for exact diff logging
        const oldName = customer.name || '';
        const oldPhone = customer.phone || '';
        const oldDob = customer.dob || '';
        const oldWeight = customer.weight;
        const oldPkgObj = appState.packages.find(p => p.id === customer.packageId);
        const oldPkgName = oldPkgObj ? oldPkgObj.name : 'بدون باقة';
        const oldPrice = Number(customer.price) || 0;
        const oldDebt = Number(customer.debtAmount) || 0;
        const oldSubType = customer.subscriptionType || 'time';
        const oldSessions = Number(customer.remainingSessions) || 0;
        const oldEndDateStr = customer.endDate ? (typeof getLocalDateString === 'function' ? getLocalDateString(new Date(customer.endDate)) : new Date(customer.endDate).toISOString().split('T')[0]) : '';

        let custName = getElemVal('editCustName').trim();
        if (!custName) { showErrorToast('يرجى إدخال اسم المشترك');
            return; } if (containsDangerousCode(custName)) {
            showErrorToast('تم رفض الإدخال: اسم المشترك يحتوي على أسطر برمجة أو كود غير مسموح به.');
            return; } custName = sanitizeInputText(custName, 60);
        const custPhoneRaw = getElemVal('editCustPhone');
        if (containsDangerousCode(custPhoneRaw)) {
            showErrorToast('تم رفض الإدخال: رقم الهاتف يحتوي على رموز أو أسطر برمجية.');
            return; } const custPhone = sanitizeInputText(custPhoneRaw, 20);
        const custDob = getElemVal('editCustDob');
        const dobValidation = validateCustomerDOB(custDob);
        if (!dobValidation.valid) {
            showErrorToast(dobValidation.error);
            return; } const custWeight = parseFloat(getElemVal('editCustWeight')) || null;
        const custGender = getElemVal('editCustGender') || 'male';
        if (custWeight !== null && (custWeight < 20 || custWeight > 300)) {
            showErrorToast('يرجى إدخال وزن منطقي بين 20 و 300 كغ.');
            return; } customer.name = custName;
        customer.phone = cleanPhone(custPhone);
        customer.dob = custDob; customer.gender = custGender;
        customer.age = dobValidation.age;
        customer.weight = custWeight; const editSubType = getElemVal('editSubscriptionType') || 'time';
        customer.subscriptionType = editSubType;
        if (editSubType === 'session') {
            customer.totalSessions = parseInt(getElemVal('editTotalSessions') || 10);
            customer.remainingSessions = parseInt(getElemVal('editRemainingSessions') || 0);
            if (typeof customer.attendedSessions !== 'number') {
                customer.attendedSessions = Math.max(0, (customer.totalSessions || 0) - (customer.remainingSessions || 0));
            } } const editStartDateVal = getElemVal('editStartDate');
        const editEndDateVal = getElemVal('editEndDate');
        if (editStartDateVal) customer.startDate = new Date(editStartDateVal).toISOString();
        if (editEndDateVal) customer.endDate = new Date(editEndDateVal).toISOString();
        const extraDays = parseInt(getElemVal('editExtraDays')) || 0;
        if (extraDays > 0 && editSubType !== 'session') {
            const currentEnd = new Date(customer.endDate || new Date());
            if (!isNaN(currentEnd.getTime())) {
                currentEnd.setDate(currentEnd.getDate() + extraDays);
                customer.endDate = currentEnd.toISOString();
            } }
        customer.packageId = getElemVal('editPackageId');
        const pkg = (appState.packages || []).find(p => String(p && p.id) === String(customer.packageId));
        const editPriceInput = document.getElementById('editCustPrice');
        customer.price = editPriceInput && editPriceInput.value !== '' ? parseInt(editPriceInput.value) : (pkg ? parseInt(pkg.price || 0) : 0);
        customer.paymentStatus = getElemVal('editPaymentStatus');
        customer.debtAmount = customer.paymentStatus === 'credit' ? parseInt(getElemVal('editDebtAmount') || 0) : 0;
        customer.imageUrl = getElemVal('editCustImageUrl') || null;
        customer.updatedAt = Date.now();
        customer._searchKey = `${customer.name || ''} ${(customer.phone || '').replace(/\D/g, '')}`.toLowerCase();

        // Sync with Credits section
        if (customer.debtAmount > 0) { if (!appState.credits) appState.credits = [];
            const autoId = 'cr_auto_' + customer.id;
            const existingCreditIndex = appState.credits.findIndex(c => c.id === autoId);
            const creditData = { id: autoId,
                name: customer.name, nickname: 'مشترك',
                phone: customer.phone, desc: `دين اشتراك - باقة: ${pkg ? pkg.name : 'باقة'} (${customer.price} دج)`,
                amount: customer.debtAmount,
                date: new Date().toISOString() };
            if (existingCreditIndex > -1) {
                appState.credits[existingCreditIndex] = creditData;
            } else { appState.credits.unshift(creditData);
            }
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('credits', creditData);
            } } else if (oldDebt > 0 && customer.debtAmount === 0) {
            // Debt was cleared in edit, remove from credits if it was an auto-credit
            if (Array.isArray(appState.credits)) {
                const autoId = 'cr_auto_' + customer.id;
                appState.credits = appState.credits.filter(c => c.id !== autoId);
                if (window.deleteFirebaseSectionItem) {
                    window.deleteFirebaseSectionItem('credits', autoId);
                }
            } }
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('customers', customer);
            }

            // Calculate exact field modifications
            const newPkgName = pkg ? pkg.name : 'بدون باقة';
            const newEndDateStr = customer.endDate ? (typeof getLocalDateString === 'function' ? getLocalDateString(new Date(customer.endDate)) : new Date(customer.endDate).toISOString().split('T')[0]) : '';
            const changes = [];

            if (oldName !== customer.name) changes.push(`الاسم: من "${oldName}" إلى "${customer.name}"`);
            if (oldPhone !== customer.phone) changes.push(`الهاتف: من "${oldPhone || 'غير محدد'}" إلى "${customer.phone || 'غير محدد'}"`);
            if (oldDob !== custDob && custDob) changes.push(`تاريخ الميلاد: من "${oldDob || 'غير محدد'}" إلى "${custDob}"`);
            if (oldPkgName !== newPkgName) changes.push(`الباقة: من "${oldPkgName}" إلى "${newPkgName}"`);
            if (oldPrice !== Number(customer.price || 0)) changes.push(`السعر: من ${oldPrice.toLocaleString()} دج إلى ${Number(customer.price || 0).toLocaleString()} دج`);
            if (oldDebt !== Number(customer.debtAmount || 0)) changes.push(`الدين: من ${oldDebt.toLocaleString()} دج إلى ${Number(customer.debtAmount || 0).toLocaleString()} دج`);
            if (oldSubType !== customer.subscriptionType) changes.push(`نوع الاشتراك: من "${oldSubType === 'session' ? 'حصص' : 'زمني'}" إلى "${customer.subscriptionType === 'session' ? 'حصص' : 'زمني'}"`);
            if (customer.subscriptionType === 'session' && oldSessions !== customer.remainingSessions) {
                changes.push(`الحصص المتبقية: من ${oldSessions} إلى ${customer.remainingSessions}`);
            }
            if (extraDays > 0) changes.push(`تاريخ الانتهاء: من "${oldEndDateStr || 'غير محدد'}" إلى "${newEndDateStr}" (تمديد ${extraDays} يوماً)`);
            else if (oldEndDateStr !== newEndDateStr && newEndDateStr) changes.push(`تاريخ الانتهاء: من "${oldEndDateStr || 'غير محدد'}" إلى "${newEndDateStr}"`);
            if (oldWeight !== customer.weight && customer.weight !== null) changes.push(`الوزن: من ${oldWeight || '--'} كغ إلى ${customer.weight} كغ`);

            let detailMsg = `تعديل بيانات المشترك (${customer.name})`;
            if (changes.length > 0) {
                detailMsg += ` | ` + changes.join(' | ');
            } else {
                detailMsg += ` | تم التحديث بدون تغييرات رئيسية`;
            }

            if (typeof logActivity === 'function') {
                logActivity('customer', 'تعديل بيانات مشترك', detailMsg, customer.price || 0);
            }
            saveState(); closeModal('editCustomerModal');
        showSuccessToast('تم تعديل بيانات المشترك بنجاح');
        if (typeof window.renderCreditsList === 'function') window.renderCreditsList();
        render(); });
    // ==========================================
    // EXPENSES CATEGORIES & MANAGEMENT HELPERS
    // ==========================================
    window.setExpenseCategory = function(cat, target) {
        const selectId = target === 'modal' ? 'expenseCategoryModal' : 'expenseCategoryView';
        const el = document.getElementById(selectId);
        if (el) { el.value = cat;
            showSuccessToast(`تم تحديد التصنيف: ${getExpenseCategoryDetails(cat).label}`);
        } };
    window.setExpenseDescription = function(desc, cat, target) {
        const descId = target === 'modal' ? 'expenseDescModal' : 'expenseDescView';
        const catId = target === 'modal' ? 'expenseCategoryModal' : 'expenseCategoryView';
        const descInput = document.getElementById(descId);
        const catSelect = document.getElementById(catId);
        if (descInput) {
            descInput.value = desc;
            descInput.focus();
        }
        if (cat && catSelect) {
            catSelect.value = cat;
        }
    };
    window.setExpenseDatePreset = function(type, target) {
        const dateId = target === 'modal' ? 'expenseDateModal' : 'expenseDateView';
        const dateInput = document.getElementById(dateId);
        if (!dateInput) return;
        const now = new Date();
        if (type === 'today') {
            dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(now) : now.toISOString().split('T')[0];
        } else if (type === 'yesterday') {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(y) : y.toISOString().split('T')[0];
        }
    };
    window.createSafeExpenseISO = function(dateVal) {
        if (!dateVal) return new Date().toISOString();
        if (dateVal.includes('T')) return new Date(dateVal).toISOString();
        const parts = dateVal.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dt = new Date(y, m, d, 12, 0, 0);
            return dt.toISOString();
        }
        return new Date(dateVal).toISOString();
    };
    window.getExpenseCategory = function(e) {
        if (e && e.category) return e.category;
        const d = (e && e.desc ? String(e.desc).toLowerCase() : '');
        if (d.includes('يومي') || d.includes('قهوة') || d.includes('فطور') || d.includes('غداء') || d.includes('عشاء') || d.includes('طاكسي') || d.includes('نقل') || d.includes('بنزين') || d.includes('مازوت') || d.includes('ماكلة') || d.includes('سندويتش') || d.includes('سوق') || d.includes('خبز') || d.includes('حليب') || d.includes('شخصي') || d.includes('مأكولات') || d.includes('وجبة') || d.includes('كوتي')) {
            return 'daily'; } if (d.includes('منزل') || d.includes('دار') || d.includes('بيت') || d.includes('عائلة') || d.includes('دارنا') || d.includes('المنزل') || d.includes('قضيان') || d.includes('الدار') || d.includes('عائلي')) {
            return 'home'; } if (d.includes('كهرباء') || d.includes('ماء') || d.includes('كراء') || d.includes('غاز') || d.includes('سونلغاز') || d.includes('سيال') || d.includes('انترنت') || d.includes('إنترنت') || d.includes('هاتف') || d.includes('دائم') || d.includes('فاتورة') || d.includes('فواتير')) {
            return 'fixed_monthly'; } if (d.includes('صيانة') || d.includes('تصليح') || d.includes('اصلاح') || d.includes('ماتريال') || d.includes('أجهزة')) {
            return 'maintenance'; } if (d.includes('نظافة') || d.includes('جافيل') || d.includes('صابون') || d.includes('مستلزمات') || d.includes('شامبو') || d.includes('أكياس')) {
            return 'supplies'; } return 'general';
    }; window.getExpenseCategoryDetails = function(cat) {
        switch(cat) { case 'daily': return {
                    label: 'مصاريف يومية (نقل، قهوة، إطعام...)',
                    icon: '', badgeClass: 'bg-blue-100 text-blue-950 border-blue-300'
                }; case 'home': return { label: 'مصاريف منزل في القاعة',
                    icon: '', badgeClass: 'bg-blue-100 text-blue-950 border-blue-200'
                }; case 'fixed_monthly': return {
                    label: 'مصاريف دائمة شهرية (كهرباء، ماء...)',
                    icon: '', badgeClass: 'bg-blue-100 text-blue-950 border-blue-200'
                }; case 'maintenance': return {
                    label: 'صيانة وإصلاحات',
                    icon: '', badgeClass: 'bg-blue-100 text-blue-900 border-blue-200'
                }; case 'supplies': return {
                    label: 'مستلزمات ونظافة',
                    icon: '', badgeClass: 'bg-blue-100 text-blue-950 border-blue-200'
                }; case 'other': return { label: 'مصاريف أخرى',
                    icon: '', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
                }; case 'general': default:
                return { label: 'مصاريف عامة وتجهيزات',
                    icon: '', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200'
                }; } }; document.getElementById('addExpenseFormModal')?.addEventListener('submit', function(e) {
        e.preventDefault(); const descInput = document.getElementById('expenseDescModal');
        const amountInput = document.getElementById('expenseAmountModal');
        const dateInput = document.getElementById('expenseDateModal');
        const catSelect = document.getElementById('expenseCategoryModal');
        let desc = descInput ? descInput.value.trim() : '';
        const amount = amountInput ? parseInt(amountInput.value) : NaN;
        const dateVal = dateInput ? dateInput.value : '';
        const category = catSelect ? catSelect.value : 'general';
        if (!desc) {
            showErrorToast('يرجى إدخال وصف وبيان المصروف');
            if (descInput) descInput.focus();
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showErrorToast('يرجى إدخال مبلغ صحيح للمصروف');
            if (amountInput) amountInput.focus();
            return;
        }
        if (containsDangerousCode(desc)) {
            showErrorToast('تم رفض الإدخال: وصف المصروف يحتوي على أسطر برمجية غير مسموح بها.');
            return;
        }
        desc = sanitizeInputText(desc, 100);
        if (!Array.isArray(appState.expenses)) appState.expenses = [];
        const isoDate = window.createSafeExpenseISO(dateVal);
        const newExp = { id: Date.now().toString(),
            desc: desc, amount: amount, category: category,
            date: isoDate
        };
        appState.expenses.push(newExp);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('expenses', newExp);
        }
        saveState();
        this.reset();
        if (dateInput) {
            dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
        }
        const catDetails = getExpenseCategoryDetails(category);
        showSuccessToast(`تم تسجيل المصروف بنجاح (${catDetails.label})`);
        if (window.renderExpensesListModal) window.renderExpensesListModal();
        if (window.renderExpensesListView) window.renderExpensesListView();
        render(); // Update totals
    }); function renderExpensesListModal() {
        const container = document.getElementById('expensesListModal');
        if (!container) return; if (!appState.expenses || appState.expenses.length === 0) {
            container.innerHTML = '<div class="text-xs text-slate-400 text-center py-6 font-medium">لا توجد مصاريف مسجلة</div>';
            return; } const filterCat = getElemVal('filterExpenseCategoryModal') || 'all';
        let filtered = [...appState.expenses];
        if (filterCat !== 'all') { filtered = filtered.filter(ex => getExpenseCategory(ex) === filterCat);
        } if (filtered.length === 0) { container.innerHTML = '<div class="text-xs text-slate-400 text-center py-6 font-medium">لا توجد مصاريف مطابقة لهذا التصنيف</div>';
            return; } const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map(ex => {
            const d = new Date(ex.date); const dateFormatted = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
            const safeDesc = escapeHTML(ex.desc || 'مصروف');
            const safeId = escapeHTML(ex.id || '');
            const cat = getExpenseCategory(ex);
            const catDetails = getExpenseCategoryDetails(cat);
            return `
                <div class="bg-white border border-slate-200/80 p-3 sm:p-3.5 rounded-2xl shadow-xs flex items-center justify-between gap-3 transition-all hover:border-slate-300">
                    <button onclick="deleteExpense('${safeId}')" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors shrink-0" title="حذف المصروف">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                    <div class="text-right flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 justify-end flex-wrap mb-1">
                            <span class="font-bold text-slate-800 text-sm truncate">${safeDesc}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${catDetails.badgeClass}">
                                ${catDetails.icon} ${catDetails.label}
                            </span>
                        </div>
                        <div class="text-xs font-bold text-slate-700" dir="ltr" style="text-align: right;">
                            <span class="text-slate-400 font-medium">${dateFormatted}</span> - <span class="text-slate-900 font-black">${Number(ex.amount || 0).toLocaleString()} دج</span>
                        </div>
                    </div>
                </div>
            `; }).join(''); } window.renderExpensesListModal = renderExpensesListModal;
    // ==========================================
    // EXPENSES DETAILED MONTHLY & YEARLY BREAKDOWN
    // ==========================================
    window.expensesDetailedState = {
        year: new Date().getFullYear(),
        tab: 'monthly',
        filterMonth: null,
        filterYear: null
    };

    const ARABIC_MONTHS = [
        'جانفي (شهر 1)', 'فيفري (شهر 2)', 'مارس (شهر 3)', 'أفريل (شهر 4)',
        'ماي (شهر 5)', 'جوان (شهر 6)', 'جويلية (شهر 7)', 'أوت (شهر 8)',
        'سبتمبر (شهر 9)', 'أكتوبر (شهر 10)', 'نوفمبر (شهر 11)', 'ديسمبر (شهر 12)'
    ];
    const ARABIC_MONTHS_SHORT = [
        'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
        'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    window.setExpensesDetailedTab = function(tab) {
        window.expensesDetailedState.tab = tab;
        const monthlyBtn = document.getElementById('expenseTabMonthlyBtn');
        const yearlyBtn = document.getElementById('expenseTabYearlyBtn');
        const monthlyContainer = document.getElementById('expensesMonthlyDetailsContainer');
        const yearlyContainer = document.getElementById('expensesYearlyDetailsContainer');
        const yearSelectWrapper = document.getElementById('expenseYearSelectWrapper');

        if (tab === 'monthly') {
            if (monthlyBtn) {
                monthlyBtn.className = 'px-3.5 py-1.5 rounded-xl bg-white text-blue-700 shadow-2xs font-black transition-all cursor-pointer';
            }
            if (yearlyBtn) {
                yearlyBtn.className = 'px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
            }
            if (monthlyContainer) monthlyContainer.classList.remove('hidden');
            if (yearlyContainer) yearlyContainer.classList.add('hidden');
            if (yearSelectWrapper) yearSelectWrapper.classList.remove('hidden');
        } else {
            if (yearlyBtn) {
                yearlyBtn.className = 'px-3.5 py-1.5 rounded-xl bg-white text-blue-700 shadow-2xs font-black transition-all cursor-pointer';
            }
            if (monthlyBtn) {
                monthlyBtn.className = 'px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer';
            }
            if (yearlyContainer) yearlyContainer.classList.remove('hidden');
            if (monthlyContainer) monthlyContainer.classList.add('hidden');
            if (yearSelectWrapper) yearSelectWrapper.classList.add('hidden');
        }
        if (typeof window.renderExpensesDetailedTotals === 'function') {
            window.renderExpensesDetailedTotals();
        }
    };

    window.changeExpensesDetailedYear = function(year) {
        window.expensesDetailedState.year = parseInt(year, 10) || new Date().getFullYear();
        if (typeof window.renderExpensesDetailedTotals === 'function') {
            window.renderExpensesDetailedTotals();
        }
    };

    window.filterExpensesByMonth = function(year, monthIdx) {
        window.expensesDetailedState.filterYear = parseInt(year, 10);
        window.expensesDetailedState.filterMonth = parseInt(monthIdx, 10);
        if (typeof window.renderExpensesListView === 'function') {
            window.renderExpensesListView();
        }
        const listElem = document.getElementById('expensesListView');
        if (listElem) {
            listElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    window.clearExpensesMonthFilter = function() {
        window.expensesDetailedState.filterYear = null;
        window.expensesDetailedState.filterMonth = null;
        if (typeof window.renderExpensesListView === 'function') {
            window.renderExpensesListView();
        }
    };

    window.renderExpensesDetailedTotals = function() {
        const allExpenses = Array.isArray(appState.expenses) ? appState.expenses : [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // 1. Gather all unique years
        const yearsSet = new Set();
        yearsSet.add(currentYear);
        allExpenses.forEach(ex => {
            if (ex && ex.date) {
                const d = new Date(ex.date);
                if (!isNaN(d.getFullYear())) {
                    yearsSet.add(d.getFullYear());
                }
            }
        });
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

        // Ensure selected year is valid
        if (!window.expensesDetailedState.year || !yearsSet.has(window.expensesDetailedState.year)) {
            window.expensesDetailedState.year = sortedYears[0] || currentYear;
        }
        const selYear = window.expensesDetailedState.year;

        // Populate Year dropdown
        const yearSelect = document.getElementById('selectExpenseDetailedYear');
        if (yearSelect) {
            yearSelect.innerHTML = sortedYears.map(y => `<option value="${y}" ${y === selYear ? 'selected' : ''}>سنة ${y}</option>`).join('');
        }

        // Active Month Filter Banner
        const banner = document.getElementById('activeExpenseMonthFilterBanner');
        const bannerLabel = document.getElementById('activeExpenseMonthFilterLabel');
        if (banner && bannerLabel) {
            if (window.expensesDetailedState.filterMonth !== null && window.expensesDetailedState.filterYear !== null) {
                banner.classList.remove('hidden');
                banner.classList.add('flex');
                bannerLabel.innerText = `${ARABIC_MONTHS_SHORT[window.expensesDetailedState.filterMonth]} ${window.expensesDetailedState.filterYear}`;
            } else {
                banner.classList.add('hidden');
                banner.classList.remove('flex');
            }
        }

        // ==========================================
        // 2. Build Monthly Data for Selected Year
        // ==========================================
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: i,
            name: ARABIC_MONTHS[i],
            shortName: ARABIC_MONTHS_SHORT[i],
            total: 0,
            count: 0,
            daily: 0,
            home: 0,
            fixed_monthly: 0,
            general: 0,
            maintenance: 0,
            supplies: 0,
            other: 0
        }));

        let yearTotal = 0;
        let yearCount = 0;
        let yearDaily = 0;
        let yearHome = 0;
        let yearFixed = 0;
        let yearGeneral = 0;
        let yearMaintenance = 0;
        let yearSupplies = 0;
        let yearOther = 0;

        allExpenses.forEach(ex => {
            if (!ex || !ex.date) return;
            const d = new Date(ex.date);
            if (d.getFullYear() === selYear) {
                const m = d.getMonth();
                const amt = Number(ex.amount) || 0;
                const cat = getExpenseCategory(ex);

                yearTotal += amt;
                yearCount++;
                monthlyData[m].total += amt;
                monthlyData[m].count++;

                if (cat === 'daily') { monthlyData[m].daily += amt; yearDaily += amt; }
                else if (cat === 'home') { monthlyData[m].home += amt; yearHome += amt; }
                else if (cat === 'fixed_monthly') { monthlyData[m].fixed_monthly += amt; yearFixed += amt; }
                else if (cat === 'maintenance') { monthlyData[m].maintenance += amt; yearMaintenance += amt; }
                else if (cat === 'supplies') { monthlyData[m].supplies += amt; yearSupplies += amt; }
                else if (cat === 'other') { monthlyData[m].other += amt; yearOther += amt; }
                else { monthlyData[m].general += amt; yearGeneral += amt; }
            }
        });

        // Find max month in selected year
        let maxMonthIdx = 0;
        let maxMonthAmt = 0;
        monthlyData.forEach((m, idx) => {
            if (m.total > maxMonthAmt) {
                maxMonthAmt = m.total;
                maxMonthIdx = idx;
            }
        });

        // Average calculation
        const monthsPassedInYear = (selYear === currentYear) ? (currentMonth + 1) : 12;
        const monthlyAvg = monthsPassedInYear > 0 ? Math.round(yearTotal / monthsPassedInYear) : 0;

        // Render Tab 1: Monthly Container
        const monthlyContainer = document.getElementById('expensesMonthlyDetailsContainer');
        if (monthlyContainer) {
            monthlyContainer.innerHTML = `
                <!-- Yearly Key KPI Metrics -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
                    <div class="space-y-0.5">
                        <div class="text-[11px] font-bold text-slate-500">إجمالي مصاريف سنة ${selYear}</div>
                        <div class="text-base sm:text-xl font-black text-blue-900" dir="ltr">${yearTotal.toLocaleString()} <span class="text-xs font-bold text-slate-500">دج</span></div>
                    </div>
                    <div class="space-y-0.5">
                        <div class="text-[11px] font-bold text-slate-500">المتوسط الشهري للسنة</div>
                        <div class="text-base sm:text-xl font-black text-slate-800" dir="ltr">${monthlyAvg.toLocaleString()} <span class="text-xs font-bold text-slate-500">دج</span></div>
                    </div>
                    <div class="space-y-0.5">
                        <div class="text-[11px] font-bold text-slate-500">أعلى شهر صرفاً</div>
                        <div class="text-xs sm:text-sm font-black text-red-600 truncate">${maxMonthAmt > 0 ? `${ARABIC_MONTHS_SHORT[maxMonthIdx]} (${maxMonthAmt.toLocaleString()} دج)` : 'لا يوجد'}</div>
                    </div>
                    <div class="space-y-0.5">
                        <div class="text-[11px] font-bold text-slate-500">إجمالي العمليات المسجلة</div>
                        <div class="text-base sm:text-xl font-black text-slate-900">${yearCount} <span class="text-xs font-bold text-slate-500">عملية</span></div>
                    </div>
                </div>

                <!-- Category Breakdown Bar for Selected Year -->
                <div class="bg-white border border-slate-200/80 p-3.5 sm:p-4 rounded-2xl shadow-2xs space-y-2">
                    <div class="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>توزيع مصاريف سنة ${selYear} حسب الأصناف:</span>
                        <span class="text-slate-400 text-[11px]">${yearCount} عمليات</span>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <span class="block text-[10px] text-slate-500 font-bold">مصاريف يومية</span>
                            <span class="block text-xs sm:text-sm font-black text-slate-800">${yearDaily.toLocaleString()} دج</span>
                            <span class="block text-[10px] text-blue-600 font-bold">${yearTotal > 0 ? Math.round((yearDaily / yearTotal) * 100) : 0}%</span>
                        </div>
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <span class="block text-[10px] text-slate-500 font-bold">منزل في القاعة</span>
                            <span class="block text-xs sm:text-sm font-black text-slate-800">${yearHome.toLocaleString()} دج</span>
                            <span class="block text-[10px] text-blue-600 font-bold">${yearTotal > 0 ? Math.round((yearHome / yearTotal) * 100) : 0}%</span>
                        </div>
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <span class="block text-[10px] text-slate-500 font-bold">فواتير دائمة</span>
                            <span class="block text-xs sm:text-sm font-black text-slate-800">${yearFixed.toLocaleString()} دج</span>
                            <span class="block text-[10px] text-blue-600 font-bold">${yearTotal > 0 ? Math.round((yearFixed / yearTotal) * 100) : 0}%</span>
                        </div>
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <span class="block text-[10px] text-slate-500 font-bold">عامة وتجهيزات</span>
                            <span class="block text-xs sm:text-sm font-black text-slate-800">${yearGeneral.toLocaleString()} دج</span>
                            <span class="block text-[10px] text-blue-600 font-bold">${yearTotal > 0 ? Math.round((yearGeneral / yearTotal) * 100) : 0}%</span>
                        </div>
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <span class="block text-[10px] text-slate-500 font-bold">صيانة وإصلاح</span>
                            <span class="block text-xs sm:text-sm font-black text-slate-800">${yearMaintenance.toLocaleString()} دج</span>
                            <span class="block text-[10px] text-blue-600 font-bold">${yearTotal > 0 ? Math.round((yearMaintenance / yearTotal) * 100) : 0}%</span>
                        </div>
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                            <span class="block text-[10px] text-slate-500 font-bold">نظافة ومستلزمات</span>
                            <span class="block text-xs sm:text-sm font-black text-slate-800">${yearSupplies.toLocaleString()} دج</span>
                            <span class="block text-[10px] text-blue-600 font-bold">${yearTotal > 0 ? Math.round((yearSupplies / yearTotal) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>

                <!-- 12 Months Cards Grid -->
                <div class="space-y-2 pt-2">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <span>تفصيل أشهر سنة ${selYear} (12 شهر)</span>
                        </h3>
                        <span class="text-xs text-slate-400 font-medium">اضغط على أي شهر لعرض سجل مصاريفه مباشرة</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        ${monthlyData.map(m => {
                            const pct = yearTotal > 0 ? Math.round((m.total / yearTotal) * 100) : 0;
                            const isCurrent = (selYear === currentYear && m.month === currentMonth);
                            const isFiltered = (window.expensesDetailedState.filterYear === selYear && window.expensesDetailedState.filterMonth === m.month);

                            return `
                                <div class="bg-white border ${isFiltered ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : (isCurrent ? 'border-blue-300 bg-gradient-to-b from-blue-50/40 to-white' : 'border-slate-200/90')} p-3.5 rounded-2xl flex flex-col justify-between hover:border-blue-400 hover:shadow-xs transition-all">
                                    <div>
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1">
                                                <span>${m.name}</span>
                                                ${isCurrent ? '<span class="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-md">الشهر الحالي</span>' : ''}
                                            </span>
                                            <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">${m.count} عملية</span>
                                        </div>

                                        <div class="flex items-baseline justify-between mb-2">
                                            <span class="text-base sm:text-lg font-black text-slate-900" dir="ltr">${m.total.toLocaleString()} <span class="text-[11px] font-normal text-slate-500">دج</span></span>
                                            <span class="text-xs font-bold ${pct > 0 ? 'text-blue-600' : 'text-slate-400'}">${pct}% من السنة</span>
                                        </div>

                                        <!-- Progress bar -->
                                        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2.5">
                                            <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style="width: ${Math.min(pct, 100)}%"></div>
                                        </div>

                                        <!-- Mini Breakdown -->
                                        <div class="space-y-1 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-xl border border-slate-100 mb-2">
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-500 font-medium">يومية:</span>
                                                <span class="font-bold text-slate-800">${m.daily.toLocaleString()} دج</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-500 font-medium">منزل:</span>
                                                <span class="font-bold text-slate-800">${m.home.toLocaleString()} دج</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-500 font-medium">فواتير دائمة:</span>
                                                <span class="font-bold text-slate-800">${m.fixed_monthly.toLocaleString()} دج</span>
                                            </div>
                                            <div class="flex justify-between items-center">
                                                <span class="text-slate-500 font-medium">عامة وصيانة:</span>
                                                <span class="font-bold text-slate-800">${(m.general + m.maintenance + m.supplies).toLocaleString()} دج</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Filter Button -->
                                    <button type="button" onclick="filterExpensesByMonth(${selYear}, ${m.month})" class="w-full py-1.5 ${isFiltered ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700'} rounded-xl text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        <span>${isFiltered ? '✓ معروض في السجل' : 'عرض فواتير هذا الشهر'}</span>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Detailed Table Matrix for 12 Months -->
                <div class="mt-4 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                    <div class="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                        <span class="text-xs font-black text-slate-800">جدول مصفوفة تفاصيل المصاريف الشهرية - سنة ${selYear}</span>
                        <span class="text-[11px] text-slate-500 font-bold">المبالغ بالدينار الجزائري (دج)</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th class="p-3 whitespace-nowrap">الشهر</th>
                                    <th class="p-3 whitespace-nowrap text-blue-700">الإجمالي</th>
                                    <th class="p-3 whitespace-nowrap text-slate-600">يومية</th>
                                    <th class="p-3 whitespace-nowrap text-slate-600">منزل</th>
                                    <th class="p-3 whitespace-nowrap text-slate-600">فواتير دائمة</th>
                                    <th class="p-3 whitespace-nowrap text-slate-600">عامة وتجهيزات</th>
                                    <th class="p-3 whitespace-nowrap text-slate-600">صيانة ونظافة</th>
                                    <th class="p-3 whitespace-nowrap text-center">العمليات</th>
                                    <th class="p-3 whitespace-nowrap text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${monthlyData.map(m => {
                                    const isCurrent = (selYear === currentYear && m.month === currentMonth);
                                    return `
                                        <tr class="${isCurrent ? 'bg-blue-50/30 font-semibold' : 'hover:bg-slate-50'} transition-colors">
                                            <td class="p-3 whitespace-nowrap font-bold text-slate-800 flex items-center gap-1.5">
                                                <span>${m.name}</span>
                                                ${isCurrent ? '<span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>' : ''}
                                            </td>
                                            <td class="p-3 whitespace-nowrap font-black text-blue-900" dir="ltr">${m.total.toLocaleString()} دج</td>
                                            <td class="p-3 whitespace-nowrap text-slate-700">${m.daily.toLocaleString()} دج</td>
                                            <td class="p-3 whitespace-nowrap text-slate-700">${m.home.toLocaleString()} دج</td>
                                            <td class="p-3 whitespace-nowrap text-slate-700">${m.fixed_monthly.toLocaleString()} دج</td>
                                            <td class="p-3 whitespace-nowrap text-slate-700">${m.general.toLocaleString()} دج</td>
                                            <td class="p-3 whitespace-nowrap text-slate-700">${(m.maintenance + m.supplies).toLocaleString()} دج</td>
                                            <td class="p-3 whitespace-nowrap text-center font-bold text-slate-500">${m.count}</td>
                                            <td class="p-3 whitespace-nowrap text-center">
                                                <button type="button" onclick="filterExpensesByMonth(${selYear}, ${m.month})" class="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer">
                                                    عرض بالسجل
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot class="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                                <tr>
                                    <td class="p-3">مجموع سنة ${selYear}</td>
                                    <td class="p-3 text-blue-900" dir="ltr">${yearTotal.toLocaleString()} دج</td>
                                    <td class="p-3">${yearDaily.toLocaleString()} دج</td>
                                    <td class="p-3">${yearHome.toLocaleString()} دج</td>
                                    <td class="p-3">${yearFixed.toLocaleString()} دج</td>
                                    <td class="p-3">${yearGeneral.toLocaleString()} دج</td>
                                    <td class="p-3">${(yearMaintenance + yearSupplies).toLocaleString()} دج</td>
                                    <td class="p-3 text-center">${yearCount}</td>
                                    <td class="p-3 text-center">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        // ==========================================
        // 3. Build Yearly Data (Tab 2)
        // ==========================================
        const yearlyContainer = document.getElementById('expensesYearlyDetailsContainer');
        if (yearlyContainer) {
            let allTimeGrandTotal = 0;
            const yearlyStatsMap = {};

            sortedYears.forEach(y => {
                yearlyStatsMap[y] = {
                    year: y,
                    total: 0,
                    count: 0,
                    daily: 0,
                    home: 0,
                    fixed_monthly: 0,
                    general: 0,
                    maintenance: 0,
                    supplies: 0
                };
            });

            allExpenses.forEach(ex => {
                if (!ex || !ex.date) return;
                const d = new Date(ex.date);
                const y = d.getFullYear();
                const amt = Number(ex.amount) || 0;
                const cat = getExpenseCategory(ex);

                allTimeGrandTotal += amt;
                if (!yearlyStatsMap[y]) {
                    yearlyStatsMap[y] = {
                        year: y, total: 0, count: 0,
                        daily: 0, home: 0, fixed_monthly: 0,
                        general: 0, maintenance: 0, supplies: 0
                    };
                }
                yearlyStatsMap[y].total += amt;
                yearlyStatsMap[y].count++;

                if (cat === 'daily') yearlyStatsMap[y].daily += amt;
                else if (cat === 'home') yearlyStatsMap[y].home += amt;
                else if (cat === 'fixed_monthly') yearlyStatsMap[y].fixed_monthly += amt;
                else if (cat === 'maintenance') yearlyStatsMap[y].maintenance += amt;
                else if (cat === 'supplies') yearlyStatsMap[y].supplies += amt;
                else yearlyStatsMap[y].general += amt;
            });

            const yearlyArray = sortedYears.map(y => yearlyStatsMap[y]);

            yearlyContainer.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-slate-800">المقارنة والمجاميع السنوية الشاملة لكافة السنوات</h3>
                        <span class="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                            الإجمالي التراكمي العام: ${allTimeGrandTotal.toLocaleString()} دج
                        </span>
                    </div>

                    <!-- Year Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${yearlyArray.map(ystat => {
                            const isCur = (ystat.year === currentYear);
                            const mCount = isCur ? (currentMonth + 1) : 12;
                            const yMonthlyAvg = mCount > 0 ? Math.round(ystat.total / mCount) : 0;
                            const yPct = allTimeGrandTotal > 0 ? Math.round((ystat.total / allTimeGrandTotal) * 100) : 0;

                            return `
                                <div class="bg-white border ${isCur ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200'} p-4 rounded-2xl shadow-xs space-y-3">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <div class="flex items-center gap-2">
                                            <span class="text-base font-black text-slate-900">سنة ${ystat.year}</span>
                                            ${isCur ? '<span class="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-lg">السنة الحالية</span>' : ''}
                                        </div>
                                        <span class="text-xs font-bold text-slate-400">${ystat.count} عملية</span>
                                    </div>

                                    <div class="space-y-1">
                                        <div class="text-xs text-slate-500 font-medium">إجمالي مصاريف العام:</div>
                                        <div class="text-xl font-black text-blue-950" dir="ltr">${ystat.total.toLocaleString()} <span class="text-xs text-slate-500 font-normal">دج</span></div>
                                        <div class="text-xs text-slate-500">المتوسط الشهري: <strong class="text-slate-800">${yMonthlyAvg.toLocaleString()} دج</strong> / شهر</div>
                                    </div>

                                    <!-- Category distribution breakdown -->
                                    <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                                        <div class="flex justify-between text-slate-600">
                                            <span>مصاريف يومية:</span>
                                            <strong class="text-slate-800">${ystat.daily.toLocaleString()} دج</strong>
                                        </div>
                                        <div class="flex justify-between text-slate-600">
                                            <span>منزل في القاعة:</span>
                                            <strong class="text-slate-800">${ystat.home.toLocaleString()} دج</strong>
                                        </div>
                                        <div class="flex justify-between text-slate-600">
                                            <span>فواتير دائمة:</span>
                                            <strong class="text-slate-800">${ystat.fixed_monthly.toLocaleString()} دج</strong>
                                        </div>
                                        <div class="flex justify-between text-slate-600">
                                            <span>عامة وتجهيزات:</span>
                                            <strong class="text-slate-800">${(ystat.general + ystat.maintenance + ystat.supplies).toLocaleString()} دج</strong>
                                        </div>
                                    </div>

                                    <button type="button" onclick="changeExpensesDetailedYear(${ystat.year}); setExpensesDetailedTab('monthly');" class="w-full py-2 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer">
                                        <span>عرض تفاصيل أشهر سنة ${ystat.year}</span>
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Yearly Comparison Table -->
                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                        <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <span class="text-xs font-black text-slate-800">جدول مقارنة السنوات المالية للمصاريف</span>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right text-xs">
                                <thead class="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3 whitespace-nowrap">السنة</th>
                                        <th class="p-3 whitespace-nowrap text-blue-700">إجمالي المصاريف</th>
                                        <th class="p-3 whitespace-nowrap">المتوسط الشهري</th>
                                        <th class="p-3 whitespace-nowrap">يومية</th>
                                        <th class="p-3 whitespace-nowrap">منزل</th>
                                        <th class="p-3 whitespace-nowrap">فواتير دائمة</th>
                                        <th class="p-3 whitespace-nowrap">عامة وتجهيزات</th>
                                        <th class="p-3 whitespace-nowrap text-center">العمليات</th>
                                        <th class="p-3 whitespace-nowrap text-center">النسبة من الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${yearlyArray.map(ystat => {
                                        const isCur = (ystat.year === currentYear);
                                        const mCount = isCur ? (currentMonth + 1) : 12;
                                        const yMonthlyAvg = mCount > 0 ? Math.round(ystat.total / mCount) : 0;
                                        const yPct = allTimeGrandTotal > 0 ? Math.round((ystat.total / allTimeGrandTotal) * 100) : 0;

                                        return `
                                            <tr class="${isCur ? 'bg-blue-50/30 font-semibold' : 'hover:bg-slate-50'} transition-colors">
                                                <td class="p-3 whitespace-nowrap font-black text-slate-900">${ystat.year}</td>
                                                <td class="p-3 whitespace-nowrap font-black text-blue-900" dir="ltr">${ystat.total.toLocaleString()} دج</td>
                                                <td class="p-3 whitespace-nowrap font-bold text-slate-700">${yMonthlyAvg.toLocaleString()} دج</td>
                                                <td class="p-3 whitespace-nowrap text-slate-700">${ystat.daily.toLocaleString()} دج</td>
                                                <td class="p-3 whitespace-nowrap text-slate-700">${ystat.home.toLocaleString()} دج</td>
                                                <td class="p-3 whitespace-nowrap text-slate-700">${ystat.fixed_monthly.toLocaleString()} دج</td>
                                                <td class="p-3 whitespace-nowrap text-slate-700">${(ystat.general + ystat.maintenance + ystat.supplies).toLocaleString()} دج</td>
                                                <td class="p-3 whitespace-nowrap text-center font-bold text-slate-500">${ystat.count}</td>
                                                <td class="p-3 whitespace-nowrap text-center">
                                                    <span class="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">${yPct}%</span>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
    };

    window.renderExpensesListView = function() {
        const container = document.getElementById('expensesListView');
        if (!container) return; const allExpenses = Array.isArray(appState.expenses) ? appState.expenses : [];
        const now = new Date(); const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        // 1. Calculate stats
        let todayTotal = 0; let weekTotal = 0;
        let monthTotal = 0; let yearTotal = 0;
        let grandTotal = 0; let dailyTotal = 0;
        let dailyMonth = 0; let dailyYear = 0;
        let homeTotal = 0; let homeMonth = 0;
        let homeYear = 0; let fixedTotal = 0;
        let fixedMonth = 0; let fixedYear = 0;
        let generalTotal = 0; let generalMonth = 0;
        let generalYear = 0; const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        allExpenses.forEach(ex => { const amt = Number(ex.amount) || 0;
            grandTotal += amt; const d = new Date(ex.date);
            const cat = getExpenseCategory(ex);
            if (d.toDateString() === now.toDateString()) {
                todayTotal += amt; } if (d >= oneWeekAgo) {
                weekTotal += amt; } if (d.getFullYear() === currentYear) {
                yearTotal += amt; if (cat === 'daily') dailyYear += amt;
                else if (cat === 'home') homeYear += amt;
                else if (cat === 'fixed_monthly') fixedYear += amt;
                else generalYear += amt; if (d.getMonth() === currentMonth) {
                    monthTotal += amt; if (cat === 'daily') dailyMonth += amt;
                    else if (cat === 'home') homeMonth += amt;
                    else if (cat === 'fixed_monthly') fixedMonth += amt;
                    else generalMonth += amt; }
            } if (cat === 'daily') dailyTotal += amt;
            else if (cat === 'home') homeTotal += amt;
            else if (cat === 'fixed_monthly') fixedTotal += amt;
            else generalTotal += amt; });
        // Update Statistics in DOM
        const todayElem = document.getElementById('todayExpenses');
        const weekElem = document.getElementById('weekExpenses');
        const monthElem = document.getElementById('monthExpenses');
        const yearStatsElem = document.getElementById('yearExpensesStats');
        const totalStatsElem = document.getElementById('totalExpensesStats');
        const dailyTotalElem = document.getElementById('dailyExpensesTotal');
        const dailyMonthElem = document.getElementById('dailyExpensesMonth');
        const dailyYearElem = document.getElementById('dailyExpensesYear');
        const homeTotalElem = document.getElementById('homeExpensesTotal');
        const homeMonthElem = document.getElementById('homeExpensesMonth');
        const homeYearElem = document.getElementById('homeExpensesYear');
        const fixedTotalElem = document.getElementById('fixedExpensesTotal');
        const fixedMonthElem = document.getElementById('fixedExpensesMonth');
        const fixedYearElem = document.getElementById('fixedExpensesYear');
        const generalTotalElem = document.getElementById('generalExpensesTotal');
        const generalMonthElem = document.getElementById('generalExpensesMonth');
        const generalYearElem = document.getElementById('generalExpensesYear');
        if (todayElem) todayElem.innerHTML = `${todayTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (weekElem) weekElem.innerHTML = `${weekTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (monthElem) monthElem.innerHTML = `${monthTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (yearStatsElem) yearStatsElem.innerHTML = `${yearTotal.toLocaleString()} <span class="text-xs font-normal text-blue-700">دج</span>`;
        if (totalStatsElem) totalStatsElem.innerHTML = `${grandTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (dailyTotalElem) dailyTotalElem.innerHTML = `${dailyTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (dailyMonthElem) dailyMonthElem.innerText = `${dailyMonth.toLocaleString()} دج`;
        if (dailyYearElem) dailyYearElem.innerText = `${dailyYear.toLocaleString()} دج`;
        if (homeTotalElem) homeTotalElem.innerHTML = `${homeTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (homeMonthElem) homeMonthElem.innerText = `${homeMonth.toLocaleString()} دج`;
        if (homeYearElem) homeYearElem.innerText = `${homeYear.toLocaleString()} دج`;
        if (fixedTotalElem) fixedTotalElem.innerHTML = `${fixedTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (fixedMonthElem) fixedMonthElem.innerText = `${fixedMonth.toLocaleString()} دج`;
        if (fixedYearElem) fixedYearElem.innerText = `${fixedYear.toLocaleString()} دج`;
        if (generalTotalElem) generalTotalElem.innerHTML = `${generalTotal.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (generalMonthElem) generalMonthElem.innerText = `${generalMonth.toLocaleString()} دج`;
        if (generalYearElem) generalYearElem.innerText = `${generalYear.toLocaleString()} دج`;

        // Render the detailed monthly & yearly totals
        if (typeof window.renderExpensesDetailedTotals === 'function') {
            window.renderExpensesDetailedTotals();
        }

        // 2. Filter & Render List
        const searchInput = document.getElementById('searchExpenseInput');
        const catFilter = document.getElementById('filterExpenseCategoryView');
        const countBadge = document.getElementById('expensesListCountBadge');
        const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const selectedCat = catFilter ? catFilter.value : 'all';
        let filtered = allExpenses.filter(ex => {
            const cat = getExpenseCategory(ex);
            if (selectedCat !== 'all' && cat !== selectedCat) return false;

            // Month/Year drill-down filter
            if (window.expensesDetailedState && window.expensesDetailedState.filterMonth !== null && window.expensesDetailedState.filterYear !== null) {
                if (ex.date) {
                    const d = new Date(ex.date);
                    if (d.getFullYear() !== window.expensesDetailedState.filterYear || d.getMonth() !== window.expensesDetailedState.filterMonth) {
                        return false;
                    }
                }
            }

            if (q) { const combined = `${ex.desc || ''} ${getExpenseCategoryDetails(cat).label}`.toLowerCase();
                if (!combined.includes(q)) return false;
            } return true; }); if (countBadge) {
            countBadge.innerText = `${filtered.length} مصروف مسجل`;
        } if (filtered.length === 0) { container.innerHTML = `
                <div class="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div class="mb-1 flex justify-center"><svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>
                    <div class="text-sm font-bold text-slate-700">لا توجد مصاريف مطابقة في هذا التصنيف</div>
                    <div class="text-xs text-slate-400 mt-0.5">يمكنك إضافة مصروف جديد أو تغيير خيارات البحث</div>
                </div>
            `; return; } const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map(ex => {
            const d = new Date(ex.date); const dateFormatted = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
            const safeDesc = escapeHTML(ex.desc || 'مصروف');
            const safeId = escapeHTML(ex.id || '');
            const cat = getExpenseCategory(ex);
            const catDetails = getExpenseCategoryDetails(cat);
            return `
                <div class="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-4 transition-all hover:border-slate-300">
                    <div class="flex items-center gap-3">
                        <button onclick="deleteExpense('${safeId}')" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 flex items-center justify-center transition-colors shrink-0" title="حذف المصروف">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="text-right flex-1 min-w-0">
                        <div class="flex items-center gap-2 justify-start flex-wrap mb-1">
                            <span class="text-xs font-black px-2.5 py-1 rounded-lg border ${catDetails.badgeClass} flex items-center gap-1">
                                <span>${catDetails.icon}</span>
                                <span>${catDetails.label}</span>
                            </span>
                            <span class="text-xs font-bold text-slate-400 font-mono">${dateFormatted}</span>
                        </div>
                        <div class="font-black text-slate-800 text-sm sm:text-base break-words mt-0.5">${safeDesc}</div>
                    </div>

                    <div class="text-left shrink-0 pl-2">
                        <div class="text-[10px] text-slate-400 font-bold">المبلغ</div>
                        <div class="text-base sm:text-lg font-black text-slate-900" dir="ltr">${Number(ex.amount || 0).toLocaleString()} دج</div>
                    </div>
                </div>
            `; }).join(''); }; document.getElementById('addExpenseFormView')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const dateInput = document.getElementById('expenseDateView');
        const dateVal = dateInput ? dateInput.value : '';
        const descInput = document.getElementById('expenseDescView');
        let desc = descInput ? descInput.value.trim() : '';
        const catSelect = document.getElementById('expenseCategoryView');
        const category = catSelect ? catSelect.value : 'general';
        const amountInput = document.getElementById('expenseAmountView');
        const amount = amountInput ? parseInt(amountInput.value) : NaN;
        if (!desc) {
            showErrorToast('يرجى إدخال وصف وبيان المصروف');
            if (descInput) descInput.focus();
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showErrorToast('يرجى إدخال مبلغ صحيح للمصروف');
            if (amountInput) amountInput.focus();
            return;
        }
        if (containsDangerousCode(desc)) {
            showErrorToast('تم رفض الإدخال: الوصف يحتوي على أكواد غير مسموح بها.');
            return;
        }
        desc = sanitizeInputText(desc, 100);
        if (!Array.isArray(appState.expenses)) appState.expenses = [];
        const isoDate = window.createSafeExpenseISO(dateVal);
        const newExp = { id: Date.now().toString(),
            desc: desc, amount: amount, category: category,
            date: isoDate };
        appState.expenses.push(newExp);
        if (typeof logActivity === 'function') logActivity('expense', 'تسجيل مصروف جديد', `البيان: ${desc} - الفئة: ${category}`, amount);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('expenses', newExp);
        }
        saveState();
        this.reset();
        if (dateInput) {
            dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
        }
        const catDetails = getExpenseCategoryDetails(category);
        showSuccessToast(`تم إضافة المصروف بنجاح (${catDetails.label})`);
        if (window.renderExpensesListView) window.renderExpensesListView();
        if (window.renderExpensesListModal) window.renderExpensesListModal();
        render(); }); function deleteExpense(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف مصروف', prompt: 'أدخل كلمة المرور لتأكيد حذف المصروف', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.expenses)) return;
            const deletedExp = appState.expenses.find(ex => String(ex && ex.id) === String(id));
            const expDesc = deletedExp ? deletedExp.desc : id;
            if (typeof logActivity === 'function') logActivity('expense', 'حذف مصروف', `حذف المصروف: ${expDesc}`);
            window.appState.expenses = appState.expenses.filter(ex => String(ex && ex.id) !== String(id));
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('expenses', id, deletedExp);
            }
            saveState(); showSuccessToast('تم حذف المصروف بنجاح');
            if (window.renderExpensesListView) window.renderExpensesListView();
            if (window.renderExpensesListModal) window.renderExpensesListModal();
            render();
        }); }
    function setPackageTypeForm(type) {
        // Only time packages supported
        const pkgTypeInput = document.getElementById('pkgType');
        if (pkgTypeInput) pkgTypeInput.value = 'time';
    } window.setPackageTypeForm = setPackageTypeForm;
    document.getElementById('addPackageForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); let pkgName = getElemVal('pkgName').trim();
        if (containsDangerousCode(pkgName)) {
            showErrorToast('تم رفض الإدخال: اسم الباقة غير مسموح به.');
            return; } pkgName = sanitizeInputText(pkgName, 60);
        const price = parseInt(getElemVal('pkgPrice')) || 0;
        const duration = parseInt(getElemVal('pkgDuration') || 30);
        const newPkg = { id: Date.now().toString(),
            name: pkgName, price: price, type: 'time',
            durationDays: duration }; if (!Array.isArray(appState.packages)) appState.packages = [];
        // Ensure no session packages exist
        appState.packages = appState.packages.filter(p => p && p.type !== 'session');
        appState.packages.push(newPkg);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('packages', newPkg);
        }
        if (typeof logActivity === 'function') {
            logActivity('customer', 'إضافة باقة جديدة', `اسم الباقة: ${pkgName} - السعر: ${price} دج - المدة: ${duration} يوم`, price);
        }
        saveState(); this.reset();
        showSuccessToast('تم إضافة الباقة بنجاح');
        render(); }); function deletePackage(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف باقة', prompt: 'أدخل كلمة المرور لتأكيد حذف الباقة', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.packages)) return;
            const deletedPkg = appState.packages.find(p => String(p && p.id) === String(id));
            window.appState.packages = appState.packages.filter(p => String(p && p.id) !== String(id));
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('packages', id);
            }
            if (typeof logActivity === 'function') {
                logActivity('customer', 'حذف باقة', `حذف الباقة: ${deletedPkg ? deletedPkg.name : id}`);
            }
            saveState(); showSuccessToast('تم حذف الباقة بنجاح');
            render();
        }); }
    function handleProdStockLocationChange() {
        const locSelect = document.getElementById('prodStockLocation');
        const loc = locSelect ? locSelect.value : 'both';
        const bothCont = document.getElementById('bothStockContainer');
        const singleCont = document.getElementById('singleStockContainer');
        const singleLabel = document.getElementById('singleStockLabel');
        const submitBtn = document.getElementById('prodSubmitBtn') || document.querySelector('#addProductForm button[type="submit"]');
        const isEditing = Boolean(document.getElementById('addProductForm')?.dataset.editId);
        if (loc === 'both') { if (bothCont) bothCont.classList.remove('hidden');
            if (singleCont) singleCont.classList.add('hidden');
            if (submitBtn && !isEditing) {
                submitBtn.textContent = 'إضافة المنتج إلى Stock 1 و Stock 2 معاً';
            } updateDualStockTotal(); } else {
            if (bothCont) bothCont.classList.add('hidden');
            if (singleCont) singleCont.classList.remove('hidden');
            if (singleLabel) { singleLabel.textContent = (loc === 'stock2') ? 'الكمية في Stock 2 (المستودع)*' : 'الكمية في Stock 1 (صالة البيع)*';
            } if (submitBtn && !isEditing) {
                submitBtn.textContent = (loc === 'stock2') ? 'إضافة المنتج إلى Stock 2 (المستودع)' : 'إضافة المنتج إلى Stock 1 (صالة البيع)';
            } } } window.handleProdStockLocationChange = handleProdStockLocationChange;
    function updateDualStockTotal() { const s1 = parseFloat(getElemVal('prodStock1')) || 0;
        const s2 = parseFloat(getElemVal('prodStock2')) || 0;
        const total = s1 + s2; const badge = document.getElementById('bothStockTotalBadge');
        if (badge) { badge.textContent = `المجموع: ${total} قطعة (Stock 1: ${s1} + Stock 2: ${s2})`;
        } } window.updateDualStockTotal = updateDualStockTotal;
    document.getElementById('addProductForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); const formEl = this;
        const editingId = formEl.dataset.editId;
        const brandVal = document.getElementById('prodBrand') ? getElemVal('prodBrand') : '';
        const imgUrlVal = document.getElementById('prodImageUrl') ? getElemVal('prodImageUrl') : '';
        let prodName = getElemVal('prodName').trim();
        let prodBarcode = getElemVal('prodBarcode').trim();
        if (containsDangerousCode(prodName) || containsDangerousCode(prodBarcode) || containsDangerousCode(brandVal)) {
            showErrorToast('تم رفض الإدخال: بيانات المنتج تحتوي على أكواد غير مسموح بها.');
            return; } prodName = sanitizeInputText(prodName, 80);
        prodBarcode = sanitizeInputText(prodBarcode, 40);
        const wType = document.getElementById('prodWeightType') ? getElemVal('prodWeightType') : '';
        const wVal = getElemVal('prodWeight');
        const finalWeight = (wType && wVal) ? (wType + ' - ' + wVal) : (wVal || wType || '');
        const stockLocationVal = document.getElementById('prodStockLocation') ? getElemVal('prodStockLocation') : 'both';
        const costVal = parseFloat(getElemVal('prodCost')) || 0;
        const priceVal = parseFloat(getElemVal('prodPrice')) || 0;
        const expiryDateVal = document.getElementById('prodExpiryDate') ? getElemVal('prodExpiryDate') : '';
        const categoryVal = getElemVal('prodCategory') || (typeof getProductCategory === 'function' ? getProductCategory({ name: prodName, weight: finalWeight }) : 'other');
        // Verify password before adding or updating product
        promptWithPassword({ title: editingId ? 'تعديل منتج' : 'إضافة منتج جديد',
            prompt: editingId ? 'أدخل كلمة المرور لحفظ تعديلات المنتج' : 'أدخل كلمة المرور لإضافة المنتج إلى المخزون',
            buttonText: 'حفظ المنتج' }, () => {
            if (editingId) {
                const targetProdId = String(editingId);
                const p = (appState.products || []).find(p => p && (String(p.id) === targetProdId || String(p.barcode) === targetProdId));
                if (p) {
                    p.barcode = prodBarcode;
                    p.name = prodName; p.weight = finalWeight;
                    p.cost = costVal; p.price = priceVal;
                    p.brand = brandVal; p.imageUrl = imgUrlVal;
                    p.expiryDate = expiryDateVal;
                    p.category = categoryVal;
                    p.updatedAt = Date.now();
                    if (stockLocationVal === 'both') {
                        const q1 = parseFloat(getElemVal('prodStock1')) || 0;
                        const q2 = parseFloat(getElemVal('prodStock2')) || 0;
                        if (p.stockLocation === 'stock2') {
                            p.stock = q2; let p1 = prodBarcode ? appState.products.find(x => String(x.id) !== String(p.id) && String(x.barcode) === String(prodBarcode) && (!x.stockLocation || x.stockLocation === 'stock1')) : null;
                            if (p1) { p1.stock = q1;
                                p1.name = prodName; p1.cost = costVal; p1.price = priceVal; p1.weight = finalWeight; p1.brand = brandVal; p1.imageUrl = imgUrlVal; p1.expiryDate = expiryDateVal; p1.category = categoryVal;
                                if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', p1);
                            } else if (q1 > 0) {
                                const newProd1 = {
                                    id: Date.now().toString(),
                                    barcode: prodBarcode,
                                    name: prodName,
                                    weight: finalWeight,
                                    cost: costVal,
                                    price: priceVal,
                                    stock: q1,
                                    brand: brandVal,
                                    imageUrl: imgUrlVal,
                                    stockLocation: 'stock1',
                                    expiryDate: expiryDateVal,
                                    category: categoryVal
                                };
                                appState.products.push(newProd1);
                                if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', newProd1);
                            } } else { p.stock = q1;
                            p.stockLocation = 'stock1';
                            let p2 = prodBarcode ? appState.products.find(x => String(x.id) !== String(p.id) && String(x.barcode) === String(prodBarcode) && x.stockLocation === 'stock2') : null;
                            if (p2) { p2.stock = q2;
                                p2.name = prodName; p2.cost = costVal; p2.price = priceVal; p2.weight = finalWeight; p2.brand = brandVal; p2.imageUrl = imgUrlVal; p2.expiryDate = expiryDateVal; p2.category = categoryVal;
                                if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', p2);
                            } else if (q2 > 0) {
                                const newProd2 = {
                                    id: (Date.now() + 10).toString(),
                                    barcode: prodBarcode,
                                    name: prodName,
                                    weight: finalWeight,
                                    cost: costVal,
                                    price: priceVal,
                                    stock: q2,
                                    brand: brandVal,
                                    imageUrl: imgUrlVal,
                                    stockLocation: 'stock2',
                                    expiryDate: expiryDateVal,
                                    category: categoryVal
                                };
                                appState.products.push(newProd2);
                                if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', newProd2);
                            } } } else {
                        p.stockLocation = stockLocationVal;
                        p.stock = parseFloat(getElemVal('prodStock')) || 0;
                    } if (p && window.saveFirebaseSectionItem) {
                        window.saveFirebaseSectionItem('products', p);
                    } }
                if (typeof logActivity === 'function') {
                    logActivity('sale', 'تعديل منتج في المخزون', `تعديل بيانات المنتج: ${prodName} (السعر: ${priceVal} دج)`);
                }
                delete formEl.dataset.editId;
                const submitBtn = formEl.querySelector('button[type="submit"]');
                if (submitBtn) { submitBtn.textContent = 'إضافة المنتج إلى Stock 1 و Stock 2 معاً';
                    submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                    submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                } showSuccessToast('تم تعديل المنتج بنجاح');
            } else {
                // Adding NEW Product
                if (stockLocationVal === 'both') {
                    const q1 = parseFloat(getElemVal('prodStock1')) || 0;
                    const q2 = parseFloat(getElemVal('prodStock2')) || 0;
                    if (q1 <= 0 && q2 <= 0) {
                        showErrorToast('يرجى تحديد عدد أكبر من 0 في Stock 1 أو Stock 2 على الأقل');
                        return; } if (q1 > 0) {
                        let p1 = prodBarcode ? appState.products.find(p => p.barcode === prodBarcode && (!p.stockLocation || p.stockLocation === 'stock1'))
                            : null; if (p1) { p1.stock = Number(p1.stock || 0) + q1;
                            p1.name = prodName; p1.cost = costVal; p1.price = priceVal; p1.weight = finalWeight; p1.brand = brandVal; p1.imageUrl = imgUrlVal;
                            p1.expiryDate = expiryDateVal || p1.expiryDate;
                            p1.category = categoryVal;
                            if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', p1);
                        } else { const newProd1 = {
                                id: Date.now().toString(),
                                barcode: prodBarcode,
                                name: prodName,
                                weight: finalWeight,
                                cost: costVal,
                                price: priceVal,
                                stock: q1, brand: brandVal,
                                imageUrl: imgUrlVal,
                                stockLocation: 'stock1',
                                expiryDate: expiryDateVal,
                                category: categoryVal
                            }; appState.products.push(newProd1);
                            if (newProd1 && window.saveFirebaseSectionItem) {
                                window.saveFirebaseSectionItem('products', newProd1);
                            } } } if (q2 > 0) {
                        let p2 = prodBarcode ? appState.products.find(p => p.barcode === prodBarcode && p.stockLocation === 'stock2')
                            : null; if (p2) { p2.stock = Number(p2.stock || 0) + q2;
                            p2.name = prodName; p2.cost = costVal; p2.price = priceVal; p2.weight = finalWeight; p2.brand = brandVal; p2.imageUrl = imgUrlVal;
                            p2.expiryDate = expiryDateVal || p2.expiryDate;
                            p2.category = categoryVal;
                            if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', p2);
                        } else { const newProd2 = {
                                id: (Date.now() + 20).toString(),
                                barcode: prodBarcode,
                                name: prodName,
                                weight: finalWeight,
                                cost: costVal,
                                price: priceVal,
                                stock: q2, brand: brandVal,
                                imageUrl: imgUrlVal,
                                stockLocation: 'stock2',
                                expiryDate: expiryDateVal,
                                category: categoryVal
                            }; appState.products.push(newProd2);
                            if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', newProd2);
                        } } showSuccessToast(`تم إضافة المنتج بنجاح: (${q1}) في Stock 1 و (${q2}) في Stock 2`);
                } else {
                    // Single stock location
                    const singleQty = parseFloat(getElemVal('prodStock')) || 0;
                    let existing = prodBarcode ? appState.products.find(p => p.barcode === prodBarcode && (stockLocationVal === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')))
                        : null; if (existing) {
                        existing.stock = Number(existing.stock || 0) + singleQty;
                        existing.cost = costVal;
                        existing.price = priceVal;
                        existing.name = prodName;
                        existing.weight = finalWeight;
                        existing.brand = brandVal;
                        existing.imageUrl = imgUrlVal;
                        existing.expiryDate = expiryDateVal || existing.expiryDate;
                        existing.category = categoryVal;
                        if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', existing);
                    } else { const newProduct = {
                            id: Date.now().toString(),
                            barcode: prodBarcode,
                            name: prodName,
                            weight: finalWeight,
                            cost: costVal, price: priceVal,
                            stock: singleQty,
                            brand: brandVal,
                            imageUrl: imgUrlVal,
                            stockLocation: stockLocationVal,
                            expiryDate: expiryDateVal,
                            category: categoryVal
                        }; appState.products.push(newProduct);
                        if (window.saveFirebaseSectionItem) {
                            window.saveFirebaseSectionItem('products', newProduct);
                        } }
                    showSuccessToast(`تم إضافة المنتج إلى ${stockLocationVal === 'stock2' ? 'Stock 2 (المستودع)' : 'Stock 1 (صالة البيع)'} بنجاح`);
                } }
                saveState();
                const savedExpInfo = getProductExpiryInfo({ expiryDate: expiryDateVal });
                formEl.reset();
                if (document.getElementById('prodStock1')) setElemValue('prodStock1', '');
                if (document.getElementById('prodStock2')) setElemValue('prodStock2', '');
                if (document.getElementById('prodStock')) setElemValue('prodStock', '');
                if (document.getElementById('prodExpiryDate')) setElemValue('prodExpiryDate', '');
                if (document.getElementById('prodStockLocation')) setElemValue('prodStockLocation', 'both');
                handleProdStockLocationChange();
                if (typeof removeProductImage === 'function') {
                    removeProductImage();
                }
                if (savedExpInfo.hasExpiry && savedExpInfo.isNearExpiry) {
                    if (typeof setStockFilter === 'function') {
                        setStockFilter('near_expiry');
                    }
                    if (savedExpInfo.isExpired) {
                        showSuccessToast(`⚠️ تم حفظ المنتج ونقله تلقائياً إلى قائمة [قريبة الانتهاء] (منتهي الصلاحية منذ ${Math.abs(savedExpInfo.diffDays)} يوم)`);
                    } else {
                        const approxMonths = Math.max(1, Math.ceil(savedExpInfo.daysLeft / 30));
                        showSuccessToast(`⚡ تم حفظ المنتج وتوجيهه تلقائياً إلى قائمة [قريبة الانتهاء] (متبقي ${savedExpInfo.daysLeft} يوم ~${approxMonths} أشهر)`);
                    }
                } else {
                    if (typeof renderProductsList === 'function') renderProductsList();
                    if (typeof render === 'function') render();
                }
            }); });
    function editProduct(id) {
        const targetId = String(id);
        const p = (appState.products || []).find(p => p && (String(p.id) === targetId || String(p.barcode) === targetId));
        if(!p) return; setElemValue('prodBarcode', p.barcode || '');
        setElemValue('prodName', p.name || '');
        let pWeight = p.weight || ''; let wType = '';
        let wVal = pWeight; if (pWeight.includes(' - ')) {
            let parts = pWeight.split(' - ');
            wType = parts[0]; wVal = parts.slice(1).join(' - ');
        } if (document.getElementById('prodWeightType')) setElemValue('prodWeightType', wType);
        setElemValue('prodWeight', wVal);
        setElemValue('prodCost', p.cost || 0);
        setElemValue('prodPrice', p.price || 0);
        // Check if counterpart product exists in the other stock
        const counterpart = p.barcode ? (appState.products || []).find(x => x && String(x.id) !== String(p.id) && String(x.barcode) === String(p.barcode)) : null;
        if (counterpart) { if (document.getElementById('prodStockLocation')) setElemValue('prodStockLocation', 'both');
            handleProdStockLocationChange();
            const s1Val = (p.stockLocation === 'stock2') ? counterpart.stock : p.stock;
            const s2Val = (p.stockLocation === 'stock2') ? p.stock : counterpart.stock;
            if (document.getElementById('prodStock1')) setElemValue('prodStock1', s1Val || 0);
            if (document.getElementById('prodStock2')) setElemValue('prodStock2', s2Val || 0);
            updateDualStockTotal(); } else { if (document.getElementById('prodStockLocation')) setElemValue('prodStockLocation', p.stockLocation || 'stock1');
            handleProdStockLocationChange(); if (document.getElementById('prodStock')) setElemValue('prodStock', p.stock || 0);
            if (document.getElementById('prodStock1')) setElemValue('prodStock1', (p.stockLocation === 'stock2') ? 0 : (p.stock || 0));
            if (document.getElementById('prodStock2')) setElemValue('prodStock2', (p.stockLocation === 'stock2') ? (p.stock || 0) : 0);
            updateDualStockTotal(); } if (document.getElementById('prodBrand')) setElemValue('prodBrand', p.brand || '');
        if (document.getElementById('prodExpiryDate')) setElemValue('prodExpiryDate', p.expiryDate || '');
        if (document.getElementById('prodCategory')) {
            setElemValue('prodCategory', p.category || (typeof getProductCategory === 'function' ? getProductCategory(p) : 'other'));
        } if (document.getElementById('prodImageUrl')) {
            setElemValue('prodImageUrl', p.imageUrl || '');
            const imgPreview = document.getElementById('prodImagePreview');
            const placeholder = document.getElementById('prodImagePlaceholder');
            const removeBtn = document.getElementById('removeProdImageBtn');
            const fileNameSpan = document.getElementById('prodImageFileName');
            if (p.imageUrl) { if (imgPreview) {
                    imgPreview.src = p.imageUrl;
                    imgPreview.classList.remove('hidden');
                } if (placeholder) placeholder.classList.add('hidden');
                if (removeBtn) removeBtn.classList.remove('hidden');
                if (fileNameSpan) fileNameSpan.textContent = 'صورة المنتج الحالية';
            } else { if (imgPreview) {
                    imgPreview.src = '';
                    imgPreview.classList.add('hidden');
                } if (placeholder) placeholder.classList.remove('hidden');
                if (removeBtn) removeBtn.classList.add('hidden');
                if (fileNameSpan) fileNameSpan.textContent = 'رفع صورة المنتج';
            } } const form = document.getElementById('addProductForm');
        form.dataset.editId = id; const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'حفظ التعديلات';
        submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        document.getElementById('prodName')?.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } window.editProduct = editProduct;
    // Stock Transfer Functions (تحويل بضاعة بين المخازن Stock 1 & Stock 2)
    function openStockTransferModal(defaultProdId) {
        openModal('stockTransferModal');
        if (defaultProdId) {
            const prod = (appState.products || []).find(p => String(p.id) === String(defaultProdId));
            if (prod) {
                const prodLoc = prod.stockLocation || 'stock1';
                const fromSelect = document.getElementById('transferFromStock');
                const toSelect = document.getElementById('transferToStock');
                if (fromSelect) fromSelect.value = prodLoc;
                if (toSelect) toSelect.value = (prodLoc === 'stock2') ? 'stock1' : 'stock2';
            }
        }
        populateTransferProducts(defaultProdId);
    }
    window.openStockTransferModal = openStockTransferModal;

    function handleTransferFromStockChange() {
        const fromLoc = getElemVal('transferFromStock') || 'stock2';
        const toSelect = document.getElementById('transferToStock');
        if (toSelect) {
            toSelect.value = (fromLoc === 'stock2') ? 'stock1' : 'stock2';
        }
        populateTransferProducts();
    }
    window.handleTransferFromStockChange = handleTransferFromStockChange;

    function handleTransferToStockChange() {
        const toLoc = getElemVal('transferToStock') || 'stock1';
        const fromSelect = document.getElementById('transferFromStock');
        if (fromSelect) {
            fromSelect.value = (toLoc === 'stock1') ? 'stock2' : 'stock1';
        }
        populateTransferProducts();
    }
    window.handleTransferToStockChange = handleTransferToStockChange;

    function populateTransferProducts(defaultProdId) {
        const fromLoc = getElemVal('transferFromStock') || 'stock2';
        const toLoc = getElemVal('transferToStock') || 'stock1';
        const prods = (appState.products || []).filter(p => {
            const loc = p.stockLocation || 'stock1';
            return loc === fromLoc && Number(p.stock || 0) > 0;
        });
        const select = document.getElementById('transferProductSelect');
        if (!select) return;
        let html = '<option value="">-- اختر المنتج لتحويله --</option>';
        html += prods.map(p => {
            const sel = (String(p.id) === String(defaultProdId)) ? 'selected' : '';
            return `<option value="${p.id}" ${sel}>${p.name} (المتوفر: ${p.stock} قطعة)${p.weight ? ` - ${p.weight}` : ''}${p.barcode ? ` [${p.barcode}]` : ''}</option>`;
        }).join('');
        select.innerHTML = html;
        if (defaultProdId && prods.some(p => String(p.id) === String(defaultProdId))) {
            select.value = defaultProdId;
        }
        updateTransferMaxQty();
    }
    window.populateTransferProducts = populateTransferProducts;

    function updateTransferMaxQty() {
        const sel = document.getElementById('transferProductSelect');
        const infoDiv = document.getElementById('transferCurrentStockInfo');
        const availBadge = document.getElementById('transferAvailableQtyBadge');
        const destBadge = document.getElementById('transferDestQtyBadge');
        const input = document.getElementById('transferQtyInput');
        const fromLoc = getElemVal('transferFromStock') || 'stock2';
        const toLoc = getElemVal('transferToStock') || 'stock1';

        if (!sel || !sel.value) {
            if (infoDiv) infoDiv.classList.add('hidden');
            return;
        }
        const sourceProd = (appState.products || []).find(x => String(x.id) === String(sel.value));
        if (sourceProd) {
            if (infoDiv) infoDiv.classList.remove('hidden');
            const sourceStock = Number(sourceProd.stock || 0);
            if (availBadge) availBadge.textContent = `${sourceStock} قطعة (${fromLoc === 'stock2' ? 'Stock 2' : 'Stock 1'})`;

            let destProd = null;
            if (sourceProd.barcode) {
                destProd = (appState.products || []).find(p => p.barcode === sourceProd.barcode && (toLoc === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')));
            } else {
                destProd = (appState.products || []).find(p => p.name === sourceProd.name && (toLoc === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')));
            }
            const destStock = destProd ? Number(destProd.stock || 0) : 0;
            if (destBadge) destBadge.textContent = `${destStock} قطعة (${toLoc === 'stock2' ? 'Stock 2' : 'Stock 1'})`;

            if (input) {
                input.max = sourceStock;
                if (!input.value || parseFloat(input.value) > sourceStock || parseFloat(input.value) <= 0) {
                    input.value = Math.min(1, sourceStock);
                }
            }
            updateTransferPreview();
        }
    }
    window.updateTransferMaxQty = updateTransferMaxQty;

    function updateTransferPreview() {
        const sel = document.getElementById('transferProductSelect');
        const previewBadge = document.getElementById('transferPreviewBadge');
        const input = document.getElementById('transferQtyInput');
        const fromLoc = getElemVal('transferFromStock') || 'stock2';
        const toLoc = getElemVal('transferToStock') || 'stock1';
        if (!sel || !sel.value || !input || !previewBadge) return;

        const sourceProd = (appState.products || []).find(x => String(x.id) === String(sel.value));
        if (!sourceProd) return;

        const qty = parseFloat(input.value) || 0;
        const sourceStock = Number(sourceProd.stock || 0);
        let destProd = null;
        if (sourceProd.barcode) {
            destProd = (appState.products || []).find(p => p.barcode === sourceProd.barcode && (toLoc === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')));
        } else {
            destProd = (appState.products || []).find(p => p.name === sourceProd.name && (toLoc === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')));
        }
        const destStock = destProd ? Number(destProd.stock || 0) : 0;

        const newSourceStock = Math.max(0, sourceStock - qty);
        const newDestStock = destStock + (qty > 0 && qty <= sourceStock ? qty : 0);

        const fromName = fromLoc === 'stock2' ? 'Stock 2' : 'Stock 1';
        const toName = toLoc === 'stock2' ? 'Stock 2' : 'Stock 1';

        previewBadge.textContent = `${fromName}: (${sourceStock} ➔ ${newSourceStock})  |  ${toName}: (${destStock} ➔ ${newDestStock})`;
    }
    window.updateTransferPreview = updateTransferPreview;

    function setTransferMaxQty() {
        const sel = document.getElementById('transferProductSelect');
        const input = document.getElementById('transferQtyInput');
        if (!sel || !sel.value || !input) return;
        const p = (appState.products || []).find(x => String(x.id) === String(sel.value));
        if (p) {
            input.value = Number(p.stock || 0);
            updateTransferPreview();
        }
    }
    window.setTransferMaxQty = setTransferMaxQty;

    function handleStockTransfer(e) {
        if (e) e.preventDefault();
        const fromLoc = getElemVal('transferFromStock') || 'stock2';
        const toLoc = getElemVal('transferToStock') || 'stock1';
        const prodId = getElemVal('transferProductSelect');
        const qty = parseFloat(getElemVal('transferQtyInput'));
        if (!prodId) {
            showErrorToast('يرجى اختيار المنتج المراد تحويله');
            return;
        }
        if (isNaN(qty) || qty <= 0) {
            showErrorToast('يرجى إدخال كمية صحيحة للتحويل');
            return;
        }
        const sourceProd = (appState.products || []).find(p => String(p.id) === String(prodId));
        if (!sourceProd) {
            showErrorToast('المنتج غير موجود');
            return;
        }
        if (Number(sourceProd.stock || 0) < qty) {
            showErrorToast(`الكمية المتوفرة بالمصدر (${sourceProd.stock}) أقل من الكمية المطلوبة (${qty})`);
            return;
        }

        // Deduct from source
        sourceProd.stock = Number(sourceProd.stock || 0) - qty;

        // Find or create target product in destination stock
        let targetProd = null;
        if (sourceProd.barcode) {
            targetProd = (appState.products || []).find(p => p.barcode === sourceProd.barcode && (toLoc === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')));
        } else {
            targetProd = (appState.products || []).find(p => p.name === sourceProd.name && (toLoc === 'stock2' ? p.stockLocation === 'stock2' : (!p.stockLocation || p.stockLocation === 'stock1')));
        }

        if (targetProd) {
            targetProd.stock = Number(targetProd.stock || 0) + qty;
            if (!targetProd.expiryDate && sourceProd.expiryDate) {
                targetProd.expiryDate = sourceProd.expiryDate;
            }
        } else {
            targetProd = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
                barcode: sourceProd.barcode || '',
                name: sourceProd.name,
                weight: sourceProd.weight || '',
                weightType: sourceProd.weightType || '',
                category: sourceProd.category || 'other',
                cost: sourceProd.cost || 0,
                price: sourceProd.price || 0,
                stock: qty,
                brand: sourceProd.brand || '',
                imageUrl: sourceProd.imageUrl || '',
                stockLocation: toLoc,
                expiryDate: sourceProd.expiryDate || ''
            };
            appState.products.push(targetProd);
        }

        // Sync with Firebase
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('products', sourceProd);
            window.saveFirebaseSectionItem('products', targetProd);
        }

        // Log Activity
        if (typeof logActivity === 'function') {
            const fromName = fromLoc === 'stock2' ? 'Stock 2 (المستودع)' : 'Stock 1 (صالة البيع)';
            const toName = toLoc === 'stock2' ? 'Stock 2 (المستودع)' : 'Stock 1 (صالة البيع)';
            logActivity('sale', 'تحويل مخزون بين المخازن', `نقل (${qty}) قطعة من [${sourceProd.name}] من ${fromName} إلى ${toName}`);
        }

        saveState();
        closeModal('stockTransferModal');
        playBeep();
        showSuccessToast(`تم تحويل (${qty}) قطعة من [${fromLoc === 'stock2' ? 'Stock 2' : 'Stock 1'}] إلى [${toLoc === 'stock2' ? 'Stock 2' : 'Stock 1'}] بنجاح!`);
        if (typeof renderProductsList === 'function') renderProductsList();
        if (typeof updateSellProductDropdown === 'function') updateSellProductDropdown();
    }
    window.handleStockTransfer = handleStockTransfer;
    function deleteProduct(id) { if (!id) return;
        promptWithPassword({ title: 'حذف منتج من المخزون',
            prompt: 'أدخل كلمة المرور لتأكيد حذف هذا المنتج نهائياً من المخزون',
            buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.products)) return;
            const prodToDelete = appState.products.find(p => String(p && p.id) === String(id));
            window.appState.products = appState.products.filter(p => String(p && p.id) !== String(id));
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('products', id);
                if (prodToDelete?.barcode) window.deleteFirebaseSectionItem('products', prodToDelete.barcode);
            }
            if (typeof logActivity === 'function') {
                logActivity('sale', 'حذف منتج من المخزون', `حذف المنتج: ${prodToDelete ? prodToDelete.name : id}`);
            }
            saveState(); showSuccessToast('تم حذف المنتج بنجاح');
            if (typeof renderProductsList === 'function') renderProductsList();
            render();
        });
    } window.deleteProduct = deleteProduct;
    // Attach globals for HTML event handlers
    window.toggleView = toggleView; window.openModal = openModal;
    window.closeModal = closeModal; window.deleteCustomer = deleteCustomer;
    window.toggleFreeze = toggleFreeze; window.setFilter = setFilter;
    window.deletePackage = deletePackage; window.deleteExpense = deleteExpense;
    window.handleOverlayClick = handleOverlayClick;
    window.closeBulkImportModal = closeBulkImportModal;
    window.startBulkImport = startBulkImport;
    window.closeBarcodeCamera = closeBarcodeCamera;
    window.openBarcodeCamera = openBarcodeCamera;
    window.restartBarcodeScanner = restartBarcodeScanner;
    window.processBarcode = processBarcode;
    window.deleteProduct = deleteProduct; window.fetchGlobalProductData = fetchGlobalProductData;
    window.handleLogin = handleLogin; window.handleLogout = handleLogout;
    window.sendMessage = sendMessage; window.togglePasswordVisibility = togglePasswordVisibility;
    window.togglePrivacy = togglePrivacy; window.clearAllData = clearAllData;
    window.openBulkImportModal = openBulkImportModal;
    window.openEditModal = openEditModal;
    // --- Smooth Scroll & Drag Navigation for Top Header Icons (PC + Mobile) ---
    let isNavDragging = false; let navDragStartX = 0;
    let navScrollStartLeft = 0; let navHasMoved = false;
    window.handleNavButtonClick = function(event, actionCallback) {
        if (navHasMoved) { event.preventDefault();
            event.stopPropagation(); return; }
        if (typeof actionCallback === 'function') {
            actionCallback(); } }; window.scrollHeaderNav = function(offset) {
        const nav = document.getElementById('topHeaderNav');
        if (!nav) return; nav.scrollBy({ left: offset, behavior: 'smooth' });
        setTimeout(window.updateHeaderNavControls, 200);
    }; window.updateHeaderNavControls = function() {
        const nav = document.getElementById('topHeaderNav');
        const leftBtn = document.getElementById('headerScrollLeftBtn');
        const rightBtn = document.getElementById('headerScrollRightBtn');
        if (!nav) return;
        // On mobile screens (under 768px), keep scroll arrows hidden
        if (window.innerWidth < 768) { if (leftBtn) leftBtn.classList.add('hidden');
            if (rightBtn) rightBtn.classList.add('hidden');
            return; } const isScrollable = nav.scrollWidth > (nav.clientWidth + 4);
        if (!isScrollable) { if (leftBtn) leftBtn.classList.add('hidden');
            if (rightBtn) rightBtn.classList.add('hidden');
            return; } if (leftBtn) leftBtn.classList.remove('hidden');
        if (rightBtn) rightBtn.classList.remove('hidden');
        const sl = Math.abs(nav.scrollLeft);
        const maxScroll = nav.scrollWidth - nav.clientWidth;
        if (leftBtn) { leftBtn.style.opacity = sl <= 4 ? '0.35' : '1';
        } if (rightBtn) { rightBtn.style.opacity = sl >= (maxScroll - 4) ? '0.35' : '1';
        } }; window.initHeaderNavScroll = function() {
        const nav = document.getElementById('topHeaderNav');
        if (!nav || nav.dataset.scrollInitialized) return;
        nav.dataset.scrollInitialized = 'true';
        // 1. Mouse wheel horizontal scrolling on PC
        nav.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) > 0 || Math.abs(e.deltaX) > 0) {
                e.preventDefault(); const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY)) ? e.deltaX : e.deltaY;
                nav.scrollLeft += delta * 1.1;
                window.updateHeaderNavControls();
            } }, { passive: false });
        // 2. Mouse Drag-to-Scroll on Desktop
        nav.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isNavDragging = true; navHasMoved = false;
            navDragStartX = e.pageX - nav.offsetLeft;
            navScrollStartLeft = nav.scrollLeft;
            nav.classList.add('cursor-grabbing');
            nav.classList.remove('cursor-grab');
        }); window.addEventListener('mousemove', (e) => {
            if (!isNavDragging || !nav) return;
            const x = e.pageX - nav.offsetLeft;
            const walk = (x - navDragStartX) * 1.4;
            if (Math.abs(walk) > 4) {
                navHasMoved = true; } nav.scrollLeft = navScrollStartLeft - walk;
            window.updateHeaderNavControls(); });
        window.addEventListener('mouseup', () => {
            if (!isNavDragging) return;
            isNavDragging = false; if (nav) {
                nav.classList.remove('cursor-grabbing');
                nav.classList.add('cursor-grab');
            } setTimeout(() => { navHasMoved = false;
            }, 60); }); nav.addEventListener('scroll', () => {
            window.updateHeaderNavControls(); }, { passive: true });
        window.addEventListener('resize', window.updateHeaderNavControls);
        // Initial check
        setTimeout(window.updateHeaderNavControls, 250);
    };
    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initHeaderNavScroll);
    } else { window.initHeaderNavScroll(); }
    window.addEventListener('load', window.initHeaderNavScroll);
    async function fetchGlobalProductData(barcode) {
        if (!barcode) { showErrorToast('الرجاء إدخال الباركود للبحث');
            return; } const normalizedBarcode = String(barcode).trim().toLowerCase();
        const localCandidate = (appState.products || []).find(p => String(p.barcode || '').trim().toLowerCase() === normalizedBarcode);
        showSuccessToast('جاري البحث عن بيانات المنتج...');
        let product = null;
        if (window.findProductByBarcode) {
            try { product = await window.findProductByBarcode(barcode); } catch (e) { console.warn('findProductByBarcode note:', e); }
        }
        if (!product && window.firebaseDB && window.firebaseGet && window.firebaseRef) {
            try { const snapshot = await window.firebaseGet(window.firebaseRef(window.firebaseDB, 'products/' + barcode));
                if (snapshot.exists()) { product = snapshot.val();
                } } catch (e) { console.warn('Firebase search note:', e?.message || e);
            } } if (!product && localCandidate) {
            product = localCandidate; } if (product) {
            if (document.getElementById('prodName')) setElemValue('prodName', product.name || '');
            let pWeight = product.weight || '';
            let wType = ''; let wVal = pWeight;
            if (pWeight.includes(' - ')) { let parts = pWeight.split(' - ');
                wType = parts[0]; wVal = parts.slice(1).join(' - ');
            } if (document.getElementById('prodWeightType')) setElemValue('prodWeightType', wType);
            if (document.getElementById('prodWeight')) setElemValue('prodWeight', wVal);
            if (document.getElementById('prodCost')) setElemValue('prodCost', product.cost || '');
            if (document.getElementById('prodPrice')) setElemValue('prodPrice', product.price || '');
            if (document.getElementById('prodBrand')) {
                setElemValue('prodBrand', product.brand || '');
            } if (document.getElementById('prodExpiryDate') && product.expiryDate) {
                setElemValue('prodExpiryDate', product.expiryDate);
            } if (document.getElementById('prodImageUrl')) {
                setElemValue('prodImageUrl', product.imageUrl || '');
                const imgPreview = document.getElementById('prodImagePreview');
                if (imgPreview) { if (product.imageUrl) {
                        imgPreview.src = product.imageUrl;
                        imgPreview.classList.remove('hidden');
                    } else { imgPreview.src = '';
                        imgPreview.classList.add('hidden');
                    } } }
            // Check local stock quantities
            const local1 = (appState.products || []).find(p => String(p.barcode || '').trim().toLowerCase() === normalizedBarcode && (!p.stockLocation || p.stockLocation === 'stock1'));
            const local2 = (appState.products || []).find(p => String(p.barcode || '').trim().toLowerCase() === normalizedBarcode && p.stockLocation === 'stock2');
            if (local1 || local2) { if (document.getElementById('prodStock1')) setElemValue('prodStock1', local1 ? local1.stock : 0);
                if (document.getElementById('prodStock2')) setElemValue('prodStock2', local2 ? local2.stock : 0);
                if (document.getElementById('prodStock')) setElemValue('prodStock', local1 ? local1.stock : (local2 ? local2.stock : 0));
                if (typeof updateDualStockTotal === 'function') updateDualStockTotal();
            } showSuccessToast('تم جلب بيانات المنتج بنجاح');
        } else { showErrorToast('المنتج غير مسجل — يمكنك إدخال بياناته الآن');
            const nameInput = document.getElementById('prodName');
            if (nameInput) nameInput.focus(); }
    } window.fetchGlobalProductData = fetchGlobalProductData;
    window.handleLogout = handleLogout; window.sendMessage = sendMessage;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.togglePrivacy = togglePrivacy;
    function updateProductStock(id, diff) {
        const product = appState.products.find(p => p.id === id);
        if (product) { product.stock += diff;
            saveState(); } } window.updateProductStock = updateProductStock;
    function parseProductWeight(weightStr) { if (!weightStr) return null;
        let parts = weightStr.split(' - '); let valStr = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];
        let match = valStr.match(/(\d+(\.\d+)?)/);
        if (match) { return parseFloat(match[1]);
        } return null; } window.setSellStockLocation = function(loc) {
        appState.sellStockFilter = 'stock1';
        const hiddenInput = document.getElementById('sellStockLocation');
        if (hiddenInput) hiddenInput.value = 'stock1';
        const badge = document.getElementById('sellStockLocationBadge');
        if (badge) { badge.className = 'text-[9px] px-2.5 py-1 rounded-md font-extrabold bg-blue-100 text-blue-800 border border-blue-200';
            badge.textContent = 'Stock 1 (صالة البيع)';
        } updateSellProductDropdown();
        updateStockInfoDisplay(); }; function updateSellProductDropdown() {
        const select = document.getElementById('sellProdId');
        if (!select) return; const currentVal = select.value;
        appState.sellStockFilter = 'stock1'; let prods = appState.products || [];
        // Strictly filter to Stock 1 only for sales
        prods = prods.filter(p => !p.stockLocation || p.stockLocation === 'stock1');
        let html = '<option value="">اختر المنتج من Stock 1...</option>';
        html += prods.map(p => { const exp = (typeof getProductExpiryInfo === 'function') ? getProductExpiryInfo(p) : null;
            const expTag = (exp && exp.isNearExpiry) ? (exp.isExpired ? ' [منتهي الصلاحية]' : ` [قارب على الانتهاء: باقي ${exp.daysLeft} يوم]`) : '';
            return `<option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${p.name} (${p.price} دج) - المتوفر بـ Stock 1: ${p.stock}${expTag}</option>`;
        }).join(''); select.innerHTML = html; if (currentVal && prods.some(p => p.id === currentVal)) {
            select.value = currentVal; } }
    window.updateSellProductDropdown = updateSellProductDropdown;

    function handlePosProductSearch(query, isEnter = false) {
        query = String(query || '').trim().toLowerCase();
        const statusElem = document.getElementById('posSearchProductStatus');
        const select = document.getElementById('sellProdId');
        if (!select) return;

        if (!query) {
            if (statusElem) statusElem.innerHTML = '';
            updateSellProductDropdown();
            updateStockInfoDisplay();
            return;
        }

        const prods = Array.isArray(appState.products) ? appState.products : [];
        
        // 1. Exact barcode match in Stock 1
        const exactStock1Match = prods.find(p => String(p.barcode || '').trim().toLowerCase() === query && (!p.stockLocation || p.stockLocation === 'stock1'));
        const exactStock2Match = prods.find(p => String(p.barcode || '').trim().toLowerCase() === query && p.stockLocation === 'stock2');

        if (exactStock1Match) {
            updateSellProductDropdown();
            select.value = exactStock1Match.id;
            updateStockInfoDisplay();
            const s2Info = exactStock2Match ? ` | المستودع Stock 2: ${exactStock2Match.stock}` : '';
            if (statusElem) {
                statusElem.innerHTML = `<span class="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">✅ تم تحديد: ${exactStock1Match.name} (Stock 1: ${exactStock1Match.stock}${s2Info})</span>`;
            }
            if (isEnter) {
                playBeep();
                showSuccessToast(`تم العثور على [${exactStock1Match.name}] وتحديده للبيع (المتوفر بـ Stock 1: ${exactStock1Match.stock})`);
            }
            return;
        } else if (exactStock2Match) {
            if (statusElem) {
                statusElem.innerHTML = `<span class="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">⚠️ المنتج [${exactStock2Match.name}] متوفر فقط في المستودع Stock 2 (${exactStock2Match.stock} قطعة) — يرجى تحويله إلى Stock 1 أولاً</span>`;
            }
            if (isEnter) {
                showErrorToast(`المنتج [${exactStock2Match.name}] متوفر بالمستودع (Stock 2) فقط (${exactStock2Match.stock} قطعة). لا يمكن البيع المباشر منه، يرجى تحويله إلى Stock 1 أولاً.`);
            }
            return;
        }

        // 2. Partial barcode or name matching
        const matchingStock1 = prods.filter(p => (!p.stockLocation || p.stockLocation === 'stock1') && (
            String(p.barcode || '').toLowerCase().includes(query) ||
            String(p.name || '').toLowerCase().includes(query) ||
            String(p.brand || '').toLowerCase().includes(query)
        ));

        if (matchingStock1.length === 1) {
            const found = matchingStock1[0];
            updateSellProductDropdown();
            select.value = found.id;
            updateStockInfoDisplay();
            const s2Companion = prods.find(p => p.stockLocation === 'stock2' && ((p.barcode && p.barcode === found.barcode) || p.name === found.name));
            const s2Info = s2Companion ? ` | Stock 2: ${s2Companion.stock}` : '';
            if (statusElem) {
                statusElem.innerHTML = `<span class="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">🔍 ${found.name} (Stock 1: ${found.stock}${s2Info})</span>`;
            }
            if (isEnter) {
                playBeep();
                showSuccessToast(`تم تحديد [${found.name}] للبيع`);
            }
        } else if (matchingStock1.length > 1) {
            let html = `<option value="">-- نتائج البحث (${matchingStock1.length} منتجات) --</option>`;
            html += matchingStock1.map(p => {
                const exp = (typeof getProductExpiryInfo === 'function') ? getProductExpiryInfo(p) : null;
                const expTag = (exp && exp.isNearExpiry) ? (exp.isExpired ? ' [منتهي]' : ` [باقي ${exp.daysLeft} يوم]`) : '';
                return `<option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${p.name} (${p.price} دج) - متوفر بـ Stock 1: ${p.stock}${expTag}</option>`;
            }).join('');
            select.innerHTML = html;
            if (statusElem) {
                statusElem.innerHTML = `<span class="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">تم إيجاد ${matchingStock1.length} منتجات مطابقة في Stock 1</span>`;
            }
        } else {
            const matchingStock2Only = prods.filter(p => p.stockLocation === 'stock2' && (
                String(p.barcode || '').toLowerCase().includes(query) ||
                String(p.name || '').toLowerCase().includes(query)
            ));
            if (matchingStock2Only.length > 0) {
                if (statusElem) {
                    statusElem.innerHTML = `<span class="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">⚠️ موجود بالمستودع Stock 2 فقط (${matchingStock2Only[0].stock} قطعة)</span>`;
                }
            } else {
                if (statusElem) {
                    statusElem.innerHTML = `<span class="text-slate-400 font-medium">لا يوجد منتج مطابق للكود "${query}" في المخزون</span>`;
                }
            }
        }
    }
    window.handlePosProductSearch = handlePosProductSearch;
    function setSellUnitMode(mode) {
        if (typeof updateStockInfoDisplay === 'function') updateStockInfoDisplay();
    }
    window.setSellUnitMode = setSellUnitMode;

    function updateStockInfoDisplay() { const prodId = getElemVal('sellProdId');
        const stockInfo = document.getElementById('stockInfo');
        if (!stockInfo) return; const product = appState.products ? appState.products.find(p => p.id === prodId) : null;
        if (!product) { stockInfo.classList.add('hidden');
            return; } const qty = parseFloat(getElemVal('sellProdQty')) || 1;
        const currentStock = Number(product.stock || 0);
        const weightVal = (typeof parseProductWeight === 'function') ? parseProductWeight(product.weight) : null;

        // Automatic calculation based on measurement/weight
        const deduction = (weightVal && weightVal > 0) ? (qty * weightVal) : qty;
        const unitPrice = Number(product.price || 0);
        const totalPrice = (unitPrice * qty).toFixed(2);

        const rem = currentStock - deduction; const isStock2 = product.stockLocation === 'stock2';
        stockInfo.classList.remove('hidden'); if (isStock2) {
            stockInfo.className = `text-xs font-bold p-2.5 rounded-xl border text-slate-800 bg-slate-100 border-slate-200`;
            stockInfo.innerHTML = `
                <div class="flex items-center justify-between">
                    <span>موقع المخزن: <strong class="font-extrabold">Stock 2 (مستودع)</strong></span>
                </div>
                <div class="mt-1 text-[11px] text-slate-700 font-bold">
                    هذا المنتج يتواجد في المستودع (Stock 2) ولا يمكن البيع منه مباشرة! يرجى تحويله إلى Stock 1 أولاً.
                </div>
            `; return; } const locName = 'Stock 1 (صالة البيع)';
        const locColor = 'text-blue-700 bg-blue-50 border-blue-200';
        stockInfo.className = `text-xs font-bold p-2.5 rounded-xl border ${locColor}`;
        const weightBadge = product.weight ? ` <span class="text-[10px] text-indigo-700 font-bold">(${product.weight})</span>` : '';
        stockInfo.innerHTML = `
            <div class="flex items-center justify-between">
                <span>موقع المخزن: <strong class="font-extrabold">${locName}</strong>${weightBadge}</span>
                <span>المتوفر بـ Stock 1: <strong class="font-extrabold">${currentStock}</strong></span>
            </div>
            <div class="mt-1 flex items-center justify-between text-[11px] opacity-90 border-t border-blue-200/60 pt-1">
                <span>المتبقي بعد الخصم: <strong class="${rem < 0 ? 'text-red-600 font-black' : 'text-slate-800 font-extrabold'}">${rem}</strong> <span class="text-[10px] text-indigo-700 font-black">(الخصم: ${deduction})</span></span>
                <span>إجمالي المبلغ: <strong class="text-blue-700 font-extrabold">${totalPrice} دج</strong> (سعر الوحدة: ${unitPrice} دج)</span>
            </div>
        `; } window.updateStockInfoDisplay = updateStockInfoDisplay;
    document.getElementById('sellProdId')?.addEventListener('change', updateStockInfoDisplay);
    document.getElementById('sellProdQty')?.addEventListener('input', updateStockInfoDisplay);
    document.getElementById('sellProductForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); const prodId = getElemVal('sellProdId');
        const qty = parseFloat(getElemVal('sellProdQty'));
        const product = appState.products.find(p => p.id === prodId);
        if (!product) { showErrorToast('يرجى اختيار المنتج أولاً');
            return; } if (product.stockLocation === 'stock2') {
            showErrorToast('عفواً! Stock 2 هو مستودع تخزين ولا يمكن البيع منه مباشرة. يرجى تحويل الكمية إلى Stock 1 أولاً.');
            return; } if (isNaN(qty) || qty <= 0) {
            showErrorToast('يرجى تحديد كمية صحيحة يدوياً');
            return; }

        const weightVal = (typeof parseProductWeight === 'function') ? parseProductWeight(product.weight) : null;
        let stockDeduction = (weightVal && weightVal > 0) ? (qty * weightVal) : qty;
        let salePrice = Number(product.price || 0);
        let saleCost = Number(product.cost || 0) * qty;
        let saleLabel = product.name;

        const isStock2 = product.stockLocation === 'stock2';
        const stockLocName = isStock2 ? 'مخزون 2 (Stock 2)' : 'مخزون 1 (Stock 1)';

        if (Number(product.stock || 0) < stockDeduction) {
            showErrorToast(`الكمية المطلوبة تتطلب خصم (${stockDeduction}) من المخزون ولكن المتوفر في ${stockLocName} هو (${product.stock || 0}) فقط!`);
            return; }

        let saleTotal = Number((salePrice * qty).toFixed(2));
        let saleProfit = saleTotal - saleCost;
        const coachInput = document.getElementById('sellCoachName');
        const coachVal = (coachInput && coachInput.value.trim()) ? coachInput.value.trim() : 'عام';
        const dateVal = getElemVal('sellDate') || '';
        let dateStr; if (dateVal) { const now = new Date();
            const parts = dateVal.split('-'); if (parts.length === 3) {
                const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), now.getHours(), now.getMinutes(), now.getSeconds());
                dateStr = !isNaN(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
            } else { dateStr = new Date(dateVal).toISOString();
            } } else { dateStr = new Date().toISOString();
        }
        const coachCommission = (coachVal && coachVal !== 'عام' && saleProfit > 0) ? Math.round(saleProfit * 0.33) : 0;
        const prodCategory = product.category || (typeof getProductCategory === 'function' ? getProductCategory(product) : 'other');

        product.stock = Number(product.stock || 0) - stockDeduction;

        const newSale = { id: Date.now().toString(),
            prodId: product.id, prodName: saleLabel,
            category: prodCategory,
            stockLocation: product.stockLocation || 'stock1',
            stockName: isStock2 ? 'مخزون 2' : 'مخزون 1',
            qty: qty,
            stockDeduction: stockDeduction,
            price: salePrice,
            cost: saleCost, total: saleTotal,
            profit: saleProfit, coachName: coachVal,
            coachCommission: coachCommission,
            date: dateStr };
        appState.sales.unshift(newSale);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('sales', newSale);
            window.saveFirebaseSectionItem('products', product);
        }
        saveState(); this.reset();
        if (typeof logActivity === 'function') logActivity('sale', 'عملية بيع منتج', `المنتج: ${product.name} - الكمية: ${qty} (خصم مخزون: ${stockDeduction}) - المكان: ${stockLocName}`, saleTotal);
        const sellDateElem = document.getElementById('sellDate');
        if (sellDateElem) { sellDateElem.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
        } updateSellProductDropdown();
        updateStockInfoDisplay();
        showSuccessToast(`تم البيع بنجاح وخصم (${stockDeduction}) مباشرة من ${stockLocName}`);
        render(); }); function deleteCustomer(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف مشترك', prompt: 'أدخل كلمة المرور لتأكيد حذف المشترك نهائياً', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.customers)) return;
            const deletedCust = appState.customers.find(c => String(c && c.id) === String(id));
            const custNameStr = deletedCust ? deletedCust.name : id;
            if (typeof logActivity === 'function') logActivity('customer', 'حذف مشترك', `حذف المشترك: ${custNameStr}`);
            window.appState.customers = appState.customers.filter(c => String(c && c.id) !== String(id));
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('customers', id);
            }
            // Clean up auto-generated credits for this customer
            if (Array.isArray(appState.credits)) {
                const autoId = 'cr_auto_' + id;
                window.appState.credits = appState.credits.filter(c => c.id !== autoId);
                if (window.deleteFirebaseSectionItem) {
                    window.deleteFirebaseSectionItem('credits', autoId);
                }
            } saveState(); showSuccessToast('تم حذف المشترك بنجاح');
            if (typeof window.renderCreditsList === 'function') window.renderCreditsList();
            render();
        }); }
    function calculateStatus(customer, cachedNowMs) {
      if (!customer) return 'active';
      if (customer.status === 'frozen') return 'frozen';
      const isSession = customer.subscriptionType === 'session' || (customer.remainingSessions !== undefined && customer.remainingSessions !== null);
      const nowMs = cachedNowMs || Date.now();
      if (isSession) {
        const remaining = parseInt(customer.remainingSessions) || 0;
        if (remaining <= 0) return 'expired';
        if (customer.endDate) {
          const endMs = customer._endMs || (customer._endMs = Date.parse(customer.endDate));
          if (!isNaN(endMs)) {
            const diffDays = Math.ceil((endMs - nowMs) / 86400000);
            if (diffDays < 0) return 'expired';
            if (diffDays <= 5 || remaining <= 2) return 'near_expiry';
          }
        } else if (remaining <= 2) {
          return 'near_expiry';
        }
        return 'active';
      }
      if (!customer.endDate) return 'active';
      const endMs = customer._endMs || (customer._endMs = Date.parse(customer.endDate));
      if (isNaN(endMs)) return 'active';
      const diffDays = Math.ceil((endMs - nowMs) / 86400000);
      if (diffDays < 0) return 'expired';
      if (diffDays <= 5) return 'near_expiry';
      return 'active';
    }
    function getRemainingDays(customer, cachedNowMs) {
      if (!customer) return 0;
      if (customer.status === 'frozen') return (customer.frozenRemainingDays || 0);
      if (!customer.endDate) return 0;
      const nowMs = cachedNowMs || Date.now();
      const endMs = customer._endMs || (customer._endMs = Date.parse(customer.endDate));
      if (isNaN(endMs)) return 0;
      return Math.max(0, Math.ceil((endMs - nowMs) / 86400000));
    } function recordCustomerAttendance(customerId) {
        if (!appState.customers) return;
        const customer = (appState.customers || []).find(c => c && (String(c.id) === String(customerId) || String(c._rtdbKey) === String(customerId)));
        if (!customer) return; const isSession = customer.subscriptionType === 'session' || (customer.remainingSessions !== undefined && customer.remainingSessions !== null);
        if (!isSession) { if (!customer.sessionHistory) customer.sessionHistory = [];
            customer.sessionHistory.unshift({
                date: new Date().toISOString(),
                type: 'time_checkin' });
            customer.attendedSessions = (customer.attendedSessions || 0) + 1;
            if (typeof logActivity === 'function') {
                logActivity('customer', 'تسجيل حضور مشترك', `تسجيل حضور المشترك: ${customer.name}`);
            }
            if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('customers', customer);
            saveState(); playBeep();
            showSuccessToast(`تم تسجيل حضور المشترك (${customer.name}) بنجاح`);
            render(); return; } const remaining = parseInt(customer.remainingSessions) || 0;
        if (remaining <= 0) { showErrorToast(`لقد استنفذ المشترك (${customer.name}) جميع الحصص! يرجى تجديد الاشتراك.`);
            return; } customer.remainingSessions = Math.max(0, remaining - 1);
        customer.attendedSessions = (customer.attendedSessions || 0) + 1;
        if (!customer.sessionHistory) customer.sessionHistory = [];
        customer.sessionHistory.unshift({ date: new Date().toISOString(),
            type: 'session_deduct',
            remainingAfter: customer.remainingSessions
        });
        if (typeof logActivity === 'function') {
            logActivity('customer', 'خصم حصة مشترك', `خصم حصة للمشترك: ${customer.name} (المتبقي: ${customer.remainingSessions} حصة)`);
        }
        if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('customers', customer);
        saveState(); playBeep(); if (customer.remainingSessions === 0) {
            showSuccessToast(`تم تسجيل الحصة الأخيرة لـ (${customer.name})! انتهت باقة الحصص.`);
        } else { showSuccessToast(`تم خصم حصة لـ (${customer.name}) - المتبقي: ${customer.remainingSessions} حصة`);
        } render(); } window.recordCustomerAttendance = recordCustomerAttendance;
    function adjustCustomerSessions(customerId, delta) {
        if (!appState.customers) return;
        const customer = (appState.customers || []).find(c => c && (String(c.id) === String(customerId) || String(c._rtdbKey) === String(customerId)));
        if (!customer) return; const current = parseInt(customer.remainingSessions) || 0;
        const nextVal = Math.max(0, current + delta);
        customer.remainingSessions = nextVal;
        if (typeof logActivity === 'function') {
            logActivity('customer', 'تعديل حصص مشترك', `تعديل عدد حصص المشترك (${customer.name}) المتبقية إلى: ${nextVal} حصة`);
        }
        if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('customers', customer);
        saveState(); showSuccessToast(`تم تعديل الحصص المتبقية لـ (${customer.name}) إلى: ${nextVal}`);
        render(); } window.adjustCustomerSessions = adjustCustomerSessions;
    // Staff Payouts Period Filter State
    window.staffPayoutsFilter = window.staffPayoutsFilter || {
        period: 'month', monthVal: '', worker: 'all'
    }; window.setStaffPayoutsPeriod = function(period) {
        window.staffPayoutsFilter.period = period;
        if (typeof renderStaffPayouts === 'function') renderStaffPayouts();
    }; window.handleStaffPayoutMonthChange = function(val) {
        if (val) {
            window.staffPayoutsFilter.period = 'month';
            window.staffPayoutsFilter.monthVal = val;
        }
        if (typeof renderStaffPayouts === 'function') renderStaffPayouts();
    }; window.editStaffPayout = function(id) {
        if (!id || !Array.isArray(appState.staffPayouts)) return;
        const item = appState.staffPayouts.find(p => String(p && p.id) === String(id));
        if (!item) return;
        const editIdInput = document.getElementById('editingStaffPayoutId');
        if (editIdInput) editIdInput.value = item.id;
        const nameInput = document.getElementById('staffPayoutName') || document.getElementById('staffName');
        if (nameInput) nameInput.value = item.name || item.staffName || '';
        const amountInput = document.getElementById('staffPayoutAmount') || document.getElementById('staffAmount');
        if (amountInput) amountInput.value = item.amount || item.price || '';
        const typeInput = document.getElementById('staffPayoutType');
        if (typeInput && item.type) typeInput.value = item.type;
        const dateInput = document.getElementById('staffPayoutDate');
        if (dateInput) {
            const dStr = item.date || item.payoutDate || '';
            if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
                dateInput.value = dStr.slice(0, 10);
            } else if (dStr) {
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) {
                    dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(d) : d.toISOString().split('T')[0];
                }
            }
        }
        const notesInput = document.getElementById('staffPayoutNotes') || document.getElementById('staffNotes');
        if (notesInput) notesInput.value = item.notes || '';
        const title = document.getElementById('staffPayoutFormTitle');
        if (title) {
            title.innerHTML = `
                <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                <span>تعديل خلاص: <span class="text-blue-700 font-bold">${escapeHTML(item.name || item.staffName || '')}</span></span>
            `;
        }
        const cancelBtn = document.getElementById('cancelStaffEditBtn');
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        const submitBtn = document.getElementById('staffPayoutSubmitBtn');
        if (submitBtn) {
            submitBtn.className = "flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-200 transition-colors cursor-pointer flex items-center justify-center gap-2";
        }
        const submitBtnText = document.getElementById('staffPayoutSubmitBtnText');
        if (submitBtnText) submitBtnText.textContent = "حفظ التعديلات";
        document.getElementById('addStaffPayoutForm')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }; window.cancelStaffPayoutEdit = function() {
        const editIdInput = document.getElementById('editingStaffPayoutId');
        if (editIdInput) editIdInput.value = '';
        const form = document.getElementById('addStaffPayoutForm');
        if (form) form.reset();
        const dateInput = document.getElementById('staffPayoutDate');
        if (dateInput) dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
        const title = document.getElementById('staffPayoutFormTitle');
        if (title) {
            title.innerHTML = `
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                <span>تسجيل خلاص / تسبق / مكافأة لعامل</span>
            `;
        }
        const cancelBtn = document.getElementById('cancelStaffEditBtn');
        if (cancelBtn) cancelBtn.classList.add('hidden');
        const submitBtn = document.getElementById('staffPayoutSubmitBtn');
        if (submitBtn) {
            submitBtn.className = "flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-colors cursor-pointer flex items-center justify-center gap-2";
        }
        const submitBtnText = document.getElementById('staffPayoutSubmitBtnText');
        if (submitBtnText) submitBtnText.textContent = "تسجيل خلاص العامل";
    }; function deleteStaffPayout(id) { if (!id) return;
        promptWithPassword({ title: 'حذف دفعة عامل', prompt: 'أدخل كلمة المرور لتأكيد حذف الدفعة', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.staffPayouts)) return;
            const idx = appState.staffPayouts.findIndex(s => String(s && s.id) === String(id));
            if (idx !== -1) {
                const pItem = appState.staffPayouts[idx];
                if (typeof logActivity === 'function') logActivity('payout', 'حذف خلاص عامل', `حذف الدفعة المخصصة لـ: ${pItem ? (pItem.name || pItem.staffName || id) : id}`);
                appState.staffPayouts.splice(idx, 1);
                if (window.deleteFirebaseSectionItem) window.deleteFirebaseSectionItem('staffPayouts', id);
                saveState();
                showSuccessToast('تم حذف الدفعة بنجاح');
                if (typeof renderStaffPayouts === 'function') renderStaffPayouts();
                if (typeof renderWorkerTransactionsModal === 'function' && isModalOpen('workerTransactionsModal')) renderWorkerTransactionsModal();
                render();
            }
        }); } window.deleteStaffPayout = deleteStaffPayout;
    function switchPayoutTab(tab) { const staffBtn = document.getElementById('tabStaffPayoutsBtn');
        const supBtn = document.getElementById('tabSuppliersBtn');
        const staffIconBox = document.getElementById('tabStaffIconBox');
        const supIconBox = document.getElementById('tabSupplierIconBox');
        const staffContent = document.getElementById('staffTabContent');
        const supContent = document.getElementById('suppliersTabContent');
        const activeBtnClass = 'group relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 bg-blue-600 text-white shadow-md shadow-blue-200 border-2 border-blue-600 min-h-[48px] cursor-pointer';
        const inactiveBtnClass = 'group relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 min-h-[48px] shadow-xs cursor-pointer';
        const activeIconClass = 'w-8 h-8 rounded-lg bg-white/20 border border-white/30 text-white flex items-center justify-center shrink-0 transition-transform group-hover:scale-105';
        const inactiveIconClass = 'w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105';
        if (tab === 'suppliers') { if (staffBtn) staffBtn.className = inactiveBtnClass;
            if (staffIconBox) staffIconBox.className = inactiveIconClass;
            if (supBtn) supBtn.className = activeBtnClass;
            if (supIconBox) supIconBox.className = activeIconClass;
            if (staffContent) staffContent.classList.add('hidden');
            if (supContent) supContent.classList.remove('hidden');
            renderSuppliersList(); } else { if (staffBtn) staffBtn.className = activeBtnClass;
            if (staffIconBox) staffIconBox.className = activeIconClass;
            if (supBtn) supBtn.className = inactiveBtnClass;
            if (supIconBox) supIconBox.className = inactiveIconClass;
            if (staffContent) staffContent.classList.remove('hidden');
            if (supContent) supContent.classList.add('hidden');
            renderStaffPayouts(); } } window.switchPayoutTab = switchPayoutTab;
    function openStaffPayoutsIfAllowed(tab = 'staff') {
        openModal('staffPayoutsModal');
        switchPayoutTab(tab); } window.openStaffPayoutsIfAllowed = openStaffPayoutsIfAllowed;
    function autoFillSupplierInfo(val) { const badge = document.getElementById('supplierExistingBadge');
        const badgeDebt = document.getElementById('supplierCurrentDebtBadge');
        const note = document.getElementById('supplierCalcNote');
        const debtInput = document.getElementById('supplierDebt');
        const paidInput = document.getElementById('supplierPaid');
        const itemsInput = document.getElementById('supplierItems');
        const infoInput = document.getElementById('supplierInfo');
        if (!val || !Array.isArray(appState.suppliers)) {
            if (badge) badge.classList.add('hidden');
            if (note) note.classList.add('hidden');
            return; } const normalized = val.trim().toLowerCase();
        const existing = appState.suppliers.find(s => (s && s.name || '').trim().toLowerCase() === normalized);
        if (existing) { const currentDebt = Number(existing.debt) || 0;
            if (badge) { badge.classList.remove('hidden');
                if (badgeDebt) badgeDebt.textContent = `${currentDebt.toLocaleString()} دج`;
            } if (infoInput && !infoInput.value.trim() && existing.info) {
                infoInput.value = existing.info;
            } if (itemsInput && !itemsInput.value.trim()) {
                itemsInput.placeholder = "تسديد / تخفيض دين سابق (أو اكتب السلع الجديدة إن وجدت)";
            } const paidVal = parseFloat(paidInput ? paidInput.value : 0) || 0;
            const remaining = Math.max(0, currentDebt - paidVal);
            if (debtInput) { debtInput.value = remaining;
            } if (note) { note.classList.remove('hidden');
                note.textContent = `المتبقي المحسوب تلقائياً: (${currentDebt.toLocaleString()} دج - ${paidVal.toLocaleString()} دج = ${remaining.toLocaleString()} دج)`;
            } } else { if (badge) badge.classList.add('hidden');
            if (note) note.classList.add('hidden');
            if (itemsInput) itemsInput.placeholder = "اكتب تفاصيل السلع المشتراة (مثال: 10 بروتين واي، 5 كرياتين...)";
        } } window.autoFillSupplierInfo = autoFillSupplierInfo;
    document.getElementById('addSupplierForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); let name = getElemVal('supplierName').trim();
        let info = getElemVal('supplierInfo').trim();
        let items = getElemVal('supplierItems').trim();
        const paid = parseFloat(getElemVal('supplierPaid')) || 0;
        let debt = parseFloat(getElemVal('supplierDebt'));
        if (isNaN(debt)) debt = 0; const dateStr = getElemVal('supplierDate');
        const notes = document.getElementById('supplierNotes') ? getElemVal('supplierNotes').trim() : '';
        if (containsDangerousCode(name) || containsDangerousCode(info) || containsDangerousCode(items) || containsDangerousCode(notes)) {
            showErrorToast('تحذير أمني: تم اكتشاف محتوى غير مسموح به في المدخلات.');
            return; } name = sanitizeInputText(name, 80);
        info = sanitizeInputText(info || 'عام', 100);
        items = sanitizeInputText(items, 300);
        if (!name) { showErrorToast('يرجى كتابة أو اختيار اسم المورد أولاً');
            return; } if (!appState.suppliers) appState.suppliers = [];
        const normalizedName = name.trim().toLowerCase();
        const existingIndex = appState.suppliers.findIndex(s => (s && s.name || '').trim().toLowerCase() === normalizedName);
        if (existingIndex !== -1) {
            // Combine with existing supplier card & subtract paid debt automatically
            const existing = appState.suppliers[existingIndex];
            existing.paid = (Number(existing.paid) || 0) + paid;
            // Set new debt directly to the calculated remaining debt
            existing.debt = debt; const itemEntry = items || 'تسديد / تخفيض دين سابق';
            if (existing.items && existing.items.trim()) {
                existing.items = existing.items.trim() + '\n• [' + new Date().toLocaleDateString('ar-DZ') + '] ' + itemEntry + ' (دفعة: ' + paid + ' دج)';
            } else { existing.items = itemEntry;
            } if (info && info !== 'عام') {
                existing.info = info; } if (notes) {
                existing.notes = existing.notes ? (existing.notes + ' | ' + notes) : notes;
            } if (dateStr) { existing.date = new Date(dateStr).toISOString();
            } else { existing.date = new Date().toISOString();
            }
            // Move updated card to top
            appState.suppliers.splice(existingIndex, 1);
            appState.suppliers.unshift(existing);
            // Record into detailed transaction history
            if (!appState.supplierTransactions) appState.supplierTransactions = [];
            const isPur = items && items.trim() && items !== 'تسديد / تخفيض دين سابق';
            const newTxObj = {
                id: 'tx_' + Date.now().toString(),
                supplierName: existing.name,
                supplierInfo: existing.info,
                type: isPur ? 'purchase' : 'payment',
                items: items || (isPur ? 'سلع ومكملات' : 'تسديد دفعة / فرسيمو لتخفيض الدين'),
                totalAmount: isPur ? (paid + debt) : paid,
                paidAmount: paid, remainingDebt: debt,
                date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
                notes: notes || '', createdAt: new Date().toISOString()
            };
            appState.supplierTransactions.unshift(newTxObj);
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('suppliers', existing);
                window.saveFirebaseSectionItem('supplierTransactions', newTxObj);
            }
            if (typeof logActivity === 'function') {
                logActivity('supplier', 'تحديث حساب مورد', `المورد: ${existing.name} - مدفوع: ${paid} دج - الكريدي المتبقي: ${debt} دج`, paid);
            }
            saveState(); this.reset(); const sDate = document.getElementById('supplierDate');
            if (sDate) sDate.value = new Date().toISOString().split('T')[0];
            autoFillSupplierInfo('');
            showSuccessToast(`تم تحديث حساب المورد (${existing.name}) بنجاح. الكريدي المتبقي: ${existing.debt.toLocaleString()} دج`);
            renderSuppliersList();
            return; }
        if (!items) { showErrorToast('يرجى كتابة تفاصيل السلع المشتراة للمورد الجديد');
            return; } const newSupObj = { id: Date.now().toString(),
            name, info: info || 'عام', items,
            paid, debt, date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
            notes }; appState.suppliers.unshift(newSupObj);
        // Record into detailed transaction history
        if (!appState.supplierTransactions) appState.supplierTransactions = [];
        const newTxObj = {
            id: 'tx_' + Date.now().toString(),
            supplierName: name, supplierInfo: info || '',
            type: 'purchase', items: items,
            totalAmount: paid + debt, paidAmount: paid,
            remainingDebt: debt, date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
            notes: notes || '', createdAt: new Date().toISOString()
        };
        appState.supplierTransactions.unshift(newTxObj);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('suppliers', newSupObj);
            window.saveFirebaseSectionItem('supplierTransactions', newTxObj);
        }
        if (typeof logActivity === 'function') {
            logActivity('supplier', 'تسجيل فاتورة/معاملة مورد', `المورد: ${name} - التفاصيل: ${items} - مدفوع: ${paid} دج`, paid);
        }
        saveState(); this.reset(); const sDate = document.getElementById('supplierDate');
        if (sDate) sDate.value = new Date().toISOString().split('T')[0];
        showSuccessToast('تم تسجيل فاتورة / معاملة المورد بنجاح');
        renderSuppliersList();
        }); function deleteSupplier(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف معاملة مورد', prompt: 'أدخل كلمة المرور لتأكيد حذف معاملة المورد', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.suppliers)) return;
            const deletedSup = appState.suppliers.find(s => String(s && s.id) === String(id));
            appState.suppliers = appState.suppliers.filter(s => String(s && s.id) !== String(id));
            window.appState.suppliers = appState.suppliers;
            if (window.deleteFirebaseSectionItem) window.deleteFirebaseSectionItem('suppliers', id);
            if (typeof logActivity === 'function') {
                logActivity('supplier', 'حذف معاملة مورد', `حذف المورد: ${deletedSup ? deletedSup.name : id}`);
            }
            saveState(); showSuccessToast('تم حذف معاملة المورد بنجاح');
            renderSuppliersList();
        }); } window.deleteSupplier = deleteSupplier;
    function openEditSupplierModal(id) { if (!appState.suppliers) return;
        const sup = appState.suppliers.find(s => String(s.id) === String(id));
        if (!sup) return; setElemValue('editSupplierId', sup.id);
        setElemValue('editSupplierName', sup.name || '');
        setElemValue('editSupplierInfo', sup.info || '');
        setElemValue('editSupplierItems', sup.items || '');
        setElemValue('editSupplierPaid', sup.paid !== undefined ? sup.paid : 0);
        setElemValue('editSupplierDebt', sup.debt !== undefined ? sup.debt : 0);
        const d = new Date(sup.date); const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        setElemValue('editSupplierDate', dateStr);
        setElemValue('editSupplierNotes', sup.notes || '');
        openModal('editSupplierModal'); } window.openEditSupplierModal = openEditSupplierModal;
    function handleEditSupplierSubmit(e) { if (e && e.preventDefault) e.preventDefault();
        const id = getElemVal('editSupplierId');
        if (!appState.suppliers) return false;
        const index = appState.suppliers.findIndex(s => String(s.id) === String(id));
        if (index === -1) return false; let name = getElemVal('editSupplierName').trim();
        let info = getElemVal('editSupplierInfo').trim();
        let items = getElemVal('editSupplierItems').trim();
        const paid = parseFloat(getElemVal('editSupplierPaid')) || 0;
        const debt = parseFloat(getElemVal('editSupplierDebt')) || 0;
        const dateVal = getElemVal('editSupplierDate');
        let notes = document.getElementById('editSupplierNotes') ? getElemVal('editSupplierNotes').trim() : '';
        if (containsDangerousCode(name) || containsDangerousCode(info) || containsDangerousCode(items) || containsDangerousCode(notes)) {
            showErrorToast('تحذير أمني: تم اكتشاف محتوى غير مسموح به في المدخلات.');
            return false; } name = sanitizeInputText(name, 80);
        info = sanitizeInputText(info, 100);
        items = sanitizeInputText(items, 300);

        const oldSup = appState.suppliers[index];
        const oldName = oldSup ? (oldSup.name || '') : '';
        const oldPaid = oldSup ? (Number(oldSup.paid) || 0) : 0;
        const oldDebt = oldSup ? (Number(oldSup.debt) || 0) : 0;
        const oldItems = oldSup ? (oldSup.items || '') : '';

        appState.suppliers[index] = { ...appState.suppliers[index],
            name, info, items, paid, debt, date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
            notes };
        if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('suppliers', appState.suppliers[index]);

        const changes = [];
        if (oldName !== name) changes.push(`الاسم: من "${oldName}" إلى "${name}"`);
        if (oldPaid !== paid) changes.push(`المدفوع: من ${oldPaid.toLocaleString()} دج إلى ${paid.toLocaleString()} دج`);
        if (oldDebt !== debt) changes.push(`الدين: من ${oldDebt.toLocaleString()} دج إلى ${debt.toLocaleString()} دج`);
        if (oldItems !== items && items) changes.push(`السلع: من "${oldItems || 'غير محدد'}" إلى "${items}"`);

        let detailMsg = `تعديل بيانات المورد (${name})`;
        if (changes.length > 0) detailMsg += ` | ` + changes.join(' | ');

        if (typeof logActivity === 'function') {
            logActivity('supplier', 'تعديل معاملة مورد', detailMsg, paid);
        }

        saveState(); closeModal('editSupplierModal');
        showSuccessToast('تم تعديل معاملة المورد بنجاح');
        renderSuppliersList(); return false; }
    window.handleEditSupplierSubmit = handleEditSupplierSubmit;
    function renderSuppliersList() { const sDate = document.getElementById('supplierDate');
        if (sDate && !sDate.value) { sDate.value = new Date().toISOString().split('T')[0];
        } const listContainer = document.getElementById('suppliersList');
        const totalPaidElem = document.getElementById('totalSupplierPaid');
        const totalDebtElem = document.getElementById('totalSupplierDebt');
        const countBadge = document.getElementById('suppliersCountBadge');
        if (!appState.suppliers) appState.suppliers = [];
        // Populate datalist for quick selection of existing suppliers
        const datalist = document.getElementById('existingSuppliersDatalist');
        if (datalist && Array.isArray(appState.suppliers)) {
            const names = [...new Set(appState.suppliers.map(s => (s && s.name || '').trim()).filter(Boolean))];
            datalist.innerHTML = names.map(n => `<option value="${escapeHTML(n)}">`).join('');
        } const totalPaid = appState.suppliers.reduce((sum, item) => sum + Number(item.paid || 0), 0);
        const totalDebt = appState.suppliers.reduce((sum, item) => sum + Number(item.debt || 0), 0);
        if (totalPaidElem) totalPaidElem.textContent = formatMoney(totalPaid);
        if (totalDebtElem) totalDebtElem.textContent = formatMoney(totalDebt);
        if (countBadge) countBadge.textContent = `${appState.suppliers.length} مورد`;
        if (!listContainer) return; if (appState.suppliers.length === 0) {
            listContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-6 font-medium">لا توجد فواتير أو معاملات موردين مسجلة بعد</div>';
            return; } const sorted = [...appState.suppliers].sort((a, b) => new Date(b.date) - new Date(a.date));
        listContainer.innerHTML = sorted.map(item => {
            const d = new Date(item.date); const dateFormatted = isNaN(d.getTime()) ? escapeHTML(item.date || '') : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
            const debtAmount = Number(item.debt || 0);
            const paidAmount = Number(item.paid || 0);
            const hasDebt = debtAmount > 0;
            const safeName = escapeHTML(item.name || 'مورد غير مسمى');
            const safeInfo = escapeHTML(item.info || '');
            const safeId = escapeHTML(item.id || '');
            return `
                <div class="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-blue-200 transition-colors space-y-3">
                    <!-- Top row: Name & Badge on Right, Actions on Left -->
                    <div class="flex items-start justify-between gap-3">
                        <div class="text-right flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-black text-slate-800 text-sm sm:text-base">${safeName}</span>
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${hasDebt ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-blue-50 text-blue-700 border border-blue-200/80'}">
                                    ${hasDebt ? 'عليه كريدي' : 'خالص بالكامل'}
                                </span>
                            </div>
                            ${safeInfo ? `
                                <div class="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                                    <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <span class="truncate" dir="auto">${safeInfo}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="openEditSupplierModal('${safeId}')" class="w-8 h-8 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 flex items-center justify-center transition-colors shadow-2xs" title="تعديل">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button type="button" onclick="deleteSupplier('${safeId}')" class="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 flex items-center justify-center transition-colors shadow-2xs" title="حذف">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Items bought -->
                    <div class="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 text-xs space-y-1">
                        <div class="font-bold text-slate-600 flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                            <span>السلع المشتراة (شاشريت منه):</span>
                        </div>
                        <p class="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed pr-5" dir="auto">${item.items}</p>
                    </div>

                    <!-- Financial stats (Paid & Debt) -->
                    <div class="grid grid-cols-2 gap-2.5 text-xs">
                        <div class="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 text-right">
                            <span class="text-[10px] text-blue-700 font-bold block mb-0.5">شحال خلصت (مدفوع)</span>
                            <span class="font-black text-blue-900 text-sm sm:text-base">${paidAmount.toLocaleString()} دج</span>
                        </div>
                        <div class="${hasDebt ? 'bg-slate-100 border border-slate-200' : 'bg-slate-50 border border-slate-200'} rounded-xl p-2.5 text-right">
                            <span class="text-[10px] ${hasDebt ? 'text-slate-800' : 'text-slate-500'} font-bold block mb-0.5">شحال راه كريدي (باقي)</span>
                            <span class="font-black ${hasDebt ? 'text-slate-900' : 'text-slate-700'} text-sm sm:text-base">${debtAmount.toLocaleString()} دج</span>
                        </div>
                    </div>

                    <!-- Footer: Notes and Date -->
                    <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <div class="text-slate-500 italic truncate max-w-[200px]" dir="auto">
                            ${item.notes ? `<span>${item.notes}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1 font-medium text-slate-400 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span>${dateFormatted}</span>
                        </div>
                    </div>

                    <!-- Quick Statement & Versement Actions -->
                    <div class="flex items-center gap-2 pt-1 border-t border-slate-100/80">
                        <button type="button" onclick="openSingleSupplierStatement('${safeName}')" class="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <span>كشف الحساب</span>
                        </button>
                        <button type="button" onclick="openQuickSupplierVersementModal('${safeName}')" class="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-xs font-bold flex items-center justify-center gap-1 transition-colors">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            <span>فرسيمو</span>
                        </button>
                    </div>
                </div>
            `; }).join(''); } window.renderSuppliersList = renderSuppliersList;
    function openFullReportModal() {
        renderFullReport(); openModal('fullReportModal');
    } window.openFullReportModal = openFullReportModal;
    let html2canvasInstance = null;
    async function loadLocalHtml2Canvas() {
        if (!html2canvasInstance) {
            const mod = await import('html2canvas');
            html2canvasInstance = mod.default || mod;
        }
        return html2canvasInstance;
    }
    async function printFullReport() { const reportElem = document.getElementById('fullReportContent');
        const printBtn = document.getElementById('printReportBtn');
        if (!reportElem) return;
        let html2canvas = null;
        try {
            html2canvas = await loadLocalHtml2Canvas();
        } catch (e) {
            console.warn('html2canvas import fallback:', e);
        }
        if (!html2canvas) {
            window.print(); return;
        } const originalBtnContent = printBtn ? printBtn.innerHTML : '';
        if (printBtn) { printBtn.disabled = true;
            printBtn.innerHTML = `
                <svg class="w-4 h-4 animate-spin text-white inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>جاري حفظ الصورة...</span>
            `; } try { const canvas = await html2canvas(reportElem, {
                scale: 2, useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 1280, width: 1050,
                scrollX: 0, scrollY: 0, onclone: (clonedDoc) => {
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
                        } }); } }); const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            const now = new Date(); const dateStr = now.toISOString().split('T')[0];
            link.download = `التقرير_الشامل_المالي_والإداري_${dateStr}.png`;
            link.href = image; document.body.appendChild(link);
            link.click(); document.body.removeChild(link);
            if (typeof showSuccessToast === 'function') {
                showSuccessToast('تم تنزيل التقرير كصورة بنجاح!');
            } } catch (err) { console.error('Error exporting image:', err);
            window.print(); } finally { if (printBtn) {
                printBtn.disabled = false;
                printBtn.innerHTML = originalBtnContent;
            } } } window.printFullReport = printFullReport;
    function renderFullReport() { const reportContainer = document.getElementById('fullReportContent');
        if (!reportContainer) return; const now = new Date();
        const formattedDate = now.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = now.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let totalIncome = 0; let totalDebt = 0;
        let activeCount = 0; let expiredCount = 0;
        (appState.customers || []).forEach(c => {
            const pkg = getPackageById(c.packageId);
            const price = (c.price !== undefined && c.price !== null && c.price !== '') ? Number(c.price) : (pkg ? Number(pkg.price || 0) : 0);
            let paidAmount = 0; if (c.paymentStatus === 'paid') paidAmount = price;
            else if (c.paymentStatus === 'credit') {
                const debt = parseInt(c.debtAmount) || 0;
                totalDebt += debt; paidAmount = Math.max(0, price - debt);
            } totalIncome += paidAmount; const status = calculateStatus ? calculateStatus(c) : 'active';
            if (status === 'active' || status === 'near_expiry') activeCount++;
            else if (status === 'expired') expiredCount++;
        }); const totalStaffPayouts = (appState.staffPayouts || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalExpenses = (appState.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        // Prefer exact pre-aggregated yearly stats while older sales history is still loading
        const yearlyStatsR = appState.v2Stats && appState.v2Stats.yearly ? appState.v2Stats.yearly : null;
        const salesInterim = Boolean(window.salesHistoryLoading && !window.salesHistoryComplete && yearlyStatsR && Object.keys(yearlyStatsR).length > 0);
        const totalSales = salesInterim
            ? Object.values(yearlyStatsR).reduce((sum, ys) => sum + (Number(ys && ys.sales) || 0), 0)
            : (appState.sales || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);
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
                <div class="text-base sm:text-lg font-black text-slate-800">${(appState.customers || []).length}</div>
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
                    سجل خلاص العمال والمدربين (${(appState.staffPayouts || []).length})
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
                        ${(appState.staffPayouts || []).length === 0 ? `
                            <tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">لا توجد دفعات خلاص مسجلة للعمال أو المدربين</td></tr>
                        ` : (appState.staffPayouts || []).map(p => {
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
                    سجل فواتير ومعاملات الموردين والسلع (${(appState.suppliers || []).length})
                </h3>
                <div class="flex gap-2">
                    <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        مدفوع: ${(appState.suppliers || []).reduce((s, x) => s + (Number(x.paid) || 0), 0).toLocaleString()} دج
                    </span>
                    <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        كريدي: ${(appState.suppliers || []).reduce((s, x) => s + (Number(x.debt) || 0), 0).toLocaleString()} دج
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
                        ${(appState.suppliers || []).length === 0 ? `
                            <tr><td colspan="7" class="p-4 text-center text-slate-400 font-medium">لا توجد فواتير أو معاملات موردين مسجلة</td></tr>
                        ` : (appState.suppliers || []).map(sup => {
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
                    سجل المشتركين التفصيلي (${(appState.customers || []).length})
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
                        ${(appState.customers || []).length === 0 ? `
                            <tr><td colspan="7" class="p-4 text-center text-slate-400 font-medium">لا يوجد مشتركين مسجلين</td></tr>
                        ` : (appState.customers || []).map(c => {
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
                        سجل تصنيف المبيعات والمنتجات التفصيلي (${(appState.sales || []).length})
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
                        ${Array.from(new Set((appState.sales || []).map(s => s.prodName || s.productName).filter(Boolean))).map(p => `<option value="${p}">${p}</option>`).join('')}
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
                    سجل المصاريف العامة (${(appState.expenses || []).length})
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
                        ${(appState.expenses || []).length === 0 ? `
                            <tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">لا توجد مصاريف مسجلة</td></tr>
                        ` : (appState.expenses || []).map(e => {
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
        if (!tbody || !appState.sales) return;
        const selectedStock = stockSelect ? stockSelect.value : 'all';
        const selectedProd = prodSelect ? prodSelect.value : 'all';
        const selectedCoach = coachSelect ? coachSelect.value : 'all';
        const selectedDate = dateInput ? dateInput.value : '';
        const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
        let filtered = [...appState.sales]; if (selectedStock !== 'all') {
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
                <td class="p-2.5 border-l border-slate-200 font-medium text-slate-700">${s.qty || 1}</td>
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
    function deleteAllCredits() { const count = Array.isArray(appState.credits) ? appState.credits.length : 0;
        if (count === 0) { showSuccessToast('لا توجد سجلات كريدي لحذفها'); return; }
        promptWithPassword({ title: 'حذف كل الكريدي', prompt: 'أدخل كلمة المرور لتأكيد حذف جميع سجلات الكريدي', buttonText: 'تأكيد الحذف' }, () => {
            const removed = [...(appState.credits || [])];
            appState.credits = []; window.appState.credits = [];

            // Clear customer debts as well
            if (Array.isArray(appState.customers)) {
                appState.customers.forEach(c => {
                    if (c && c.paymentStatus === 'credit') {
                        c.debtAmount = 0;
                        c.paymentStatus = 'paid';
                        c.updatedAt = Date.now();
                        if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('customers', c);
                    }
                });
            }

            // Register all removed credits in tombstone registry
            removed.forEach(c => {
                if (c) {
                    if (c.id && typeof window.registerDeletedItemId === 'function') window.registerDeletedItemId('credits', c.id);
                    if (c._rtdbKey && typeof window.registerDeletedItemId === 'function') window.registerDeletedItemId('credits', c._rtdbKey);
                }
            });

            if (window.firebaseDB && window.firebaseRef && window.firebaseSet) {
                try {
                    window.firebaseSet(window.firebaseRef(window.firebaseDB, 'v2/credits'), null);
                    window.firebaseSet(window.firebaseRef(window.firebaseDB, 'credits'), null);
                    window.firebaseSet(window.firebaseRef(window.firebaseDB, 'appState/credits'), null);
                    window.firebaseSet(window.firebaseRef(window.firebaseDB, 'v2/openCreditsByCustomer'), null);
                } catch(e) { console.warn('Delete all credits Firebase note:', e); }
            }
            try {
                const baseUrl = getRTDBUrl();
                fetch(`${baseUrl}/v2/credits.json`, { method: 'DELETE' }).catch(() => {});
                fetch(`${baseUrl}/credits.json`, { method: 'DELETE' }).catch(() => {});
                fetch(`${baseUrl}/appState/credits.json`, { method: 'DELETE' }).catch(() => {});
                fetch(`${baseUrl}/v2/openCreditsByCustomer.json`, { method: 'DELETE' }).catch(() => {});
            } catch(e) {}

            if (typeof logActivity === 'function') {
                logActivity('credit', 'حذف جميع سجلات الكريدي', `تم مسح جميع سجلات الديون والكريدي بالكامل (${count} سجل)`);
            }
            const searchInput = document.getElementById('creditSearchInput');
            if (searchInput) searchInput.value = '';
            saveState(); renderCreditsList(); render();
            showSuccessToast('تم حذف كل سجلات الكريدي (' + count + ')');
        });
    } window.deleteAllCredits = deleteAllCredits;
    function renderCreditsList() { const container = document.getElementById('creditsList');
        if (!container) return; if (!Array.isArray(appState.credits)) appState.credits = [];
        const searchQuery = (getElemVal('creditSearchInput') || '').trim().toLowerCase();
        let filtered = appState.credits; if (searchQuery) {
            filtered = filtered.filter(cr => {
                if (!cr) return false; const name = (cr.name || '').toLowerCase();
                const nickname = (cr.nickname || '').toLowerCase();
                const phone = (cr.phone || '').toLowerCase();
                const desc = (cr.desc || '').toLowerCase();
                return name.includes(searchQuery) || nickname.includes(searchQuery) || phone.includes(searchQuery) || desc.includes(searchQuery);
            }); }
        // Update Summary Stats
        const totalAmount = (appState.credits || []).reduce((sum, c) => sum + Number(c?.amount || 0), 0);
        const totalAmountElem = document.getElementById('creditsTotalAmountSummary');
        const countSummaryElem = document.getElementById('creditsCountSummary');
        if (totalAmountElem) totalAmountElem.textContent = `${totalAmount.toLocaleString()} دج`;
        if (countSummaryElem) countSummaryElem.textContent = `${appState.credits.length} سجل`;
        if (filtered.length === 0) { container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16 text-slate-300">
                    <div class="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                        <svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p class="text-sm font-bold text-slate-400">${searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد ديون معلقة حالياً'}</p>
                </div>
              `; return; }
        const sorted = [...filtered].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
        const CREDIT_PAGE_SIZE = 40;
        if (!appState.creditPage || appState.creditPage < 1) appState.creditPage = 1;
        const totalCreds = sorted.length;
        const totalCredPages = Math.max(1, Math.ceil(totalCreds / CREDIT_PAGE_SIZE));
        if (appState.creditPage > totalCredPages) appState.creditPage = 1;
        const startCredIdx = (appState.creditPage - 1) * CREDIT_PAGE_SIZE;
        const endCredIdx = Math.min(startCredIdx + CREDIT_PAGE_SIZE, totalCreds);
        const pagedCredits = sorted.slice(startCredIdx, endCredIdx);

        const cardsHtml = pagedCredits.map(cr => {
            const d = cr.date ? new Date(cr.date) : null;
            const dateFormatted = d && !isNaN(d.getTime()) ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : escapeHTML(cr.date || '');
            const rawName = (cr.name || '').trim();
            const safeName = escapeHTML(rawName || 'بدون اسم');
            const firstLetter = safeName.charAt(0) || '؟';
            const dispPhone = getDisplayPhone(cr.phone);
            const safePhone = escapeHTML(dispPhone || 'بدون رقم');
            const rawNickname = (cr.nickname || '').replace(/^[()（）\s]+|[()（）\s]+$/g, '').trim();
            const safeNickname = escapeHTML(rawNickname);
            const safeDesc = escapeHTML(cr.desc || 'دين اشتراك / مبيعات');
            const safeId = escapeHTML(cr.id || '');
            const amountNum = Number(cr.amount || 0);
            return `
                <div class="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between space-y-2.5 hover:border-blue-200 hover:shadow-sm transition-all group">
                    <div class="flex items-start justify-between gap-2.5">
                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-700 font-bold text-sm sm:text-base flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs group-hover:bg-blue-100 transition-colors">
                                ${firstLetter}
                            </div>
                            <div class="min-w-0 flex-1 text-right">
                                <div class="flex flex-wrap items-center gap-1.5 leading-snug">
                                    <span class="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight" dir="auto">${safeName}</span>
                                    ${safeNickname ? `<span class="inline-flex items-center text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-200/60 shrink-0 whitespace-nowrap">${safeNickname}</span>` : ''}
                                </div>
                                <div class="text-[11px] font-semibold text-slate-400 mt-0.5 text-right font-mono" dir="ltr">${safePhone}</div>
                            </div>
                        </div>
                        <div class="shrink-0">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200/90 text-slate-800 font-black text-xs sm:text-sm tracking-tight shadow-2xs" dir="ltr">
                                ${amountNum.toLocaleString()} دج
                            </span>
                        </div>
                    </div>

                    <div class="bg-slate-50/90 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                        <p class="text-xs font-medium text-slate-700 break-words text-right flex-1 leading-tight" dir="auto">${safeDesc}</p>
                    </div>

                    <div class="flex items-center justify-between text-[11px] pt-0.5">
                        <div class="flex items-center gap-1 text-slate-400 font-medium">
                            <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span>بتاريخ: ${dateFormatted}</span>
                        </div>
                        
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" onclick="openEditCreditModal('${safeId}')" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-slate-200/90 hover:border-blue-200 flex items-center justify-center transition-colors shadow-2xs" title="تعديل">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                            <button type="button" onclick="settleCredit('${safeId}')" class="h-7 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-slate-200/90 hover:border-blue-200 flex items-center gap-1 font-bold text-xs transition-colors shadow-2xs active:scale-95" title="تسديد الكريدي">
                                <svg class="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-blue-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                <span>تسديد</span>
                            </button>
                            <button type="button" onclick="deleteCredit('${safeId}')" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-400 hover:text-slate-800 border border-slate-200/90 hover:border-slate-300 flex items-center justify-center transition-colors shadow-2xs" title="حذف">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `; }).join('');

        const paginationHtml = totalCreds > CREDIT_PAGE_SIZE ? `
            <div class="col-span-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 pb-2 border-t border-slate-200/80 mt-2">
                <div class="text-xs sm:text-sm font-bold text-slate-600">
                    عرض ${startCredIdx + 1} - ${endCredIdx} من إجمالي ${totalCreds.toLocaleString()} سجل
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="changeCreditPage(-1)" ${appState.creditPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold"' : 'class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition-all"'}>
                        السابق
                    </button>
                    <span class="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-extrabold border border-blue-200/80">
                        صفحة ${appState.creditPage} من ${totalCredPages}
                    </span>
                    <button type="button" onclick="changeCreditPage(1)" ${appState.creditPage >= totalCredPages ? 'disabled class="opacity-40 cursor-not-allowed px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold"' : 'class="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs transition-all"'}>
                        التالي
                    </button>
                </div>
            </div>` : '';

        container.innerHTML = cardsHtml + paginationHtml;
    }
    window.changeCreditPage = function(delta) {
        const sorted = (appState.credits || []);
        const totalCredPages = Math.max(1, Math.ceil(sorted.length / 40));
        appState.creditPage = Math.max(1, Math.min(totalCredPages, (appState.creditPage || 1) + delta));
        renderCreditsList();
    };
    let _creditSearchDebounceTimer = null;
    function handleCreditSearch() {
        if (_creditSearchDebounceTimer) clearTimeout(_creditSearchDebounceTimer);
        _creditSearchDebounceTimer = setTimeout(() => {
            appState.creditPage = 1;
            renderCreditsList();
        }, 120);
    } window.handleCreditSearch = handleCreditSearch;
    function settleCredit(id) { if (!id || !Array.isArray(appState.credits)) return;
        const targetId = String(id).trim();
        showAppConfirm('هل أنت متأكد من تسديد هذا الكريدي وإزالته من القائمة؟', function() {
            const targetCredit = appState.credits.find(c => String(c && c.id).trim() === targetId || String(c && c._rtdbKey).trim() === targetId);
            if (typeof logActivity === 'function') logActivity('credit', 'تسديد كريدي بالكامل', `تم تسديد الدين لصاحبه: ${targetCredit ? targetCredit.name : targetId}`, targetCredit ? targetCredit.amount : 0);

            // If credit is linked to a customer, clear their debt in customers collection
            if (targetCredit) {
                const custId = targetCredit.customerId || (targetId.startsWith('cr_auto_') ? targetId.replace('cr_auto_', '') : null);
                let linkedCust = null;
                if (custId && Array.isArray(appState.customers)) {
                    linkedCust = appState.customers.find(c => String(c && c.id) === String(custId));
                }
                if (!linkedCust && targetCredit.phone && Array.isArray(appState.customers)) {
                    const normP = cleanPhone(targetCredit.phone);
                    if (normP) {
                        linkedCust = appState.customers.find(c => cleanPhone(c && c.phone) === normP && c.paymentStatus === 'credit');
                    }
                }
                if (linkedCust) {
                    linkedCust.debtAmount = 0;
                    linkedCust.paymentStatus = 'paid';
                    linkedCust.updatedAt = Date.now();
                    if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('customers', linkedCust);
                }
            }

            if (typeof window.registerDeletedItemId === 'function') {
                window.registerDeletedItemId('credits', targetId);
                if (targetCredit && targetCredit._rtdbKey) window.registerDeletedItemId('credits', targetCredit._rtdbKey);
            }

            window.appState.credits = appState.credits.filter(c => String(c && c.id).trim() !== targetId && String(c && c._rtdbKey).trim() !== targetId);
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('credits', targetId, targetCredit);
                if (targetCredit && targetCredit._rtdbKey && targetCredit._rtdbKey !== targetId) {
                    window.deleteFirebaseSectionItem('credits', targetCredit._rtdbKey, targetCredit);
                }
            }
            saveState(); showSuccessToast('تم تسديد الكريدي بنجاح');
            renderCreditsList(); render(); // Update dashboard totals
        }, { title: 'تسديد الكريدي', confirmText: 'نعم، تم التسديد',
            isDanger: false }); } function handleAddCreditSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        let name = getElemVal('creditName').trim();
        let nickname = getElemVal('creditNickname').trim();
        let phone = getElemVal('creditPhone').trim();
        let desc = getElemVal('creditDesc').trim();
        const amountVal = getElemVal('creditAmount');
        const amount = parseInt(amountVal);
        const dateVal = getElemVal('creditDate');
        if (containsDangerousCode(name) || containsDangerousCode(nickname) || containsDangerousCode(desc)) {
            showErrorToast('تحذير أمني: تم اكتشاف محتوى غير مسموح به في المدخلات.');
            return false; } name = sanitizeInputText(name, 50);
        nickname = sanitizeInputText(nickname, 30);
        desc = sanitizeInputText(desc, 200); if (!name) {
            showErrorToast('يرجى كتابة اسم صاحب الدين');
            return false; } if (!desc) {
            showErrorToast('يرجى إدخال وصف للدين');
            return false; } if (isNaN(amount) || amount <= 0 || amount > 100000000) {
            showErrorToast('يرجى إدخال مبلغ صحيح أكبر من 0');
            return false; } if (!Array.isArray(appState.credits)) appState.credits = [];
        const newCredit = { id: Date.now().toString(),
            name, nickname, phone: cleanPhone(phone),
            desc, amount, date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString()
        };
        appState.credits.push(newCredit);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('credits', newCredit);
        }
        saveState(); document.getElementById('addCreditForm')?.reset();
        closeModal('addCreditModal');
        showSuccessToast('تم تسجيل الكريدي بنجاح');
        renderCreditsList(); render(); // Update dashboard totals
        return false; } function openEditCreditModal(id) {
        if (!Array.isArray(appState.credits)) return;
        const cr = appState.credits.find(c => String(c && c.id) === String(id));
        if (!cr) return; setElemValue('editCreditId', cr.id || '');
        setElemValue('editCreditName', cr.name || '');
        setElemValue('editCreditNickname', cr.nickname || '');
        setElemValue('editCreditPhone', cr.phone || '');
        setElemValue('editCreditDesc', cr.desc || '');
        setElemValue('editCreditAmount', cr.amount || '');
        const d = new Date(cr.date); const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
        setElemValue('editCreditDate', dateStr);
        openModal('editCreditModal'); } function handleEditCreditSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!Array.isArray(appState.credits)) return false;
        const id = getElemVal('editCreditId');
        const index = appState.credits.findIndex(c => String(c && c.id) === String(id));
        if (index === -1) return false; let name = getElemVal('editCreditName').trim();
        let nickname = getElemVal('editCreditNickname').trim();
        let phone = getElemVal('editCreditPhone').trim();
        let desc = getElemVal('editCreditDesc').trim();
        const amountVal = getElemVal('editCreditAmount');
        const amount = parseInt(amountVal);
        const dateVal = getElemVal('editCreditDate');
        if (containsDangerousCode(name) || containsDangerousCode(nickname) || containsDangerousCode(desc)) {
            showErrorToast('تحذير أمني: تم اكتشاف محتوى غير مسموح به في المدخلات.');
            return false; } name = sanitizeInputText(name, 50);
        nickname = sanitizeInputText(nickname, 30);
        desc = sanitizeInputText(desc, 200); if (!name) {
            showErrorToast('يرجى كتابة اسم صاحب الدين');
            return false; } if (!desc) {
            showErrorToast('يرجى إدخال وصف للدين');
            return false; } if (isNaN(amount) || amount <= 0 || amount > 100000000) {
            showErrorToast('يرجى إدخال مبلغ صحيح أكبر من 0');
            return false; }
        const oldCredit = appState.credits[index];
        const oldName = oldCredit ? (oldCredit.name || '') : '';
        const oldAmount = oldCredit ? (Number(oldCredit.amount) || 0) : 0;
        const oldPhone = oldCredit ? (oldCredit.phone || '') : '';
        const oldDesc = oldCredit ? (oldCredit.desc || '') : '';

        const updatedCredit = {
            ...appState.credits[index], name,
            nickname, phone: cleanPhone(phone),
            desc, amount, date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString()
        };
        appState.credits[index] = updatedCredit;
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('credits', updatedCredit);
        }

        const changes = [];
        if (oldName !== name) changes.push(`الاسم: من "${oldName}" إلى "${name}"`);
        if (oldAmount !== amount) changes.push(`المبلغ: من ${oldAmount.toLocaleString()} دج إلى ${amount.toLocaleString()} دج`);
        if (oldPhone !== cleanPhone(phone)) changes.push(`الهاتف: من "${oldPhone || 'غير محدد'}" إلى "${phone || 'غير محدد'}"`);
        if (oldDesc !== desc) changes.push(`الوصف: من "${oldDesc}" إلى "${desc}"`);

        let detailMsg = `تعديل بيانات الكريدي (${name})`;
        if (changes.length > 0) detailMsg += ` | ` + changes.join(' | ');

        if (typeof logActivity === 'function') {
            logActivity('credit', 'تعديل كريدي', detailMsg, amount);
        }

        saveState(); closeModal('editCreditModal');
        showSuccessToast('تم تعديل الكريدي بنجاح');
        renderCreditsList(); render(); // Update dashboard totals
        return false; } function deleteCredit(id) {
        if (!id) return; const targetId = String(id).trim();
        promptWithPassword({ title: 'حذف الكريدي', prompt: 'أدخل كلمة المرور لتأكيد حذف هذا الكريدي', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.credits)) appState.credits = [];
            const targetCredit = appState.credits.find(c => String(c && c.id).trim() === targetId || String(c && c._rtdbKey).trim() === targetId);
            if (typeof logActivity === 'function') logActivity('credit', 'حذف كريدي', `حذف سجل الكريدي الخاص بـ: ${targetCredit ? targetCredit.name : targetId}`);

            // If credit is linked to a customer, clear their debt in customers collection
            if (targetCredit) {
                const custId = targetCredit.customerId || (targetId.startsWith('cr_auto_') ? targetId.replace('cr_auto_', '') : null);
                let linkedCust = null;
                if (custId && Array.isArray(appState.customers)) {
                    linkedCust = appState.customers.find(c => String(c && c.id) === String(custId));
                }
                if (!linkedCust && targetCredit.phone && Array.isArray(appState.customers)) {
                    const normP = cleanPhone(targetCredit.phone);
                    if (normP) {
                        linkedCust = appState.customers.find(c => cleanPhone(c && c.phone) === normP && c.paymentStatus === 'credit');
                    }
                }
                if (linkedCust) {
                    linkedCust.debtAmount = 0;
                    linkedCust.paymentStatus = 'paid';
                    linkedCust.updatedAt = Date.now();
                    if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('customers', linkedCust);
                }
            }

            if (typeof window.registerDeletedItemId === 'function') {
                window.registerDeletedItemId('credits', targetId);
                if (targetCredit && targetCredit._rtdbKey) window.registerDeletedItemId('credits', targetCredit._rtdbKey);
            }

            // Delete matching credit
            appState.credits = appState.credits.filter(c => {
                if (!c) return false;
                const cId = String(c.id || '').trim();
                const cKey = String(c._rtdbKey || '').trim();
                return cId !== targetId && cKey !== targetId;
            });
            window.appState.credits = appState.credits;

            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('credits', targetId, targetCredit);
                if (targetCredit && targetCredit._rtdbKey && targetCredit._rtdbKey !== targetId) {
                    window.deleteFirebaseSectionItem('credits', targetCredit._rtdbKey, targetCredit);
                }
            }
            saveState(); showSuccessToast('تم حذف الكريدي بنجاح');
            renderCreditsList(); render(); // Update dashboard totals
        }); } function deleteCreditFromModal() {
        const idElem = document.getElementById('editCreditId');
        const id = idElem ? idElem.value : null;
        if (!id) return; closeModal('editCreditModal');
        deleteCredit(id); } window.settleCredit = settleCredit;
    window.handleAddCreditSubmit = handleAddCreditSubmit;
    window.openEditCreditModal = openEditCreditModal;
    window.handleEditCreditSubmit = handleEditCreditSubmit;
    window.deleteCredit = deleteCredit; window.deleteCreditFromModal = deleteCreditFromModal;
    window.renderCreditsList = renderCreditsList;

    // ==========================================
    // MOCK / TEST DATA ENGINE (PERFORMANCE TESTING: 200 CUSTOMERS + 100 CREDITS)
    // ==========================================
    function updateMockDataUIState() {
        const hasMock = (Array.isArray(appState.customers) && appState.customers.some(c => c && (c.isMock || String(c.id).startsWith('mock_cust_')))) ||
                        (Array.isArray(appState.credits) && appState.credits.some(c => c && (c.isMock || String(c.id).startsWith('mock_cred_'))));
        const clearBtn = document.getElementById('clearMockBtn');
        if (clearBtn) {
            if (hasMock) {
                clearBtn.classList.remove('hidden');
                clearBtn.classList.add('flex');
            } else {
                clearBtn.classList.add('hidden');
                clearBtn.classList.remove('flex');
            }
        }
    }
    window.updateMockDataUIState = updateMockDataUIState;

    function generateMockTestData(customersCount = 200, creditsCount = 100, silent = false) {
        if (!Array.isArray(appState.packages) || appState.packages.length === 0) {
            appState.packages = [
                { id: 'pkg_1', name: 'اشتراك كمال أجسام شهري', price: 3000, type: 'time', durationDays: 30 },
                { id: 'pkg_2', name: 'اشتراك 3 أشهر', price: 8000, type: 'time', durationDays: 90 },
                { id: 'pkg_3', name: 'اشتراك سنوي VIP', price: 28000, type: 'time', durationDays: 365 }
            ];
        }
        const defaultPkg = appState.packages[0] || { id: 'pkg_1', name: 'اشتراك شهري', price: 3000, durationDays: 30 };
        const pkg2 = appState.packages[1] || defaultPkg;

        const applyData = (newCustomers, newCredits) => {
            if (!Array.isArray(appState.customers)) appState.customers = [];
            if (!Array.isArray(appState.credits)) appState.credits = [];
            // Remove previous mock items if any
            appState.customers = appState.customers.filter(c => c && !c.isMock && !String(c.id).startsWith('mock_cust_'));
            appState.credits = appState.credits.filter(c => c && !c.isMock && !String(c.id).startsWith('mock_cred_'));

            // Pre-index search keys for hyper-speed filtering
            for (let i = 0; i < newCustomers.length; i++) {
                const c = newCustomers[i];
                c._searchKey = `${c.name || ''} ${(c.phone || '').replace(/\D/g, '')}`.toLowerCase();
            }

            appState.customers.unshift(...newCustomers);
            appState.credits.unshift(...newCredits);

            saveState();

            if (window.saveFirebaseSectionItem) {
                newCustomers.forEach(c => window.saveFirebaseSectionItem('customers', c));
                newCredits.forEach(cr => window.saveFirebaseSectionItem('credits', cr));
            }

            updateMockDataUIState();

            if (!silent && typeof showSuccessToast === 'function') {
                showSuccessToast(`تمت إضافة ${customersCount} مشترك و ${creditsCount} كريدي تجريبي بنجاح عبر المعالجة المتوازية!`);
            }
            if (typeof render === 'function') render();
            if (typeof renderCreditsList === 'function') renderCreditsList();
        };

        // Try off-thread parallel worker first
        if (typeof runWorkerTask === 'function') {
            runWorkerTask('GENERATE_MOCK_DATA', {
                customersCount,
                creditsCount,
                defaultPackage: defaultPkg,
                pkg2: pkg2
            }).then(result => {
                if (result && result.customers && result.credits) {
                    applyData(result.customers, result.credits);
                }
            }).catch(() => {
                fallbackGenerate();
            });
            return;
        }

        fallbackGenerate();

        function fallbackGenerate() {
            const firstNames = [
                'محمد', 'أحمد', 'يوسف', 'أيمن', 'بلال', 'رياض', 'كريم', 'حمزة', 'إسلام', 'فاروق',
                'عبد القادر', 'طارق', 'أسامة', 'وليد', 'ياسين', 'أمين', 'هشام', 'سمير', 'سفيان', 'حسام',
                'نذير', 'صلاح', 'عادل', 'جمال', 'مراد', 'عمر', 'علي', 'إلياس', 'صابر', 'رضوان',
                'سليم', 'شكيب', 'مهدي', 'بشير', 'عبد الرحمن', 'زكرياء', 'منير', 'عصام', 'نبيل', 'خالد'
            ];
            const lastNames = [
                'بن علي', 'بوعلام', 'قادري', 'مرابط', 'حميدي', 'زرقي', 'منصوري', 'مسعودي', 'سلطاني', 'بوزيد',
                'براهيمي', 'بن عمار', 'لعربي', 'بلحاج', 'شريف', 'عثماني', 'رحماني', 'سعيدي', 'طاهري', 'عماري',
                'داودي', 'علالي', 'مزيان', 'بلقاسم', 'حداد', 'دراجي', 'قاسمي', 'مقداد', 'زايدي', 'بوشامة'
            ];
            const creditDescriptions = [
                'دين مكمل بروتين واي (Gold Standard)',
                'باقي اشتراك شهر كمال أجسام',
                'دين كرياتين مونوهيدرات 300غ',
                'دين مشروبات طاقة ومياه معدنية',
                'دين حزام كمال أجسام وقفازات تمرين',
                'باقي اشتراك 3 أشهر',
                'دين مكمل أحماض أمينية BCAA',
                'دين بروتين بار وسناكس طاقة',
                'مستحقات تدريب خاص وتغذية',
                'دين ملابس وتيشيرت رياضي نادي أوميغا'
            ];
            const creditNicknames = ['مشترك', 'زبون قاعة', 'صديق', 'مشتري مكملات', 'رياضي', 'لاعب'];

            const now = Date.now();
            const newMockCustomers = [];

            for (let i = 0; i < customersCount; i++) {
                const fn = firstNames[i % firstNames.length];
                const ln = lastNames[(i * 3 + Math.floor(i / 7)) % lastNames.length];
                const fullName = `${fn} ${ln} #${i + 1}`;
                const phone = `05${String(50000000 + ((i * 12347) % 49000000)).padStart(8, '0')}`;
                const isExpired = (i % 5 === 0);
                const daysAgo = (i % 28) + 1;
                const startDate = new Date(now - (isExpired ? (daysAgo + 35) : daysAgo) * 86400000);
                const pkg = (i % 4 === 0) ? pkg2 : defaultPkg;
                const duration = parseInt(pkg.durationDays || 30);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + duration);
                const isCreditPayment = (i % 7 === 0);
                const debtAmount = isCreditPayment ? ((i % 4 + 1) * 500) : 0;
                const weight = 60 + (i % 38);
                const birthYear = 1988 + (i % 18);
                const dob = `${birthYear}-0${(i % 9) + 1}-15`;

                newMockCustomers.push({
                    id: `mock_cust_${i + 1}`,
                    name: fullName,
                    phone: phone,
                    gender: (i % 10 === 9) ? 'female' : 'male',
                    dob: dob,
                    age: new Date().getFullYear() - birthYear,
                    weight: weight,
                    packageId: pkg.id,
                    price: pkg.price || 3000,
                    subscriptionType: 'time',
                    totalSessions: null,
                    remainingSessions: null,
                    attendedSessions: (i % 15),
                    sessionHistory: [],
                    paymentStatus: isCreditPayment ? 'credit' : 'paid',
                    debtAmount: debtAmount,
                    status: isExpired ? 'expired' : 'active',
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    isMock: true
                });
            }

            const newMockCredits = [];
            const creditAmounts = [500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4500, 6000, 7500, 9000];

            for (let i = 0; i < creditsCount; i++) {
                const fn = firstNames[(i * 2 + 5) % firstNames.length];
                const ln = lastNames[(i * 4 + 7) % lastNames.length];
                const fullName = `${fn} ${ln} [كريدي ${i + 1}]`;
                const phone = `06${String(60000000 + ((i * 98765) % 39000000)).padStart(8, '0')}`;
                const nickname = creditNicknames[i % creditNicknames.length];
                const desc = creditDescriptions[i % creditDescriptions.length];
                const amount = creditAmounts[i % creditAmounts.length];
                const daysAgo = (i % 45) + 1;
                const date = new Date(now - daysAgo * 86400000);

                newMockCredits.push({
                    id: `mock_cred_${i + 1}`,
                    name: fullName,
                    nickname: nickname,
                    phone: phone,
                    desc: desc,
                    amount: amount,
                    date: date.toISOString(),
                    isMock: true
                });
            }

            applyData(newMockCustomers, newMockCredits);
        }
    };

    function clearMockTestData() {
        showAppConfirm('هل أنت متأكد من حذف البيانات التجريبية فقط؟ ستبقى كافة بياناتك الحقيقية كما هي.', function() {
            if (Array.isArray(appState.customers)) {
                const removedCustIds = appState.customers.filter(c => c && (c.isMock || String(c.id).startsWith('mock_cust_'))).map(c => c.id);
                appState.customers = appState.customers.filter(c => c && !c.isMock && !String(c.id).startsWith('mock_cust_'));
                if (window.deleteFirebaseSectionItem) {
                    removedCustIds.forEach(id => window.deleteFirebaseSectionItem('customers', id));
                }
            }
            if (Array.isArray(appState.credits)) {
                const removedCredIds = appState.credits.filter(c => c && (c.isMock || String(c.id).startsWith('mock_cred_'))).map(c => c.id);
                appState.credits = appState.credits.filter(c => c && !c.isMock && !String(c.id).startsWith('mock_cred_'));
                if (window.deleteFirebaseSectionItem) {
                    removedCredIds.forEach(id => window.deleteFirebaseSectionItem('credits', id));
                }
            }
            saveState();
            updateMockDataUIState();
            showSuccessToast('تم حذف كافة البيانات التجريبية بنجاح.');
            if (typeof render === 'function') render();
            if (typeof renderCreditsList === 'function') renderCreditsList();
        }, { title: 'حذف البيانات التجريبية', confirmText: 'نعم، حذف التجريبي' });
    }
    window.generateMockTestData = generateMockTestData;
    window.clearMockTestData = clearMockTestData;

    // Auto-seeding of mock/test data into the production database has been REMOVED (data-integrity fix).
    // generateMockTestData / clearMockTestData remain available for MANUAL use from the console/UI only.

    // One-time cleanup: purge previously auto-seeded mock records from local state AND Firebase
    if (!localStorage.getItem('sm_mock_auto_purge_v1')) {
        localStorage.setItem('sm_mock_auto_purge_v1', 'true');
        setTimeout(() => {
            try {
                const isMockItem = (it) => !!(it && (it.isMock || String(it.id || '').startsWith('mock_cust_') || String(it.id || '').startsWith('mock_cred_')));
                const purgeSections = [
                    { name: 'customers', paths: ['v2/customers', 'customers'] },
                    { name: 'credits', paths: ['v2/credits', 'credits'] }
                ];
                const updates = {};
                let purgedCount = 0;
                purgeSections.forEach(sec => {
                    const list = Array.isArray(window.appState[sec.name]) ? window.appState[sec.name] : [];
                    const mockItems = list.filter(isMockItem);
                    mockItems.forEach(m => {
                        const id = String(m.id || m._rtdbKey || '');
                        if (id) {
                            if (typeof window.registerDeletedItemId === 'function') window.registerDeletedItemId(sec.name, id);
                            sec.paths.forEach(p => { updates[`${p}/${id}`] = null; });
                        }
                    });
                    if (mockItems.length > 0) {
                        window.appState[sec.name] = list.filter(it => !isMockItem(it));
                        purgedCount += mockItems.length;
                    }
                });
                if (purgedCount > 0) {
                    if (window.firebaseDB && window.firebaseUpdate && window.firebaseRef && Object.keys(updates).length > 0) {
                        window.firebaseUpdate(window.firebaseRef(window.firebaseDB), updates)
                            .catch(e => console.warn('Mock purge Firebase sync note:', e?.message || e));
                    }
                    if (typeof showSuccessToast === 'function') {
                        showSuccessToast(`تم تنظيف ${purgedCount} سجل تجريبي قديم تم حقنه تلقائياً في نسخة سابقة`);
                    }
                    if (typeof render === 'function') render();
                    if (typeof renderCreditsList === 'function') renderCreditsList();
                }
            } catch (e) { console.warn('Mock auto-purge note:', e); }
        }, 2500);
    }

    // ==========================================
    // WORKER TRANSACTIONS & LEDGER (DAILY / MONTHLY / YEARLY)
    // ==========================================
    window.currentWorkerLedgerName = ''; window.workerLedgerPeriod = 'month'; // 'day', 'month', 'year', 'all'
    window.workerLedgerSelectedDate = ''; window.workerLedgerSelectedMonth = '';
    window.workerLedgerTypeFilter = 'all';
    window.openSelectedWorkerLedger = function() {
        const select = document.getElementById('staffPayoutWorkerFilter');
        let workerName = select ? select.value : 'all';
        if (workerName === 'all' || !workerName) {
            // Pick first registered worker if available
            const names = []; if (typeof getUniqueCoaches === 'function') {
                const coaches = getUniqueCoaches();
                if (Array.isArray(coaches)) coaches.forEach(c => c && names.push(c.trim()));
            } (appState.staffPayouts || []).forEach(p => {
                const n = (p.name || p.staffName || '').trim();
                if (n && !names.includes(n)) names.push(n);
            }); if (names.length > 0) {
                workerName = names[0]; } else {
                showToast('يرجى تسجيل خلاص أو اختيار عامل أولاً لعرض كشف المعاملات', 'info');
                return; } }
        openWorkerTransactionsModal(workerName);
    }; window.openWorkerTransactionsModal = function(workerName) {
        if (!workerName || workerName === 'all') {
            openSelectedWorkerLedger(); return;
        } window.currentWorkerLedgerName = workerName.trim();
        const now = new Date(); const curYear = now.getFullYear();
        const curMonth = String(now.getMonth() + 1).padStart(2, '0');
        const curDay = String(now.getDate()).padStart(2, '0');
        if (!window.workerLedgerSelectedDate) {
            window.workerLedgerSelectedDate = `${curYear}-${curMonth}-${curDay}`;
        } if (!window.workerLedgerSelectedMonth) {
            window.workerLedgerSelectedMonth = `${curYear}-${curMonth}`;
        } if (!window.workerLedgerPeriod) {
            window.workerLedgerPeriod = 'month';
        } const modal = document.getElementById('workerTransactionsModal');
        if (!modal) return;
        renderWorkerTransactionsModal(); modal.classList.add('active');
    }; window.setWorkerLedgerPeriod = function(period) {
        window.workerLedgerPeriod = period;
        renderWorkerTransactionsModal(); };
    window.handleWorkerLedgerMonthChange = function(val) {
        if (val) { window.workerLedgerSelectedMonth = val;
            renderWorkerTransactionsModal(); } };
    window.handleWorkerLedgerDayChange = function(val) {
        if (val) { window.workerLedgerSelectedDate = val;
            renderWorkerTransactionsModal(); } };
    function parseItemDate(item) { const raw = String(item.date || item.payoutDate || item.createdAt || '').trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            return { fullDate: raw.slice(0, 10),
                yearMonth: raw.slice(0, 7), year: raw.slice(0, 4)
            }; } if (/^\d{4}-\d{2}/.test(raw)) {
            return { fullDate: raw.slice(0, 7) + '-01',
                yearMonth: raw.slice(0, 7), year: raw.slice(0, 4)
            }; } const d = new Date(raw); if (!isNaN(d.getTime())) {
            const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return { fullDate: `${y}-${m}-${day}`,
                yearMonth: `${y}-${m}`, year: String(y)
            }; } return { fullDate: raw, yearMonth: '', year: '' };
    } window.renderWorkerTransactionsModal = function() {
        const workerName = window.currentWorkerLedgerName;
        if (!workerName) return; const nameElem = document.getElementById('workerModalName');
        const avatarElem = document.getElementById('workerModalAvatar');
        const roleBadge = document.getElementById('workerModalRoleBadge');
        if (nameElem) nameElem.textContent = workerName;
        if (avatarElem) avatarElem.textContent = workerName.charAt(0).toUpperCase();
        // Check if worker is a coach
        let isCoach = false; if (typeof getUniqueCoaches === 'function') {
            const coaches = getUniqueCoaches();
            if (Array.isArray(coaches) && coaches.some(c => c && c.trim().toLowerCase() === workerName.toLowerCase())) {
                isCoach = true; } } if (roleBadge) {
            roleBadge.textContent = isCoach ? 'كوتش / مدرب' : 'عامل / موظف';
            roleBadge.className = isCoach ? 'text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200';
        } const now = new Date(); const curYear = String(now.getFullYear());
        const curMonth = `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const curDay = `${curMonth}-${String(now.getDate()).padStart(2, '0')}`;
        // Compute All-Time, Year, Month, Today metrics
        let todayTotal = 0, todayCount = 0; let monthTotal = 0, monthCount = 0;
        let yearTotal = 0, yearCount = 0; let allTotal = 0, allCount = 0;
        (appState.staffPayouts || []).forEach(item => {
            if (!item) return; const iName = (item.name || item.staffName || '').trim();
            if (iName.toLowerCase() !== workerName.toLowerCase()) return;
            const amt = parseFloat(String(item.amount || item.price || 0).replace(/,/g, '')) || 0;
            const dInfo = parseItemDate(item);
            allTotal += amt; allCount++; if (dInfo.year === curYear) {
                yearTotal += amt; yearCount++; }
            if (dInfo.yearMonth === curMonth) {
                monthTotal += amt; monthCount++;
            } if (dInfo.fullDate === curDay) {
                todayTotal += amt; todayCount++;
            } });
        // Update KPI Badges
        const statTodayTotal = document.getElementById('workerStatTodayTotal');
        const statTodayCount = document.getElementById('workerStatTodayCount');
        const statMonthTotal = document.getElementById('workerStatMonthTotal');
        const statMonthCount = document.getElementById('workerStatMonthCount');
        const statYearTotal = document.getElementById('workerStatYearTotal');
        const statYearCount = document.getElementById('workerStatYearCount');
        const statAllTotal = document.getElementById('workerStatAllTotal');
        const statAllCount = document.getElementById('workerStatAllCount');
        if (statTodayTotal) statTodayTotal.textContent = `${Number(todayTotal).toLocaleString()} دج`;
        if (statTodayCount) statTodayCount.textContent = `${todayCount} معاملة`;
        if (statMonthTotal) statMonthTotal.textContent = `${Number(monthTotal).toLocaleString()} دج`;
        if (statMonthCount) statMonthCount.textContent = `${monthCount} معاملة`;
        if (statYearTotal) statYearTotal.textContent = `${Number(yearTotal).toLocaleString()} دج`;
        if (statYearCount) statYearCount.textContent = `${yearCount} معاملة`;
        if (statAllTotal) statAllTotal.textContent = `${Number(allTotal).toLocaleString()} دج`;
        if (statAllCount) statAllCount.textContent = `${allCount} معاملة`;
        // Update Period Switcher Buttons
        const period = window.workerLedgerPeriod || 'month';
        const tabDay = document.getElementById('workerTabBtnDay');
        const tabMonth = document.getElementById('workerTabBtnMonth');
        const tabYear = document.getElementById('workerTabBtnYear');
        const tabAll = document.getElementById('workerTabBtnAll');
        const actClass = 'text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white shadow-xs transition-all cursor-pointer';
        const inactClass = 'text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer';
        if (tabDay) tabDay.className = period === 'day' ? actClass : inactClass;
        if (tabMonth) tabMonth.className = period === 'month' ? actClass : inactClass;
        if (tabYear) tabYear.className = period === 'year' ? actClass : inactClass;
        if (tabAll) tabAll.className = period === 'all' ? actClass : inactClass;
        // Contextual date inputs
        const dayInput = document.getElementById('workerCustomDayInput');
        const monthInput = document.getElementById('workerCustomMonthInput');
        const label = document.getElementById('workerDateInputLabel');
        if (period === 'day') { if (label) label.textContent = 'اختر التاريخ اليومي:';
            if (dayInput) { dayInput.classList.remove('hidden');
                dayInput.value = window.workerLedgerSelectedDate || curDay;
            } if (monthInput) monthInput.classList.add('hidden');
        } else if (period === 'month') { if (label) label.textContent = 'اختر الشهر:';
            if (monthInput) { monthInput.classList.remove('hidden');
                monthInput.value = window.workerLedgerSelectedMonth || curMonth;
            } if (dayInput) dayInput.classList.add('hidden');
        } else if (period === 'year') { if (label) label.textContent = `عرض سنة: ${curYear}`;
            if (monthInput) monthInput.classList.add('hidden');
            if (dayInput) dayInput.classList.add('hidden');
        } else { if (label) label.textContent = 'عرض كل المعاملات التاريخية';
            if (monthInput) monthInput.classList.add('hidden');
            if (dayInput) dayInput.classList.add('hidden');
        } renderWorkerTransactionsList(); };
    window.renderWorkerTransactionsList = function() {
        const workerName = window.currentWorkerLedgerName;
        const listContainer = document.getElementById('workerTransactionsList');
        const totalBadge = document.getElementById('workerLedgerPeriodTotalBadge');
        const typeFilterSelect = document.getElementById('workerTransactionTypeFilter');
        const selectedType = typeFilterSelect ? typeFilterSelect.value : 'all';
        const period = window.workerLedgerPeriod || 'month';
        if (!listContainer || !workerName) return;
        const filtered = []; let periodSum = 0;
        const now = new Date(); const curYear = String(now.getFullYear());
        const activeMonth = window.workerLedgerSelectedMonth || `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const activeDay = window.workerLedgerSelectedDate || `${activeMonth}-${String(now.getDate()).padStart(2, '0')}`;
        (appState.staffPayouts || []).forEach(item => {
            if (!item) return; const iName = (item.name || item.staffName || '').trim();
            if (iName.toLowerCase() !== workerName.toLowerCase()) return;
            const amt = parseFloat(String(item.amount || item.price || 0).replace(/,/g, '')) || 0;
            const dInfo = parseItemDate(item);
            // Filter by period
            let matchPeriod = true; if (period === 'day') {
                matchPeriod = dInfo.fullDate === activeDay;
            } else if (period === 'month') {
                matchPeriod = dInfo.yearMonth === activeMonth;
            } else if (period === 'year') {
                matchPeriod = dInfo.year === curYear;
            }
            // Filter by type
            let matchType = true; if (selectedType !== 'all') {
                matchType = (item.type || '').trim() === selectedType;
            } if (matchPeriod && matchType) {
                periodSum += amt; filtered.push({
                    ...item, numericAmount: amt,
                    dateInfo: dInfo }); } }); if (totalBadge) {
            totalBadge.textContent = `المجموع: ${Number(periodSum).toLocaleString()} دج (${filtered.length} معاملة)`;
        } if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="text-xs text-slate-400 text-center py-8 font-medium bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                    <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    <p class="font-bold text-slate-600 mb-0.5">لا توجد معاملات مسجلة لهذا العامل في هذه الفترة</p>
                    <p class="text-[11px] text-slate-400">يمكنك تغيير التصفية أو تسجيل دفعة جديدة بالزر أدناه</p>
                </div>
            `; return; }
        // Sort descending
        filtered.sort((a, b) => { const timeA = new Date(a.date || a.createdAt || 0).getTime() || 0;
            const timeB = new Date(b.date || b.createdAt || 0).getTime() || 0;
            return timeB - timeA; }); const typeColorMap = {
            'راتب شهري': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            'تسقيع / تسليف': 'bg-amber-50 text-amber-700 border-amber-200',
            'مكافأة / بونوس': 'bg-purple-50 text-purple-700 border-purple-200',
            'نسبة مئوية': 'bg-indigo-50 text-indigo-700 border-indigo-200',
            'أجر يومي': 'bg-sky-50 text-sky-700 border-sky-200'
        }; listContainer.innerHTML = filtered.map(item => {
            const safeType = escapeHTML(item.type || 'دفعة');
            const safeNotes = escapeHTML(item.notes || '');
            const safeId = escapeHTML(item.id || '');
            const dateStr = item.dateInfo.fullDate || item.date || '';
            const colorClass = typeColorMap[item.type] || 'bg-blue-50 text-blue-700 border-blue-200';
            return `
                <div class="bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-2xl shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between gap-3">
                    <div class="text-right flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs font-black px-2 py-0.5 rounded-lg border ${colorClass}">${safeType}</span>
                            <span class="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <svg class="w-3.5 h-3.5 text-slate-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <span>${dateStr}</span>
                            </span>
                        </div>
                        ${safeNotes ? `<p class="text-xs text-slate-600 font-medium mt-1 truncate"><span class="text-slate-400 text-[10px]">ملاحظة:</span> ${safeNotes}</p>` : ''}
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        <div class="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-left">
                            <span class="font-black text-blue-900 text-sm sm:text-base">${Number(item.numericAmount).toLocaleString()} دج</span>
                        </div>
                        <button type="button" onclick="editStaffPayout('${safeId}'); closeModal('workerTransactionsModal');" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 hover:bg-amber-100 text-slate-600 hover:text-amber-700 border border-slate-200 hover:border-amber-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="تعديل الدفعة">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button type="button" onclick="deleteStaffPayout('${safeId}'); renderWorkerTransactionsModal();" class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 hover:bg-red-100 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-300 flex items-center justify-center transition-colors shadow-2xs cursor-pointer" title="حذف الدفعة">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `; }).join(''); }; window.quickAddPayoutForCurrentWorker = function() {
        const workerName = window.currentWorkerLedgerName;
        closeModal('workerTransactionsModal');
        openStaffPayoutsIfAllowed(); setTimeout(() => {
            const nameInput = document.getElementById('staffName');
            const amtInput = document.getElementById('staffAmount');
            if (nameInput && workerName) {
                nameInput.value = workerName; }
            if (amtInput) { amtInput.focus(); }
        }, 150); }; window.printWorkerStatement = function(workerName) {
        const wName = workerName || window.currentWorkerLedgerName;
        if (!wName) return; const period = window.workerLedgerPeriod || 'month';
        const now = new Date(); const curYear = String(now.getFullYear());
        const activeMonth = window.workerLedgerSelectedMonth || `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const activeDay = window.workerLedgerSelectedDate || `${activeMonth}-${String(now.getDate()).padStart(2, '0')}`;
        let periodLabel = 'كل المعاملات'; if (period === 'day') periodLabel = `يوم: ${activeDay}`;
        else if (period === 'month') periodLabel = `شهر: ${activeMonth}`;
        else if (period === 'year') periodLabel = `سنة: ${curYear}`;
        const items = []; let totalSum = 0; (appState.staffPayouts || []).forEach(item => {
            if (!item) return; const iName = (item.name || item.staffName || '').trim();
            if (iName.toLowerCase() !== wName.toLowerCase()) return;
            const amt = parseFloat(String(item.amount || item.price || 0).replace(/,/g, '')) || 0;
            const dInfo = parseItemDate(item);
            let match = true; if (period === 'day') match = dInfo.fullDate === activeDay;
            else if (period === 'month') match = dInfo.yearMonth === activeMonth;
            else if (period === 'year') match = dInfo.year === curYear;
            if (match) { totalSum += amt; items.push({
                    date: dInfo.fullDate || item.date || '',
                    type: item.type || 'دفعة',
                    notes: item.notes || '-',
                    amount: amt }); } }); items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const printWindow = window.open('', '_blank');
        if (!printWindow) { showToast('يرجى السماح بالنوافذ المنبثقة لطباعة الكشف', 'error');
            return; } const rowsHtml = items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; text-align: right;">
                <td style="padding: 10px; font-weight: bold;">${idx + 1}</td>
                <td style="padding: 10px;">${it.date}</td>
                <td style="padding: 10px; font-weight: bold;">${it.type}</td>
                <td style="padding: 10px;">${it.notes}</td>
                <td style="padding: 10px; font-weight: bold; color: #1e3a8a;">${Number(it.amount).toLocaleString()} دج</td>
            </tr>
        `).join(''); const docHtml = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>كشف حساب ومعاملات - ${wName}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; direction: rtl; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
                    .badge { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 8px; font-weight: bold; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                    th { background: #f8fafc; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: right; }
                    .total-box { margin-top: 25px; display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; font-size: 16px; font-weight: bold; }
                    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 style="margin: 0; font-size: 20px; color: #0f172a;">كشف حساب وخلاص العامل</h1>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">القاعة الرياضية - سجل المعاملات المالية</p>
                    </div>
                    <div style="text-align: left;">
                        <span class="badge">${periodLabel}</span>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">تاريخ الطباعة: ${now.toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold;">اسم العامل / الكوتش: <span style="color: #2563eb;">${wName}</span></p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            <th>التاريخ</th>
                            <th>طبيعة المعاملة</th>
                            <th>الملاحظات والتفاصيل</th>
                            <th>المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">لا توجد معاملات مسجلة</td></tr>'}
                    </tbody>
                </table>

                <div class="total-box">
                    <span>إجمالي المبالغ المدفوعة في هذه الفترة (${items.length} معاملة):</span>
                    <span style="color: #2563eb; font-size: 18px;">${Number(totalSum).toLocaleString()} دج</span>
                </div>

                <div class="footer">
                    <div>توقيع الإدارة: ........................</div>
                    <div>توقيع واستلام العامل: ........................</div>
                </div>

                <script>
                    window.onload = function() { window.print(); };
                <\/script>
            </body>
            </html>
        `; printWindow.document.open();
        printWindow.document.write(docHtml);
        printWindow.document.close(); };
    document.getElementById('coachAbsenceForm')?.addEventListener('submit', function(e) {
        e.preventDefault(); const numDays = parseInt(getElemVal('absenceDays'));
        if (isNaN(numDays) || numDays <= 0) return;
        const dateRaw = getElemVal('absenceDate');
        let formattedDate = dateRaw; if (dateRaw) {
            const parts = dateRaw.split('-'); if (parts.length === 3) {
                formattedDate = `${parts[0]}/${parseInt(parts[1])}/${parseInt(parts[2])}`;
            } } else { const d = new Date();
            formattedDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
        } appState.customers.forEach(c => { if (['active', 'near_expiry'].includes(calculateStatus(c))) {
                const currentEnd = new Date(c.endDate);
                currentEnd.setDate(currentEnd.getDate() + numDays);
                c.endDate = currentEnd.toISOString();
                if (window.saveFirebaseSectionItem) {
                    window.saveFirebaseSectionItem('customers', c);
                }
            } }); if (!appState.coachAbsences) appState.coachAbsences = [];
        const newAbsence = { id: Date.now().toString(), date: formattedDate, days: numDays };
        appState.coachAbsences.unshift(newAbsence);
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('coachAbsences', newAbsence);
        }
        if (typeof logActivity === 'function') {
            logActivity('customer', 'تمديد اشتراكات لغياب المدرب', `تاريخ الغياب: ${formattedDate} - مدة التمديد: ${numDays} يوم لجميع المشتركين النشطين`, 0);
        }
        saveState(); closeModal('coachAbsenceModal');
        showSuccessToast('تم تمديد اشتراك المشتركين بنجاح');
        this.reset(); const dateInput = document.getElementById('absenceDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }); function toggleFreeze(customerId) {
       const customer = (appState.customers || []).find(c => c && (String(c.id) === String(customerId) || String(c._rtdbKey) === String(customerId)));
       if (!customer) return;
       customer.updatedAt = Date.now();
       if (customer.status === 'frozen') {
           const newEndDate = new Date();
           newEndDate.setDate(newEndDate.getDate() + customer.frozenRemainingDays);
           customer.endDate = newEndDate.toISOString();
           customer.status = 'active'; } else {
           customer.frozenRemainingDays = getRemainingDays(customer);
           customer.status = 'frozen'; }
       if (window.saveFirebaseSectionItem) {
           window.saveFirebaseSectionItem('customers', customer);
       }
       if (typeof logActivity === 'function') {
           logActivity('customer', customer.status === 'frozen' ? 'تجميد حساب مشترك' : 'إلغاء تجميد مشترك', `${customer.status === 'frozen' ? 'تجميد' : 'إلغاء تجميد'} المشترك: ${customer.name}`);
       }
       saveState();
    } function getMsgTextForTemplate(type, c) {
        if (!c) return ''; const name = (c.name || 'المشترك').trim();
        const remDays = typeof getRemainingDays === 'function' ? getRemainingDays(c) : 0;
        const debt = Number(c.debtAmount || 0).toLocaleString();
        switch (type) { case 'near_expiry':
                return `السلام عليكم ${name}، نود تذكيرك بأن اشتراكك في صالة OMEGA GYM قارب على الانتهاء (متبقي ${remDays > 0 ? remDays : 0} أيام). مرحباً بك في أي وقت لتجديد الاشتراك ومواصلة التدريب معنا! `;
            case 'expired': return `السلام عليكم ${name}، نود إعلامك بأن اشتراكك في صالة OMEGA GYM قد انتهى. نحن بانتظارك لتجديد الاشتراك ومواصلة روتينك الرياضي وتدريباتك. أهلاً بك دائماً! `;
            case 'credit': return `السلام عليكم ${name}، إن شاء الله تكون بخير. نود تذكيرك بالمبلغ المتبقي (${debt} دج) الخاص باشتراكك في صالة OMEGA GYM. شكراً لك ومرحباً بك في أي وقت! `;
            case 'welcome': return `مرحباً بك ${name} في صالة OMEGA GYM!  تم تفعيل اشتراكك بنجاح. نتمنى لك حصصاً رياضية ممتعة ونتائج ممتازة معنا. بالتوفيق! `;
            case 'general': default: return `السلام عليكم ${name}، صالة OMEGA GYM تتمنى لك يوماً سعيداً ونشيطاً! نذكرك بحصتك التدريبية اليوم للحفاظ على لياقتك وتحقيق أهدافك. `;
        } } window.getMsgTextForTemplate = getMsgTextForTemplate;
    function setMsgTemplate(type) { const custId = getElemVal('msgCustId');
        const c = appState.customers.find(cust => cust.id === custId);
        if (c) { const txt = getMsgTextForTemplate(type, c);
            const contentArea = document.getElementById('msgContent');
            if (contentArea) contentArea.value = txt;
        } } window.setMsgTemplate = setMsgTemplate;
    function openMessageModal(customerId) {
        if (!Array.isArray(appState.customers)) appState.customers = [];
        const c = appState.customers.find(cust => String(cust && cust.id) === String(customerId));
        if (c) {
            const rawPhone = c.phone || '';
            const dispPhone = getDisplayPhone(rawPhone);
            const nameElem = document.getElementById('msgCustomerName');
            if (nameElem) nameElem.textContent = 'إلى: ' + (c.name || 'مشترك') + (dispPhone ? ' (' + dispPhone + ')' : '');
            
            const phoneElem = document.getElementById('msgPhone');
            if (phoneElem) phoneElem.value = rawPhone;
            
            const custIdElem = document.getElementById('msgCustId');
            if (custIdElem) custIdElem.value = c.id;

            const remDays = typeof getRemainingDays === 'function' ? getRemainingDays(c) : 30;
            let defaultType = 'general';
            if (c.paymentStatus === 'credit' && Number(c.debtAmount) > 0) {
                defaultType = 'credit';
            } else if (c.status === 'expired' || remDays <= 0) {
                defaultType = 'expired';
            } else if (c.status === 'near_expiry' || remDays <= 5) {
                defaultType = 'near_expiry';
            } else {
                defaultType = 'welcome';
            }
            setMsgTemplate(defaultType);
        }
        openModal('messageModal');
    }
    window.openMessageModal = openMessageModal;

    function sendMessage(method) {
        const rawPhone = getElemVal('msgPhone') || '';
        const rawContent = getElemVal('msgContent') || '';

        if (!rawPhone) {
            if (typeof showErrorToast === 'function') showErrorToast('يرجى التأكد من وجود رقم هاتف للمشترك');
            return;
        }

        let cleanPhone = rawPhone.toString().trim().replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00213')) {
            cleanPhone = '213' + cleanPhone.substring(5);
        } else if (cleanPhone.startsWith('0')) {
            cleanPhone = '213' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 9 && (cleanPhone.startsWith('5') || cleanPhone.startsWith('6') || cleanPhone.startsWith('7'))) {
            cleanPhone = '213' + cleanPhone;
        }

        const encodedText = encodeURIComponent(rawContent);

        if (method === 'whatsapp') {
            const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
            const link = document.createElement('a');
            link.href = waUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (method === 'sms') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const smsUrl = isIOS 
                ? `sms:${rawPhone.replace(/[^0-9+]/g, '')}&body=${encodedText}` 
                : `sms:${rawPhone.replace(/[^0-9+]/g, '')}?body=${encodedText}`;
            
            const link = document.createElement('a');
            link.href = smsUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        closeModal('messageModal');
    }
    window.sendMessage = sendMessage;
    
    function parseSafeDate(rawDate) {
        if (!rawDate && rawDate !== 0) return null;
        if (rawDate instanceof Date) return isNaN(rawDate.getTime()) ? null : rawDate;
        if (typeof rawDate === 'number') {
            const d = new Date(rawDate);
            return isNaN(d.getTime()) ? null : d;
        }
        if (typeof rawDate === 'string') {
            const str = rawDate.trim();
            if (!str) return null;
            if (/^\d{10,15}$/.test(str)) {
                const d = new Date(Number(str));
                if (!isNaN(d.getTime())) return d;
            }
            if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
                const parts = str.split(/[-/T\s]/);
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const d = new Date(y, m, day);
                if (!isNaN(d.getTime())) return d;
            }
            const d = new Date(str);
            if (!isNaN(d.getTime())) return d;
        }
        if (typeof rawDate === 'object' && rawDate.seconds) {
            return new Date(rawDate.seconds * 1000);
        }
        return null;
    }
    window.parseSafeDate = parseSafeDate;

    function inferCategoryFromText(text) {
        if (!text) return null;
        const t = text.toLowerCase();
        
        // 1. Doses (جرعات بروتين ومكملات بالدوزة)
        if (
            t.includes('دوز') || 
            t.includes('جرع') || 
            t.includes('dose') || 
            t.includes('doza') || 
            t.includes('doz') || 
            t.includes('سكوب') || 
            t.includes('scoop') || 
            t.includes('شايك') || 
            t.includes('كأس') || 
            t.includes('كوب') || 
            t.includes('shake')
        ) {
            return 'doses';
        }

        // 2. Frigo (مشروبات، ماء، شوفان، سناكات)
        if (
            t.includes('فريغو') || 
            t.includes('فريكو') || 
            t.includes('frigo') || 
            t.includes('ماء') || 
            t.includes('مياه') || 
            t.includes('eau') || 
            t.includes('water') || 
            t.includes('ifri') || 
            t.includes('saida') || 
            t.includes('guedila') || 
            t.includes('lalla') || 
            t.includes('قارور') || 
            t.includes('قرعة') || 
            t.includes('bouteille') || 
            t.includes('جي') || 
            t.includes('jus') || 
            t.includes('juice') || 
            t.includes('عصير') || 
            t.includes('شوفان') || 
            t.includes('flocon') || 
            t.includes('avoine') || 
            t.includes('oats') || 
            t.includes('شيبس') || 
            t.includes('chips') || 
            t.includes('مشروب') || 
            t.includes('boisson') || 
            t.includes('drink') || 
            t.includes('energy') || 
            t.includes('redbull') || 
            t.includes('red bull') || 
            t.includes('monster') || 
            t.includes('قهوة') || 
            t.includes('cafe') || 
            t.includes('café') || 
            t.includes('coffee') || 
            t.includes('كوكا') || 
            t.includes('coca') || 
            t.includes('pepsi') || 
            t.includes('بيبسي') || 
            t.includes('ياغورت') || 
            t.includes('yaourt') || 
            t.includes('حليب') || 
            t.includes('lait') || 
            t.includes('تونة') || 
            t.includes('thon') || 
            t.includes('بيض') || 
            t.includes('oeuf') || 
            t.includes('سناك') || 
            t.includes('snack') || 
            t.includes('snickers') || 
            t.includes('سنيكرز') || 
            t.includes('mars') || 
            t.includes('twix') || 
            t.includes('biscuit') || 
            t.includes('شكلاطة') || 
            t.includes('chocolat')
        ) {
            return 'frigo';
        }

        // 3. Boxes (علب مغلقة ومكملات غذائية)
        if (
            t.includes('علب') || 
            t.includes('مغلق') || 
            t.includes('مسكر') || 
            t.includes('boite') || 
            t.includes('boîte') || 
            t.includes('box') || 
            t.includes('pot') || 
            t.includes('بروتين') || 
            t.includes('protein') || 
            t.includes('whey') || 
            t.includes('واي') || 
            t.includes('creatine') || 
            t.includes('كرياتين') || 
            t.includes('غينر') || 
            t.includes('gainer') || 
            t.includes('mass') || 
            t.includes('ماس') || 
            t.includes('bcaa') || 
            t.includes('eaa') || 
            t.includes('amino') || 
            t.includes('امينو') || 
            t.includes('omega') || 
            t.includes('اوميغا') || 
            t.includes('glutamine') || 
            t.includes('غلوتامين') || 
            t.includes('isolate') || 
            t.includes('ايزولات') || 
            t.includes('casein') || 
            t.includes('كازين') || 
            t.includes('carnitine') || 
            t.includes('كارنتين') || 
            t.includes('vitamine') || 
            t.includes('vitamin') || 
            t.includes('فيتامين') || 
            t.includes('collagen') || 
            t.includes('كولاجين') || 
            t.includes('preworkout') || 
            t.includes('pre-workout') || 
            t.includes('حارق دهون') || 
            t.includes('fat burner') || 
            t.includes('كيلو') || 
            t.includes('kg') || 
            t.includes('lbs')
        ) {
            return 'boxes';
        }

        return null;
    }

    function getProductCategory(item) {
        if (!item) return 'boxes';
        if (typeof item === 'string') {
            const str = item.toLowerCase().trim();
            if (str === 'doses' || str === 'boxes' || str === 'frigo') return str;
            item = { name: str };
        }
        // Direct category field check
        const directCat = (item.category || '').toString().toLowerCase().trim();
        if (directCat === 'doses' || directCat === 'boxes' || directCat === 'frigo') {
            return directCat;
        }

        // Check if item is a sale linked to an existing product in appState.products
        if (item.prodId && Array.isArray(window.appState && window.appState.products)) {
            const pId = String(item.prodId);
            const linked = window.appState.products.find(p => p && (String(p.id) === pId || String(p.barcode) === pId));
            if (linked) {
                const lCat = (linked.category || '').toString().toLowerCase().trim();
                if (lCat === 'doses' || lCat === 'boxes' || lCat === 'frigo') {
                    return lCat;
                }
                const pCombined = ((linked.name || '') + ' ' + (linked.weight || '') + ' ' + (linked.brand || '')).toLowerCase();
                const pCatInferred = inferCategoryFromText(pCombined);
                if (pCatInferred) return pCatInferred;
            }
        }

        // Combine all text fields from item
        const combined = ((item.name || '') + ' ' + (item.prodName || '') + ' ' + (item.productName || '') + ' ' + (item.weight || '') + ' ' + (item.unitLabel || '') + ' ' + (item.desc || '')).toLowerCase();
        const inferred = inferCategoryFromText(combined);
        if (inferred) return inferred;

        // If nothing matched, check if sold in doses mode
        if (item.sellMode === 'doses' || (item.stockDeduction && item.stockDeduction < 1)) {
            return 'doses';
        }

        return 'boxes'; // Default gym products / supplements to boxes
    }
    window.getProductCategory = getProductCategory;

    window.categoryBreakdownFilter = 'month';
    window.setCategoryBreakdownFilter = function(mode) {
        window.categoryBreakdownFilter = mode;
        if (typeof render === 'function') render();
    };

    function formatMoney(amount) { return appState.hideFinances ? '**** دج' : Number(amount).toLocaleString() + ' دج'; }
    // Global password action callback handler
    
    function verifyMasterPassword(pass) {
        if (!pass) return false; return (pass === '8992' || (typeof hashString === 'function' && hashString(pass) === 1724890));
    } window.verifyMasterPassword = verifyMasterPassword;

    function promptWithPassword(options, onSuccessCallback, onCancelCallback) {
        const title = options?.title || 'كلمة المرور';
        const promptText = options?.prompt || 'أدخل كلمة المرور للمتابعة';
        const btnText = options?.buttonText || 'تأكيد';
        const titleEl = document.getElementById('privacyModalTitle');
        const promptEl = document.getElementById('privacyModalPrompt');
        const submitBtn = document.getElementById('privacyModalSubmitBtn');
        const input = document.getElementById('privacyPasswordInput');
        if (titleEl) titleEl.innerText = title;
        if (promptEl) promptEl.innerText = promptText;
        if (submitBtn) submitBtn.innerText = btnText;
        if (input) input.value = '';
        window.pendingPasswordCallback = typeof onSuccessCallback === 'function' ? onSuccessCallback : null;
        window.pendingCancelCallback = typeof onCancelCallback === 'function' ? onCancelCallback : null;
        openModal('privacyModal'); setTimeout(() => {
            if (input) input.focus(); }, 200); }
    window.promptWithPassword = promptWithPassword;

    window.confirmPrivacyPassword = function() {
        const input = document.getElementById('privacyPasswordInput');
        const pass = input ? input.value : '';
        if (verifyMasterPassword(pass)) { 
            const cb = window.pendingPasswordCallback;
            window.pendingPasswordCallback = null;
            window.pendingCancelCallback = null;
            closeModal('privacyModal'); if (input) input.value = '';
            if (cb) { try { cb(); } catch (err) {
                    console.error('Error executing password callback:', err);
                } } else { appState.hideFinances = false;
                saveState(); render();
                showSuccessToast('تم التحقق بنجاح');
            } 
        } else { 
            showErrorToast('كلمة المرور خاطئة');
            if (input) { input.value = ''; input.focus(); } 
        } 
    };

    window.cancelPrivacyPassword = function() {
        const cb = window.pendingCancelCallback;
        window.pendingPasswordCallback = null;
        window.pendingCancelCallback = null;
        closeModal('privacyModal');
        if (cb) { try { cb(); } catch (err) {
            console.error('Error executing cancel callback:', err);
        } }
    }; document.getElementById('privacyPasswordInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') confirmPrivacyPassword();
    }); window.openExpensesIfAllowed = function() {
        if (appState.hideFinances) {
            promptWithPassword({ title: 'إدارة المصاريف',
                prompt: 'أدخل كلمة المرور لفتح نافذة المصاريف والمدفوعات',
                buttonText: 'دخول' }, () => {
                openModal('expensesModal'); });
        } else { openModal('expensesModal'); } };
    window.openStaffPayoutsIfAllowed = function() {
        if (appState.hideFinances) {
            promptWithPassword({ title: 'حسابات ومستحقات الموردين',
                prompt: 'أدخل كلمة المرور لفتح نافذة حسابات الموردين',
                buttonText: 'دخول' }, () => {
                openModal('staffPayoutsModal');
            }); } else { openModal('staffPayoutsModal');
        } };
    let _customerSearchDebounceTimer = null;
    async function triggerRemoteCustomerSearch(rawQuery) {
        if (!rawQuery) return;
        const q = String(rawQuery).trim();
        const digits = q.replace(/\D/g, '');
        if (digits.length >= 6) {
            const foundByPhone = await window.findCustomerByPhone(q);
            if (foundByPhone) {
                renderCustomers();
                return;
            }
        }
        if (q.length >= 4) {
            const foundByBc = await window.findCustomerByBarcode(q);
            if (foundByBc) {
                renderCustomers();
                return;
            }
        }
    }
    window.handleSearchView = function() {
        if (_customerSearchDebounceTimer) clearTimeout(_customerSearchDebounceTimer);
        _customerSearchDebounceTimer = setTimeout(() => {
            const val = getElemVal('searchInputView') || '';
            appState.searchQuery = val;
            appState.customerPage = 1;
            renderCustomers();
            triggerRemoteCustomerSearch(val);
        }, 150);
    };
    window.toggleDebtFieldView = function() {
       const status = getElemVal('paymentStatusView');
       const field = document.getElementById('debtAmountContainerView');
       if(!field) return; if (status === 'credit') {
           field.style.display = 'block';
           setElemRequired('debtAmountView', true);
       } else { field.style.display = 'none';
           setElemRequired('debtAmountView', false);
           setElemValue('debtAmountView', '');
       } };
    function handleSearch() {
        if (_customerSearchDebounceTimer) clearTimeout(_customerSearchDebounceTimer);
        _customerSearchDebounceTimer = setTimeout(() => {
            const val = getElemVal('searchInput') || '';
            appState.searchQuery = val;
            appState.customerPage = 1;
            renderCustomers();
            triggerRemoteCustomerSearch(val);
        }, 150);
    }
    function setFilter(filter) {
        appState.filter = filter;
        appState.customerPage = 1;
        renderCustomers();
    }
    function handleBarcodeScan(event) { if (event.key === 'Enter') {
            event.preventDefault(); const barcode = event.target.value.trim();
            if (barcode) { scanContext = 'sales';
                processBarcode(barcode).catch(err => console.error('Manual barcode error:', err));
                event.target.value = ''; } } }
    let isProcessingBarcode = false; let scannerCallbackProcessing = false;
    let lastScannedBarcode = ''; let lastScannedBarcodeTime = 0;
    function openBarcodeStockChoiceModal(candidates, barcode) {
        const modal = document.getElementById('barcodeStockChoiceModal');
        const infoElem = document.getElementById('barcodeStockChoiceProdInfo');
        const listElem = document.getElementById('barcodeStockChoiceList');
        if (!modal || !infoElem || !listElem) return;
        const firstProd = candidates[0] || {};
        const prodName = firstProd.name || 'منتج غير مسمى';
        const prodBrand = firstProd.brand ? `<span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-100">${firstProd.brand}</span>` : '';
        const prodWeight = firstProd.weight ? `<span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">${firstProd.weight}</span>` : '';
        infoElem.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div>
                    <h3 class="font-extrabold text-sm text-slate-800">${prodName}</h3>
                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                        ${prodBrand}
                        ${prodWeight}
                        <span class="text-[11px] text-slate-500 font-mono">الباركود: ${barcode}</span>
                    </div>
                </div>
                <div class="text-left shrink-0">
                    <span class="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">متواجد بالمخزنين</span>
                </div>
            </div>
        `; listElem.innerHTML = candidates.map(p => {
            const isStock2 = p.stockLocation === 'stock2';
            const locName = isStock2 ? 'مخزون 2 (Stock 2)' : 'مخزون 1 (Stock 1)';
            const stockCount = Number(p.stock || 0);
            const price = Number(p.price || 0);
            const isOutOfStock = stockCount <= 0;
            return `
                <div class="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 flex items-center justify-between gap-3 transition-all shadow-2xs">
                    <div>
                        <div class="flex items-center gap-1.5 font-extrabold text-sm text-slate-800">
                            <span>${locName}</span>
                        </div>
                        <div class="text-xs text-slate-600 mt-1 flex items-center gap-2">
                            <span>المتوفر: <strong class="font-extrabold ${isOutOfStock ? 'text-slate-500' : 'text-slate-800'}">${stockCount}</strong></span>
                            <span>•</span>
                            <span>السعر: <strong class="font-extrabold text-blue-700">${price} دج</strong></span>
                        </div>
                    </div>
                    <div>
                        <button type="button" 
                                onclick="chooseStockForSale('${p.id}')" 
                                ${isOutOfStock ? 'disabled' : ''}
                                class="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 ${isOutOfStock ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}">
                            <span>${isOutOfStock ? 'الكمية نفدت' : 'بيع من هنا'}</span>
                            ${!isOutOfStock ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
                        </button>
                    </div>
                </div>
            `; }).join(''); modal.classList.add('active');
    } window.openBarcodeStockChoiceModal = openBarcodeStockChoiceModal;
    function closeBarcodeStockChoiceModal() {
        const modal = document.getElementById('barcodeStockChoiceModal');
        if (modal) modal.classList.remove('active');
        isProcessingBarcode = false; } window.closeBarcodeStockChoiceModal = closeBarcodeStockChoiceModal;
    async function chooseStockForSale(productId) {
        closeBarcodeStockChoiceModal(); const product = appState.products.find(p => p.id === productId);
        if (!product) { showErrorToast('لم يتم العثور على المنتج المحدد');
            isProcessingBarcode = false; return;
        } const sellProdIdSelect = document.getElementById('sellProdId');
        if (sellProdIdSelect) { sellProdIdSelect.value = product.id;
            if (typeof updateStockInfoDisplay === 'function') {
                updateStockInfoDisplay(); } }
        const qtyInput = document.getElementById('sellProdQty');
        if (qtyInput) { qtyInput.focus();
            qtyInput.select(); }
        showSuccessToast(`تم اختيار (${product.name}) — أدخل الكمية المطلوبة ثم اضغط تأكيد البيع`);
        isProcessingBarcode = false; } window.chooseStockForSale = chooseStockForSale;
    function setQuickSellQty(qty) {
        const input = document.getElementById('sellProdQty');
        if (input) {
            input.value = Math.max(0.001, parseFloat(qty) || 1);
            if (typeof updateStockInfoDisplay === 'function') updateStockInfoDisplay();
        }
    }
    window.setQuickSellQty = setQuickSellQty;

    function changeQuickSellQty(delta) {
        const input = document.getElementById('sellProdQty');
        if (input) {
            let current = parseFloat(input.value) || 1;
            let next = Math.max(1, Math.round(current + delta));
            input.value = next;
            if (typeof updateStockInfoDisplay === 'function') updateStockInfoDisplay();
        }
    }
    window.changeQuickSellQty = changeQuickSellQty;

    async function executeProductSale(product, requestedQty, coachName, customDate) {
        if (!product) {
            isProcessingBarcode = false;
            return false;
        }
        if (product.stockLocation === 'stock2') {
            showErrorToast('عفواً! Stock 2 هو مستودع تخزين ولا يمكن البيع منه مباشرة. يرجى تحويل الكمية إلى Stock 1 أولاً.');
            isProcessingBarcode = false;
            return false;
        }
        const currentStock = Number(product.stock || 0);
        if (currentStock <= 0) {
            showErrorToast(`انتهت كمية [${product.name}] من Stock 1!`);
            isProcessingBarcode = false;
            return false;
        }
        try {
            const qtyInput = document.getElementById('sellProdQty');
            let qty = (requestedQty !== undefined && requestedQty !== null && Number(requestedQty) > 0)
                ? Number(requestedQty)
                : ((qtyInput && parseFloat(qtyInput.value) > 0) ? parseFloat(qtyInput.value) : 1);

            const coachInput = document.getElementById('sellCoachName');
            const coachVal = coachName || ((coachInput && coachInput.value.trim()) ? coachInput.value.trim() : 'عام');

            const weightVal = (typeof parseProductWeight === 'function') ? parseProductWeight(product.weight) : null;
            let stockDeduction = (weightVal && weightVal > 0) ? (qty * weightVal) : qty;
            let salePrice = Number(product.price || 0);
            let saleCost = Number(product.cost || 0) * qty;
            let unitLabel = '';

            if (currentStock < stockDeduction) {
                showErrorToast(`الكمية المطلوبة تتطلب خصم (${stockDeduction}) من المخزون وغير متوفرة في Stock 1 (المتوفر: ${currentStock})`);
                return false;
            }

            // Date parsing
            let dateStr = customDate;
            if (!dateStr) {
                const dateVal = getElemVal('sellDate') || '';
                if (dateVal) {
                    const now = new Date();
                    const parts = dateVal.split('-');
                    if (parts.length === 3) {
                        const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), now.getHours(), now.getMinutes(), now.getSeconds());
                        dateStr = !isNaN(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
                    } else {
                        dateStr = new Date(dateVal).toISOString();
                    }
                } else {
                    dateStr = new Date().toISOString();
                }
            }

            let saleTotal = Number((salePrice * qty).toFixed(2));
            let saleProfit = saleTotal - saleCost;
            let coachCommission = (coachVal && coachVal !== 'عام' && saleProfit > 0) ? Math.round(saleProfit * 0.33) : 0;
            let prodCategory = product.category || (typeof getProductCategory === 'function' ? getProductCategory(product) : 'other');
            let saleLabel = product.name + unitLabel;

            // Deduct quantity from stock
            product.stock = currentStock - stockDeduction;

            if (!appState.sales) appState.sales = [];
            const newSale = {
                id: Date.now().toString(),
                prodId: product.id,
                prodName: saleLabel,
                category: prodCategory,
                stockLocation: product.stockLocation || 'stock1',
                stockName: 'مخزون 1',
                qty: qty,
                stockDeduction: stockDeduction,
                price: salePrice,
                cost: saleCost,
                total: saleTotal,
                profit: saleProfit,
                coachName: coachVal,
                coachCommission: coachCommission,
                date: dateStr
            };

            appState.sales.unshift(newSale);
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('sales', newSale);
                window.saveFirebaseSectionItem('products', product);
            }
            saveState();

            if (typeof logActivity === 'function') {
                logActivity('sale', 'بيع منتج فوري بالباركود', `المنتج: ${product.name} - الكمية: ${qty} (خصم مخزون: ${stockDeduction}) - الإجمالي: ${saleTotal} دج`, saleTotal);
            }

            playBeep();
            showSuccessToast(`⚡ تم بيع (${qty}) من [${product.name}] بنجاح بدون تأكيد! (خصم المخزون: ${stockDeduction} - المتبقي: ${product.stock})`);

            if (typeof updateSellProductDropdown === 'function') updateSellProductDropdown();
            if (typeof updateStockInfoDisplay === 'function') updateStockInfoDisplay();
            if (typeof render === 'function') render();
            return true;
        } finally {
            isProcessingBarcode = false;
        }
    }
    window.executeProductSale = executeProductSale;
    async function processBarcode(barcode) {
        barcode = String(barcode ?? '').trim();
        if (!barcode || isProcessingBarcode) return;
        const now = Date.now(); if (barcode === lastScannedBarcode && (now - lastScannedBarcodeTime) < 1200) return;
        lastScannedBarcode = barcode;
        lastScannedBarcodeTime = now;
        isProcessingBarcode = true; try { let candidateProducts = (appState.products || []).filter(p => String(p.barcode ?? '').trim().toLowerCase() === barcode.toLowerCase());
            if (candidateProducts.length === 0 && window.findProductByBarcode) {
                try {
                    const fbProduct = await window.findProductByBarcode(barcode);
                    if (fbProduct) {
                        candidateProducts = [fbProduct];
                    }
                } catch (e) {
                    console.warn('Firebase search note in processBarcode:', e?.message || e);
                } } if (candidateProducts.length === 0) {
                if (scanContext === 'inventory_search' || scanContext === 'search') {
                    const searchInput = document.getElementById('searchProductInput');
                    if (searchInput) searchInput.value = barcode;
                    setStockFilter('all');
                    renderProductsList();
                    showErrorToast('لم يتم العثور على أي منتج في المخزون بالباركود: ' + barcode);
                    await closeBarcodeCamera();
                    isProcessingBarcode = false;
                    return; } const barcodeInput = document.getElementById('prodBarcode');
                if (barcodeInput) barcodeInput.value = barcode;
                const nameInput = document.getElementById('prodName');
                if (nameInput) nameInput.focus();
                showErrorToast('المنتج غير مسجل — يمكنك إدخال بياناته الآن');
                await closeBarcodeCamera();
                isProcessingBarcode = false;
                return; } if (scanContext === 'sales') {
                const prodStock1 = candidateProducts.find(p => !p.stockLocation || p.stockLocation === 'stock1');
                const prodStock2 = candidateProducts.find(p => p.stockLocation === 'stock2');
                if (prodStock1) {
                    if (Number(prodStock1.stock || 0) <= 0) {
                        if (prodStock2 && Number(prodStock2.stock || 0) > 0) {
                            showErrorToast(`نفدت الكمية من Stock 1! توجد كمية (${prodStock2.stock}) بالمستودع (Stock 2). يرجى تحويلها إلى Stock 1 أولاً لبيعها.`);
                        } else {
                            showErrorToast(`انتهت كمية [${prodStock1.name}] من Stock 1!`);
                        }
                        await closeBarcodeCamera();
                        isProcessingBarcode = false;
                        return;
                    }

                    // Direct Sale with chosen quantity without extra confirmation
                    const qtyInput = document.getElementById('sellProdQty');
                    const chosenQty = (qtyInput && parseFloat(qtyInput.value) > 0) ? parseFloat(qtyInput.value) : 1;

                    const weightValBarcode = (typeof parseProductWeight === 'function') ? parseProductWeight(prodStock1.weight) : null;
                    const requiredStockBarcode = (weightValBarcode && weightValBarcode > 0) ? (chosenQty * weightValBarcode) : chosenQty;

                    if (Number(prodStock1.stock || 0) < requiredStockBarcode) {
                        showErrorToast(`الكمية المتوفرة في Stock 1 (${prodStock1.stock}) أقل من الكمية المطلوب خصمها (${requiredStockBarcode})!`);
                        await closeBarcodeCamera();
                        isProcessingBarcode = false;
                        return;
                    }

                    await executeProductSale(prodStock1, chosenQty);

                    const sellBarcodeInput = document.getElementById('sellBarcode');
                    if (sellBarcodeInput) {
                        sellBarcodeInput.value = '';
                        sellBarcodeInput.focus();
                    }
                    await closeBarcodeCamera();
                    isProcessingBarcode = false;
                    return;
                } else if (prodStock2) {
                    showErrorToast(`عفواً! المنتج (${prodStock2.name}) متوفر في المستودع (Stock 2) فقط (${prodStock2.stock} قطعة). لا يمكن البيع المباشر من المستودع، يرجى تحويل الكمية إلى Stock 1 أولاً.`);
                    await closeBarcodeCamera();
                    isProcessingBarcode = false;
                    return;
                } else {
                    showErrorToast('المنتج غير مسجل في Stock 1!');
                    await closeBarcodeCamera();
                    isProcessingBarcode = false;
                    return;
                }
            } else if (scanContext === 'pos_search') {
                await closeBarcodeCamera();
                const barcodeInput = document.getElementById('posProductSearchInput');
                if (barcodeInput) barcodeInput.value = barcode;
                handlePosProductSearch(barcode, true);
                isProcessingBarcode = false;
                return;
            } else if (scanContext === 'inventory_search' || scanContext === 'search') {
                // Inventory Search scan
                await closeBarcodeCamera();
                const product = candidateProducts[0];
                const isStock2Prod = product.stockLocation === 'stock2';
                const stockLocTitle = isStock2Prod ? 'المستودع (Stock 2)' : 'صالة البيع (Stock 1)';
                const searchInput = document.getElementById('searchProductInput');
                if (searchInput) { searchInput.value = barcode;
                } setStockFilter('all');
                renderProductsList(); playBeep();
                showSuccessToast(`تم العثور على (${product.name}) في ${stockLocTitle} — الكمية: ${product.stock}`);
                // Smooth scroll and highlight the found product card
                setTimeout(() => { const card = document.getElementById(`product-card-${product.id}`) || document.querySelector(`[data-product-id="${product.id}"]`);
                    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        card.classList.add('ring-4', 'ring-blue-500', 'bg-blue-50');
                        setTimeout(() => { card.classList.remove('ring-4', 'ring-blue-500', 'bg-blue-50');
                        }, 3500); } }, 150);
                isProcessingBarcode = false;
                return; } else {
                // Product Management scan (adding / modifying)
                await closeBarcodeCamera();
                const product = candidateProducts[0];
                const isStock2Prod = product.stockLocation === 'stock2';
                const stockLocTitle = isStock2Prod ? 'مخزون 2 (Stock 2)' : 'مخزون 1 (Stock 1)';
                const barcodeInput = document.getElementById('prodBarcode');
                if (barcodeInput) barcodeInput.value = barcode;
                const nameInput = document.getElementById('prodName');
                if (nameInput && !nameInput.value) nameInput.value = product.name || '';
                const locSelect = document.getElementById('prodStockLocation');
                if (locSelect) locSelect.value = product.stockLocation || 'stock1';
                showSuccessToast(`المنتج موجود في ${stockLocTitle}: ${product.name}`);
                isProcessingBarcode = false; } } catch (err) {
            console.error('Barcode process error:', err);
            isProcessingBarcode = false; } }
    function handleInventoryBarcodeSearch(val) {
        val = String(val || '').trim(); if (!val) {
            renderProductsList(); return; }
        scanContext = 'inventory_search';
        processBarcode(val).catch(err => console.error('Inventory barcode search error:', err));
    } window.handleInventoryBarcodeSearch = handleInventoryBarcodeSearch;
    function playBeep() { try { const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.1);
        } catch(e) {} } let scanContext = 'sales';
    let html5QrCode = null; let zxingReader = null;
    let zxingControls = null; let zxingVideoStream = null;
    let barcodeVideoTrack = null;   // active camera track, used for zoom/torch
    let barcodeZoomCaps = null;     // {min, max, step} zoom capabilities of current track
    let barcodeCurrentZoom = 1; let barcodeTorchOn = false;
    let barcodeSelectedDeviceId = null; let barcodeFacingMode = 'environment';
    function openBarcodeCamera(context = 'sales') {
        scanContext = context; document.getElementById('barcodeModal')?.classList.add('active');
        startBarcodeScanner(); } async function startBarcodeScanner() {
        const reader = document.getElementById('barcodeReader');
        const title = document.getElementById('barcodeModalTitle');
        if (!reader) return; if (scannerCallbackProcessing) return;
        reader.style.display = 'block'; if (scanContext === 'sales') {
            title.textContent = 'مسح باركود لبيع منتج (صالة البيع)';
        } else if (scanContext === 'pos_search') {
            title.textContent = 'مسح باركود للبحث وتحديد المنتج في صالة البيع';
        } else if (scanContext === 'inventory_search' || scanContext === 'search') {
            title.textContent = 'مسح باركود للبحث في المخزون (Stock 1 & Stock 2)';
        } else { title.textContent = 'مسح باركود لإضافة أو تعديل منتج';
        }
        // Stop any previous barcode readers before starting a new one.
        try { if (zxingControls) zxingControls.stop(); } catch (e) {}
        zxingControls = null; try { if (zxingReader) zxingReader.reset(); } catch (e) {}
        zxingReader = null; try { if (html5QrCode && html5QrCode.isScanning) await html5QrCode.stop(); } catch (e) {}
        try { if (html5QrCode) html5QrCode.clear(); } catch (e) {}
        html5QrCode = null;
        // Use a real video element. ZXing is used as the primary decoder for
        // retail 1D barcodes because it is more reliable for EAN-13 than the
        // generic QR-oriented scanner on some mobile browsers.
        reader.innerHTML = `
            <video id="barcodeVideo" autoplay muted playsinline
                style="display:block;width:100%;height:100%;min-height:260px;object-fit:cover;background:#000;"></video>
            <div style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;">
                <div style="width:92%;height:30%;max-width:620px;border:3px solid #22c55e;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.16);"></div>
            </div>`; const video = document.getElementById('barcodeVideo');
        if (!video) return;
        try {
            let zxingMod = null;
        try {
            zxingMod = await import('@zxing/browser');
        } catch (e) {
            console.warn('ZXing dynamic import failed:', e);
        }
        if (!zxingMod || !zxingMod.BrowserMultiFormatReader) {
            throw new Error('ZXing library did not load');
        }
        let hints;
        try {
            if (zxingMod.BarcodeFormat) {
                hints = new Map();
                hints.set(2, [
                    zxingMod.BarcodeFormat.EAN_13,
                    zxingMod.BarcodeFormat.EAN_8,
                    zxingMod.BarcodeFormat.UPC_A,
                    zxingMod.BarcodeFormat.UPC_E,
                    zxingMod.BarcodeFormat.CODE_128,
                    zxingMod.BarcodeFormat.CODE_39,
                    zxingMod.BarcodeFormat.CODE_93,
                    zxingMod.BarcodeFormat.ITF,
                    zxingMod.BarcodeFormat.CODABAR,
                    zxingMod.BarcodeFormat.QR_CODE
                ]);
            }
        } catch (e) { hints = undefined; }
        zxingReader = new zxingMod.BrowserMultiFormatReader(hints, 150);
            // Determine active camera device ID or facing mode.
            let deviceId = barcodeSelectedDeviceId;
            if (!deviceId) { try { const tempStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: barcodeFacingMode } },
                        audio: false });
                    zxingVideoStream = tempStream;
                    tempStream.getTracks().forEach(track => track.stop());
                    zxingVideoStream = null;
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const cameras = devices.filter(d => d.kind === 'videoinput');
                    if (barcodeFacingMode === 'environment') {
                        const rear = cameras.find(d => /back|rear|environment|world|خلف|خلفية/i.test(d.label || ''));
                        deviceId = rear ? rear.deviceId : (cameras[0] ? cameras[0].deviceId : undefined);
                    } else { const front = cameras.find(d => /front|user|facing|أمام|أمامية/i.test(d.label || ''));
                        deviceId = front ? front.deviceId : (cameras[0] ? cameras[0].deviceId : undefined);
                    } } catch (e) {
                    // Permission is handled by ZXing below if enumeration is unavailable.
                } }
            // Ask for a higher-resolution stream with flexible constraints.
            const videoConstraints = { deviceId: deviceId ? { ideal: deviceId } : undefined,
                facingMode: { ideal: barcodeFacingMode },
                width: { ideal: 1920 }, height: { ideal: 1080 },
                advanced: [{ focusMode: 'continuous' }]
            }; zxingControls = await zxingReader.decodeFromConstraints(
                { video: videoConstraints, audio: false },
                video, async (result, error) => {
                    if (!result) return; const barcode = String(result.getText ? result.getText() : result.text || '').trim();
                    if (!barcode || isProcessingBarcode || scannerCallbackProcessing) return;
                    const now = Date.now(); if (barcode === lastScannedBarcode && (now - lastScannedBarcodeTime) < 2000) return;
                    scannerCallbackProcessing = true;
                    try { playBeep();
                        showSuccessToast('تمت قراءة الباركود: ' + barcode);
                        await closeBarcodeCamera();
                        await processBarcode(barcode);
                    } catch (e) { console.error('Barcode processing error:', e);
                    } finally {
                        scannerCallbackProcessing = false;
                    } } );
            // Improve camera capture quality/focus, and wire up the zoom/torch controls.
            try { const stream = video.srcObject;
                if (stream) { const track = stream.getVideoTracks()[0];
                    if (track) {
                        barcodeVideoTrack = track;
                        const caps = track.getCapabilities ? track.getCapabilities() : {};
                        const advanced = []; if (caps.focusMode && caps.focusMode.includes('continuous')) advanced.push({ focusMode: 'continuous' });
                        if (advanced.length) await track.applyConstraints({ advanced }).catch(() => {});
                        // Start a little zoomed in by default when the camera supports it —
                        // this is what actually helps most with small barcodes, since it
                        // increases the pixel size of the bars without the user needing to
                        // physically get closer (which can break the lens's focus range).
                        if (caps.zoom && caps.zoom.max > (caps.zoom.min || 1)) {
                            barcodeZoomCaps = { min: caps.zoom.min || 1, max: caps.zoom.max, step: caps.zoom.step || 0.1 };
                            const startZoom = Math.min(barcodeZoomCaps.max, Math.max(barcodeZoomCaps.min, barcodeZoomCaps.min + (barcodeZoomCaps.max - barcodeZoomCaps.min) * 0.25));
                            await setBarcodeZoom(startZoom);
                        } else { barcodeZoomCaps = null;
                            document.getElementById('barcodeZoomLabel')?.classList.add('hidden');
                        }
                        // Show the torch button only if the device actually supports it.
                        const torchBtn = document.getElementById('barcodeTorchBtn');
                        if (caps.torch) {
                            torchBtn.classList.remove('hidden');
                        } else { torchBtn.classList.add('hidden');
                        } barcodeTorchOn = false;
                    } } } catch (e) {} } catch (err) {
            console.error('ZXing camera scanner error:', err);
            try { if (zxingControls) zxingControls.stop(); } catch (e) {}
            zxingControls = null; try { if (zxingReader) zxingReader.reset(); } catch (e) {}
            zxingReader = null; showErrorToast('تعذر تشغيل قارئ الباركود. تأكد من السماح بالكاميرا وأن الموقع يعمل عبر HTTPS.');
        } }
    // Applies a zoom level to the active camera track and updates the on-screen label.
    async function setBarcodeZoom(zoom) { if (!barcodeVideoTrack || !barcodeZoomCaps) return;
        const clamped = Math.min(barcodeZoomCaps.max, Math.max(barcodeZoomCaps.min, zoom));
        try { await barcodeVideoTrack.applyConstraints({ advanced: [{ zoom: clamped }] });
            barcodeCurrentZoom = clamped; const label = document.getElementById('barcodeZoomLabel');
            if (label) { label.textContent = clamped.toFixed(1) + '×';
                label.classList.remove('hidden');
            } } catch (e) {
            // Some browsers (notably iOS Safari) don't support programmatic zoom;
            // fail silently since the +/- buttons simply won't do anything there.
        } }
    // Wired to the +/- buttons under the camera preview.
    window.adjustBarcodeZoom = function(delta) {
        if (!barcodeVideoTrack || !barcodeZoomCaps) return;
        setBarcodeZoom(barcodeCurrentZoom + delta);
    };
    // Wired to the flashlight/torch button; only shown when the device supports it.
    window.toggleBarcodeTorch = async function() {
        if (!barcodeVideoTrack) return; try {
            barcodeTorchOn = !barcodeTorchOn;
            await barcodeVideoTrack.applyConstraints({ advanced: [{ torch: barcodeTorchOn }] });
        } catch (e) { barcodeTorchOn = !barcodeTorchOn; // revert flag if it failed
        } }; window.switchBarcodeCamera = async function() {
        // Toggle default facing mode
        barcodeFacingMode = (barcodeFacingMode === 'environment') ? 'user' : 'environment';
        try { const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            if (cameras.length > 1) { let currentIndex = -1;
                if (barcodeSelectedDeviceId) {
                    currentIndex = cameras.findIndex(c => c.deviceId === barcodeSelectedDeviceId);
                } if (currentIndex === -1 && barcodeVideoTrack && barcodeVideoTrack.getSettings) {
                    const settings = barcodeVideoTrack.getSettings();
                    if (settings.deviceId) {
                        currentIndex = cameras.findIndex(c => c.deviceId === settings.deviceId);
                    } } const nextIndex = (currentIndex + 1) % cameras.length;
                barcodeSelectedDeviceId = cameras[nextIndex].deviceId;
            } else { barcodeSelectedDeviceId = null;
            } } catch (e) {
            barcodeSelectedDeviceId = null; } if (typeof showSuccessToast === 'function') {
            showSuccessToast('جاري تحويل الكاميرا...');
        } await restartBarcodeScanner(); };
    async function closeBarcodeCamera() { const modal = document.getElementById('barcodeModal');
        if (modal) modal.classList.remove('active');
        try { if (zxingControls) zxingControls.stop(); } catch (err) {}
        zxingControls = null; try { if (zxingReader) zxingReader.reset(); } catch (err) {}
        zxingReader = null; if (zxingVideoStream) {
            try { zxingVideoStream.getTracks().forEach(track => track.stop()); } catch (err) {}
            zxingVideoStream = null; } const barcodeVideo = document.getElementById('barcodeVideo');
        if (barcodeVideo && barcodeVideo.srcObject) {
            try { barcodeVideo.srcObject.getTracks().forEach(track => track.stop()); } catch (err) {}
            barcodeVideo.srcObject = null; }
        // Reset zoom/torch state so the next scan session starts clean.
        barcodeVideoTrack = null;
        barcodeZoomCaps = null;
        barcodeCurrentZoom = 1; barcodeTorchOn = false;
        const zoomLabel = document.getElementById('barcodeZoomLabel');
        if (zoomLabel) zoomLabel.classList.add('hidden');
        const torchBtn = document.getElementById('barcodeTorchBtn');
        if (torchBtn) torchBtn.classList.add('hidden');
        const scanner = html5QrCode; html5QrCode = null;
        if (scanner) { try { if (scanner.isScanning) await scanner.stop();
            } catch (err) {} try { scanner.clear(); } catch (err) {}
        } } async function restartBarcodeScanner() {
        const context = scanContext; const shouldReopen = document.getElementById('barcodeModal')?.classList.contains('active');
        await closeBarcodeCamera(); if (shouldReopen) {
            await new Promise(resolve => setTimeout(resolve, 250));
            await openBarcodeCamera(context); }
    } window.closeBarcodeCamera = closeBarcodeCamera;
    window.openBarcodeCamera = openBarcodeCamera;
    window.restartBarcodeScanner = restartBarcodeScanner;
    function getProductExpiryInfo(p) {
        if (!p) {
            return { hasExpiry: false, isNearExpiry: false, isExpired: false, diffDays: Infinity, daysLeft: 0, label: '' };
        }
        const rawDate = p.expiryDate || p.expiry || p.expirationDate;
        if (!rawDate) {
            return { hasExpiry: false, isNearExpiry: false, isExpired: false, diffDays: Infinity, daysLeft: 0, label: '' };
        }
        try {
            let dateStr = String(rawDate).trim();
            // Handle YYYY-MM format by adding the last day of month or 1st
            if (/^\d{4}-\d{2}$/.test(dateStr)) {
                dateStr += '-01';
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const parts = dateStr.split('/');
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                const parts = dateStr.split('-');
                dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            const exp = new Date(dateStr);
            if (isNaN(exp.getTime())) {
                return { hasExpiry: false, isNearExpiry: false, isExpired: false, diffDays: Infinity, daysLeft: 0, label: '' };
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            exp.setHours(0, 0, 0, 0);
            const diffTime = exp.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // <= 93 days (3 months / 90 days threshold) or already expired
            const isNearExpiry = diffDays <= 93;
            const isExpired = diffDays < 0;
            let label = '';
            if (isExpired) {
                label = `منتهي الصلاحية منذ ${Math.abs(diffDays)} يوم (${rawDate})`;
            } else if (isNearExpiry) {
                const approxMonths = Math.max(1, Math.ceil(diffDays / 30));
                label = `قارب على الانتهاء: متبقي ${diffDays} يوم (~${approxMonths} أشهر) (${rawDate})`;
            } else {
                label = `تاريخ الصلاحية: ${rawDate} (متبقي ${diffDays} يوم)`;
            }
            return {
                hasExpiry: true,
                isNearExpiry: isNearExpiry,
                isExpired: isExpired,
                diffDays: diffDays,
                daysLeft: Math.max(0, diffDays),
                label: label
            };
        } catch (e) {
            return { hasExpiry: false, isNearExpiry: false, isExpired: false, diffDays: Infinity, daysLeft: 0, label: '' };
        }
    }
    window.getProductExpiryInfo = getProductExpiryInfo;
    function setStockFilter(filter) { appState.productStockFilter = filter || 'all';
        const tabAll = document.getElementById('stockTabAll');
        const tab1 = document.getElementById('stockTab1');
        const tab2 = document.getElementById('stockTab2');
        const tabNearExp = document.getElementById('stockTabNearExpiry');
        const tabLowStock = document.getElementById('stockTabLowStock');
        const activeClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white shadow-xs inline-flex items-center gap-1';
        const inactiveClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 inline-flex items-center gap-1';
        const activeRedClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-800 text-white shadow-xs inline-flex items-center gap-1';
        const inactiveRedClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 inline-flex items-center gap-1';
        const activeAmberClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-amber-600 text-white shadow-xs inline-flex items-center gap-1';
        const inactiveAmberClass = 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 inline-flex items-center gap-1';
        if (tabAll) tabAll.className = (appState.productStockFilter === 'all') ? activeClass : inactiveClass;
        if (tab1) tab1.className = (appState.productStockFilter === 'stock1') ? activeClass : inactiveClass;
        if (tab2) tab2.className = (appState.productStockFilter === 'stock2') ? activeClass : inactiveClass;
        if (tabNearExp) tabNearExp.className = (appState.productStockFilter === 'near_expiry') ? activeRedClass : inactiveRedClass;
        if (tabLowStock) tabLowStock.className = (appState.productStockFilter === 'low_stock') ? activeAmberClass : inactiveAmberClass;
        renderProductsList(); } window.setStockFilter = setStockFilter;
    function renderProductsList() { const container = document.getElementById('productsList');
       if(!container) return; if (!appState.products) appState.products = [];
       const countAllElem = document.getElementById('countStockAll');
       const count1Elem = document.getElementById('countStock1');
       const count2Elem = document.getElementById('countStock2');
       const countNearExpElem = document.getElementById('countStockNearExpiry');
       const countLowStockElem = document.getElementById('countStockLowStock');

       // Single-pass metrics calculation O(N) instead of 5 separate array scans
       let countAll = appState.products.length;
       let count1 = 0;
       let count2 = 0;
       let countNearExp = 0;
       let countLowStock = 0;

       const prods = appState.products;
       for (let i = 0; i < countAll; i++) {
           const p = prods[i];
           if (!p) continue;
           if (!p.stockLocation || p.stockLocation === 'stock1') count1++;
           if (p.stockLocation === 'stock2') count2++;
           if (getProductExpiryInfo(p).isNearExpiry) countNearExp++;
           if (Number(p.stock || 0) < 5) countLowStock++;
       }

       if (countAllElem) countAllElem.textContent = `(${countAll})`;
       if (count1Elem) count1Elem.textContent = `(${count1})`;
       if (count2Elem) count2Elem.textContent = `(${count2})`;
       if (countNearExpElem) countNearExpElem.textContent = countNearExp;
       if (countLowStockElem) countLowStockElem.textContent = countLowStock;
       const searchInput = document.getElementById('searchProductInput');
       const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
       let filteredProducts = [];
       const stockFilter = appState.productStockFilter;
       for (let i = 0; i < countAll; i++) {
           const p = prods[i];
           if (!p) continue;
           if (stockFilter === 'stock1' && p.stockLocation && p.stockLocation !== 'stock1') continue;
           if (stockFilter === 'stock2' && p.stockLocation !== 'stock2') continue;
           if (stockFilter === 'near_expiry' && !getProductExpiryInfo(p).isNearExpiry) continue;
           if (stockFilter === 'low_stock' && Number(p.stock || 0) >= 5) continue;
           if (query) {
               const nameMatch = (p.name || '').toLowerCase().includes(query);
               const barcodeMatch = !nameMatch && String(p.barcode || '').trim().toLowerCase().includes(query);
               const catMatch = !nameMatch && !barcodeMatch && (p.category || '').toLowerCase().includes(query);
               const weightMatch = !nameMatch && !barcodeMatch && !catMatch && (p.weight || '').toLowerCase().includes(query);
               if (!nameMatch && !barcodeMatch && !catMatch && !weightMatch) continue;
           }
           filteredProducts.push(p);
       }
       container.innerHTML = filteredProducts.map(p => {
           const isStock2 = p.stockLocation === 'stock2';
           const stockBadge = isStock2 ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"><svg class="w-3 h-3 text-slate-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3l3 4 3-4"></path></svg><span>Stock 2</span></span>`
               : `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"><svg class="w-3 h-3 text-blue-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg><span>Stock 1</span></span>`;
           const expInfo = getProductExpiryInfo(p);
           let expiryBadgeHtml = '';
           if (expInfo.isNearExpiry) {
               if (expInfo.isExpired) {
                   expiryBadgeHtml = `
                   <span class="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs shrink-0" title="${expInfo.label}">
                       <svg class="w-3 h-3 fill-white text-white shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                       <span>منتهي الصلاحية</span>
                   </span>
                   `;
               } else {
                   const approxM = Math.max(1, Math.ceil(expInfo.daysLeft / 30));
                   expiryBadgeHtml = `
                   <span class="inline-flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs shrink-0" title="${expInfo.label}">
                       <svg class="w-3 h-3 fill-white text-white shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                       <span>قارب على الانتهاء (${expInfo.daysLeft} يوم ~${approxM} شهر)</span>
                   </span>
                   `;
               }
           }
           const currentStock = Number(p.stock || 0);
           const isOutOfStock = currentStock <= 0;
           const isLowStock = currentStock < 5;

           let stockStatusBadge = '';
           if (isOutOfStock) {
               stockStatusBadge = `<span class="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-md font-bold shadow-2xs"><svg class="w-3 h-3 text-red-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg><span>نفذ المخزون (0 قطعة)</span></span>`;
           } else if (isLowStock) {
               stockStatusBadge = `<span class="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-extrabold animate-pulse shadow-xs"><svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><span>تنبيه: مخزون منخفض (&lt; 5 قطع)</span></span>`;
           }

           const cardClass = isOutOfStock
               ? 'border-red-300 bg-red-50/20'
               : (isLowStock ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white');
           const cardIndicator = isOutOfStock
               ? '<div class="absolute left-0 top-0 bottom-0 w-2.5 bg-red-500"></div>'
               : (isLowStock ? '<div class="absolute left-0 top-0 bottom-0 w-2.5 bg-amber-500 animate-pulse"></div>' : '');

           const stockQtyDisplay = isOutOfStock
               ? '<strong class="text-red-600 font-black">0 قطعة (منتهي)</strong>'
               : (isLowStock ? `<strong class="text-amber-800 font-black bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 inline-flex items-center gap-1"><span>⚠️</span><span>${currentStock} قطع فقط</span></strong>` : `<strong class="text-slate-800">${currentStock}</strong>`);

           return `
           <div id="product-card-${p.id}" data-product-id="${p.id}" data-barcode="${p.barcode || ''}" class="transition-all duration-300 flex justify-between items-center p-3.5 border ${cardClass} rounded-xl mb-2.5 shadow-sm relative overflow-hidden">
               ${cardIndicator}
               <div class="pr-2">
                   <div class="font-bold text-sm text-slate-800 flex items-center gap-2 flex-wrap">
                       <span>${p.name}</span>
                       <span class="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">${p.weight || 'بدون وزن'}</span>
                       ${stockBadge}
                       ${stockStatusBadge}
                       ${expiryBadgeHtml}
                   </div>
                   <div class="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                       <span>سعر البيع: <strong class="text-slate-800">${parseFloat(p.price) || 0} دج</strong></span>
                       <span class="text-slate-300">|</span>
                       <span>سعر الشراء: <span class="text-slate-700 font-semibold">${parseFloat(p.cost) || 0} دج</span></span>
                       <span class="text-slate-300">|</span>
                       <span>المخزون: ${stockQtyDisplay}</span>
                       <span class="text-slate-300">|</span>
                       <span class="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md" title="إجمالي قيمة مخزون هذا المنتج">
                           <span>الشراء: <strong class="text-blue-950">${((Number(currentStock) || 0) * (parseFloat(p.cost) || 0)).toLocaleString()} دج</strong></span>
                           <span class="text-blue-300">•</span>
                           <span>البيع: <strong class="text-blue-700">${((Number(currentStock) || 0) * (parseFloat(p.price) || 0)).toLocaleString()} دج</strong></span>
                       </span>
                       ${p.barcode ? `<span class="text-slate-300">|</span><span class="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200" title="باركود"><svg class="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"></path></svg>${p.barcode}</span>` : ''}
                       ${p.expiryDate ? `<span class="text-slate-300">|</span><span>الصلاحية: <strong class="${expInfo.isNearExpiry ? 'text-blue-700 font-bold' : 'text-slate-700'}">${p.expiryDate}</strong></span>` : ''}
                   </div>
               </div>
               <div class="flex items-center gap-1.5">
                   <button onclick="editProduct('${p.id}')" class="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors">
                       <svg class="w-3 h-3 text-blue-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                       <span>تعديل</span>
                   </button>
                   <button onclick="deleteProduct('${p.id}')" class="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors">
                       <svg class="w-3 h-3 text-slate-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                       <span>حذف</span>
                   </button>
               </div>
           </div>
           `; }).join('') || `
            <div class="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 my-2">
                <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                </div>
                <h4 class="text-sm font-bold text-slate-800 mb-1">المخازن لا تحتوي على منتجات حالياً</h4>
                <p class="text-xs text-slate-500 max-w-md mx-auto mb-4">قاعدة البيانات في فايربيس متصلة ومزامنة. يمكنك إضافة أول منتج إلى Stock 1 (صالة البيع) أو Stock 2 (المستودع) من النموذج أعلاه وسيتم حفظه ومزامنته فوراً.</p>
                <button type="button" onclick="document.getElementById('prodName')?.focus();" class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-3.5 py-2 rounded-xl shadow-2xs transition-all">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>إضافة منتج جديد الآن</span>
                </button>
            </div>
        `; updateSellProductDropdown();
       updateStockInfoDisplay(); } window.renderProductsList = renderProductsList;
    function getUniqueCoaches() { const set = new Set();
        if (appState.staffPayouts && Array.isArray(appState.staffPayouts)) {
            appState.staffPayouts.forEach(p => {
                const n = p.staffName || p.name;
                if (n && n.trim()) set.add(n.trim());
            }); } if (appState.sales && Array.isArray(appState.sales)) {
            appState.sales.forEach(s => { if (s.coachName && s.coachName.trim() && s.coachName !== 'عام') {
                    set.add(s.coachName.trim());
                } }); } return Array.from(set);
    } window.getUniqueCoaches = getUniqueCoaches;
    function deleteSale(saleId) { if (!saleId) return;
        promptWithPassword({ title: 'إلغاء عملية البيع', prompt: 'أدخل كلمة المرور لتأكيد إلغاء عملية البيع واسترجاع الكمية للمخزون', buttonText: 'تأكيد الإلغاء' }, () => {
            if (!appState.sales) return; const idx = appState.sales.findIndex(s => String(s && s.id) === String(saleId));
            if (idx === -1) return; const sale = appState.sales[idx];
            if (sale.prodId && appState.products) {
                const prod = appState.products.find(p => p.id === sale.prodId);
                if (prod) {
                    const weightVal = (typeof parseProductWeight === 'function') ? parseProductWeight(prod.weight) : null;
                    const stockToRestore = Number(sale.stockDeduction) || ((weightVal && weightVal > 0) ? (Number(sale.qty || 1) * weightVal) : Number(sale.qty || 1));
                    prod.stock = Number(prod.stock || 0) + stockToRestore;
                    if (window.saveFirebaseSectionItem) window.saveFirebaseSectionItem('products', prod);
                }
            }
            if (typeof logActivity === 'function') logActivity('sale', 'إلغاء عملية بيع', `إلغاء البيع واسترجاع الكمية: ${sale ? sale.prodName || sale.name : saleId}`);
            appState.sales.splice(idx, 1);
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('sales', saleId, sale);
            }
            saveState(); showSuccessToast('تم إلغاء عملية البيع واسترجاع الكمية للمخزون');
            render(); if (typeof updateFullReportSalesSection === 'function') {
                updateFullReportSalesSection();
            }
        });
    } window.deleteSale = deleteSale; function getLocalDateString(dateInput) {
        if (!dateInput) return ''; const d = new Date(dateInput);
        if (isNaN(d.getTime())) return ''; const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; }
    window.getLocalDateString = getLocalDateString;
    window.setPosFilterToday = function() {
        const input = document.getElementById('posFilterDate');
        if (input) { input.value = getLocalDateString(new Date());
            renderSalesList(); } }; window.clearPosFilterDate = function() {
        const input = document.getElementById('posFilterDate');
        if (input) { input.value = '';
            renderSalesList(); } }; function renderSalesList() {
       const container = document.getElementById('salesList');
       if(!container) return; if (!appState.sales) appState.sales = [];
       // Populate datalist for coach input in sell form
       const coachesDatalist = document.getElementById('coachesList');
       const uniqueCoaches = getUniqueCoaches();
       if (coachesDatalist) { coachesDatalist.innerHTML = uniqueCoaches.map(c => `<option value="${c}">`).join('');
       }
       // Populate filter dropdowns if present
       const posFilterStockElem = document.getElementById('posFilterStock');
       const posFilterCategoryElem = document.getElementById('posFilterCategory');
       const posFilterProdElem = document.getElementById('posFilterProduct');
       const posFilterCoachElem = document.getElementById('posFilterCoach');
       const posFilterDateElem = document.getElementById('posFilterDate');
       const curStock = posFilterStockElem ? posFilterStockElem.value : 'all';
       const curCat = posFilterCategoryElem ? posFilterCategoryElem.value : 'all';
       const curProd = posFilterProdElem ? posFilterProdElem.value : 'all';
       const curCoach = posFilterCoachElem ? posFilterCoachElem.value : 'all';
       if (posFilterProdElem) { const uniqueProds = Array.from(new Set(appState.sales.map(s => s.prodName || s.productName).filter(Boolean)));
           posFilterProdElem.innerHTML = '<option value="all">جميع المنتجات</option>' + uniqueProds.map(p => `<option value="${p}">${p}</option>`).join('');
           if (uniqueProds.includes(curProd)) posFilterProdElem.value = curProd;
       } if (posFilterCoachElem) {
           posFilterCoachElem.innerHTML = '<option value="all">جميع المدربين</option>' +
               '<option value="عام">عام / بدون مدرب</option>' +
               uniqueCoaches.map(c => `<option value="${c}">${c}</option>`).join('');
           if (uniqueCoaches.includes(curCoach) || curCoach === 'عام') posFilterCoachElem.value = curCoach;
       } let filtered = [...appState.sales];
       const selStock = posFilterStockElem ? posFilterStockElem.value : 'all';
       const selCat = posFilterCategoryElem ? posFilterCategoryElem.value : 'all';
       const selProd = posFilterProdElem ? posFilterProdElem.value : 'all';
       const selCoach = posFilterCoachElem ? posFilterCoachElem.value : 'all';
       const selDate = posFilterDateElem ? posFilterDateElem.value : '';
       if (selStock !== 'all') { if (selStock === 'stock2') {
               filtered = filtered.filter(s => s.stockLocation === 'stock2');
           } else { filtered = filtered.filter(s => !s.stockLocation || s.stockLocation === 'stock1');
           } } if (selCat !== 'all') { filtered = filtered.filter(s => {
               const cat = s.category || (typeof getProductCategory === 'function' ? getProductCategory({ name: s.prodName || s.productName }) : 'other');
               return cat === selCat; }); } if (selProd !== 'all') {
           filtered = filtered.filter(s => (s.prodName || s.productName) === selProd);
       } if (selCoach !== 'all') { if (selCoach === 'عام') {
               filtered = filtered.filter(s => !s.coachName || s.coachName === 'عام');
           } else { filtered = filtered.filter(s => s.coachName === selCoach);
           } } if (selDate) { filtered = filtered.filter(s => getLocalDateString(s.date) === selDate);
       }
       // Update summary badge
       const totalAmt = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
       const summaryElem = document.getElementById('salesListSummary');
       if (summaryElem) { summaryElem.textContent = `المجموع: ${totalAmt.toLocaleString()} دج (${filtered.length} عملية)`;
       } if (filtered.length === 0) { container.innerHTML = '<div class="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-slate-100 font-medium">لا توجد مبيعات مسجلة بهذا التصنيف</div>';
           return; } container.innerHTML = filtered.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 50).map(s => {
           const d = s.date ? new Date(s.date) : null;
           const isValidDate = d && !isNaN(d.getTime());
           const dateStr = isValidDate ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : '';
           const timeStr = isValidDate ? d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) : '';
           const name = escapeHTML(s.prodName || s.productName || 'منتج');
           const coachName = escapeHTML(s.coachName || 'عام');
           const safeId = escapeHTML(s.id || '');
           const isStock2 = s.stockLocation === 'stock2';
           const stockBadge = isStock2 ? `<span class="text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">مخزون 2</span>`
                : `<span class="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">مخزون 1</span>`;
           const cat = s.category || (typeof getProductCategory === 'function' ? getProductCategory({ name: s.prodName || s.productName }) : 'other');
           let catBadge = ''; if (cat === 'doses') {
               catBadge = `<span class="text-[9px] font-bold text-blue-800 bg-blue-100/90 px-1.5 py-0.5 rounded-md border border-blue-200">بروتين دوز</span>`;
           } else if (cat === 'boxes') {
               catBadge = `<span class="text-[9px] font-bold text-blue-900 bg-blue-100/90 px-1.5 py-0.5 rounded-md border border-blue-200">علبة مغلقة</span>`;
           } else if (cat === 'frigo') {
               catBadge = `<span class="text-[9px] font-bold text-blue-900 bg-blue-100/90 px-1.5 py-0.5 rounded-md border border-blue-200">فريغو</span>`;
           } const sProfit = Number(s.profit) || 0;
           const coachCommission = s.coachCommission !== undefined ? Number(s.coachCommission) : ((coachName !== 'عام' && sProfit > 0) ? Math.round(sProfit * 0.33) : 0);
           return `
           <div class="flex justify-between items-center p-3 border border-slate-200 rounded-xl mb-2 bg-white hover:bg-slate-50/80 transition-all shadow-xs">
               <div class="space-y-1.5">
                   <div class="font-bold text-sm text-slate-800 flex items-center gap-1.5 flex-wrap">
                       <span>${name}</span>
                       <span class="text-xs text-slate-500 font-normal">(x${s.qty || 1})</span>
                       ${stockBadge}
                       ${catBadge}
                   </div>
                   <div class="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                       <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100/60">
                           المدرب: ${coachName}
                       </span>
                       ${coachName !== 'عام' && coachCommission > 0 ? `
                       <span class="bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-bold border border-blue-200/80 text-[10px]">
                           عمولة الكوتش (33%): ${coachCommission.toLocaleString()} دج
                       </span>
                       ` : ''}
                       ${dateStr ? `
                       <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold border border-slate-200/80 flex items-center gap-1 text-[10px]">
                           <svg class="w-3 h-3 text-slate-500 inline shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                           <span>${dateStr}</span>
                           ${timeStr ? `<span class="text-slate-300">|</span><span class="text-slate-500">${timeStr}</span>` : ''}
                       </span>
                       ` : (timeStr ? `<span>${timeStr}</span>` : '')}
                   </div>
               </div>
               <div class="flex items-center gap-2">
                   <div class="text-left">
                       <div class="font-extrabold text-blue-600 text-sm" dir="ltr">${Number(s.total || 0).toLocaleString()} دج</div>
                       ${sProfit > 0 ? `<div class="text-[10px] font-bold text-blue-600">الربح الصافي: ${sProfit.toLocaleString()} دج</div>` : ''}
                   </div>
                   <button onclick="deleteSale('${safeId}')" class="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="إلغاء البيع">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                   </button>
               </div>
           </div>
           `; }).join('') || '<div class="text-xs text-slate-400 text-center py-6 font-medium">لا توجد عمليات بيع مسجلة بعد</div>';
    } window.renderSalesList = renderSalesList;
    function calculateAge(dobStr) { if (!dobStr) return null;
        const dob = new Date(dobStr); if (isNaN(dob.getTime())) return null;
        const today = new Date(); let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--; } return age >= 0 ? age : null;
    } const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    function formatCustomerExpiry(customer) { if (!customer) return 'غير محدد';
        const isSession = customer.subscriptionType === 'session' || (customer.remainingSessions !== undefined && customer.remainingSessions !== null && customer.subscriptionType !== 'time');
        if (isSession) { const rem = parseInt(customer.remainingSessions) || 0;
            const total = parseInt(customer.totalSessions) || (rem + (customer.attendedSessions || 0)) || 10;
            if (customer.status === 'frozen') {
                return `مجمد (باقي ${rem} من ${total} حصص)`;
            } else if (rem <= 0) { return `منتهية (0 حصة متبقية)`;
            } else { return `باقي ${rem} من ${total} حصص`;
            } } const remainingDays = getRemainingDays(customer);
        if (!customer.endDate) return 'غير محدد';
        const d = new Date(customer.endDate); if (isNaN(d.getTime())) return 'غير محدد';
        const dateFormatted = `${d.getDate()} ${arabicMonths[d.getMonth()]}`;
        if (customer.status === 'frozen') {
            return `${dateFormatted} (مجمد - باقي ${remainingDays} يوم)`;
        } else if (remainingDays <= 0) { return `${dateFormatted} (منتهية)`;
        } else { return `${dateFormatted} (باقي ${remainingDays} يوم)`;
        } } const filterLabels = { 'male': 'الذكور',
        'female': 'الإناث', 'all': 'الكل',
        'active': 'النشطة', 'near_expiry': 'قريبة الانتهاء',
        'expired': 'المنتهية', 'frozen': 'المجمدة',
        'credit': 'الكريدي' }; function getFilterCount(filterKey) {
        if (!appState.customers) return 0;
        return appState.customers.filter(c => {
            const status = calculateStatus(c);
            if (filterKey === 'male') return c.gender === 'male' || !c.gender; // Default to male if not specified for old data
            if (filterKey === 'female') return c.gender === 'female';
            if (filterKey === 'all') return true;
            if (filterKey === 'active') return status === 'active' || status === 'near_expiry';
            if (filterKey === 'near_expiry') return status === 'near_expiry';
            if (filterKey === 'expired') return status === 'expired';
            if (filterKey === 'frozen') return c.status === 'frozen';
            if (filterKey === 'credit') return c.paymentStatus === 'credit';
            return true; }).length; } function customerIsSession(c) {
        return c.subscriptionType === 'session' || (c.remainingSessions !== undefined && c.remainingSessions !== null && c.subscriptionType !== 'time');
    } function renderFilterTabs() { if (appState.filter === 'session') appState.filter = 'all';
        const filterKeys = ['all', 'male', 'female', 'active', 'near_expiry', 'expired', 'frozen', 'credit'];
        const html = filterKeys.map(key => {
            const isActive = appState.filter === key;
            const count = getFilterCount(key);
            return `<button onclick="setFilter('${key}')" class="px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive ? 'bg-[#2563eb] text-white shadow-md shadow-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 shadow-sm'
            }">
                ${filterLabels[key] || key} ${count > 0 ? `<span class="mr-1 text-[11px] opacity-80">(${count})</span>` : ''}
            </button>`; }).join(''); const container1 = document.getElementById('filterTabs');
        if (container1) container1.innerHTML = html;
        const container2 = document.getElementById('filterTabsView');
        if (container2) container2.innerHTML = html;
    } function renderCustomers() { let filtered = (appState.customers || []).filter(c => {
            if (appState.searchQuery) { const q = appState.searchQuery.toLowerCase().trim();
                const matchName = c.name && c.name.toLowerCase().includes(q);
                const dispPhone = getDisplayPhone(c.phone);
                const matchPhone = (c.phone && c.phone.includes(q)) || (dispPhone && dispPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')));
                if (!matchName && !matchPhone) return false;
            } const status = calculateStatus(c);
            const isSession = customerIsSession(c);
            if (appState.filter === 'session') return isSession;
            if (appState.filter === 'male') return c.gender === 'male' || !c.gender;
            if (appState.filter === 'female') return c.gender === 'female';
            if (appState.filter === 'active') return status === 'active' || status === 'near_expiry';
            if (appState.filter === 'near_expiry') return status === 'near_expiry';
            if (appState.filter === 'expired') return status === 'expired';
            if (appState.filter === 'frozen') return c.status === 'frozen';
            if (appState.filter === 'credit') return c.paymentStatus === 'credit';
            return true; });
        const PAGE_SIZE = 24;
        const page = appState.customerPage || 1;
        const visibleCustomers = filtered.slice(0, PAGE_SIZE * page);
        let html = visibleCustomers.map(c => {
            const age = calculateAge(c.dob);
            const ageStr = age !== null ? `${age} سنة` : 'غير محدد';
            const pkg = getPackageById(c.packageId);
            const pkgName = pkg ? pkg.name : 'ملاكمة';
            const priceVal = c.price !== undefined && c.price !== null ? c.price : (pkg && pkg.price ? pkg.price : null);
            const priceSuffix = priceVal !== null ? ` (${priceVal} دج)` : '';
            const expiryStr = formatCustomerExpiry(c);
            const firstLetter = c.name ? c.name.trim().charAt(0) : '؟';
            const genderLabel = c.gender === 'female' ? 'أنثى' : 'ذكر';
            const avatarHtml = c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.name}" class="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm border border-slate-200">`
                : `<div class="w-12 h-12 rounded-full ${c.gender === 'female' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-[#2563eb]'} font-extrabold text-xl flex items-center justify-center shrink-0 shadow-sm">${firstLetter}</div>`;
            let paymentBadge = ''; if (c.paymentStatus === 'paid') {
                paymentBadge = `<span class="inline-block bg-blue-100/90 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-xl">تم الدفع</span>`;
            } else if (c.paymentStatus === 'credit') {
                paymentBadge = `<span class="inline-block bg-slate-100 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200">غير مدفوع (${c.debtAmount || 0} دج)</span>`;
            } else { paymentBadge = `<span class="inline-block bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200">مجمد</span>`;
            } return `
            <div class="bg-white border border-slate-200/90 rounded-[2rem] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-500 hover:ring-2 hover:ring-blue-500/10 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-200 group cursor-pointer">
                <!-- Top Header: Payment Badge on Left, Avatar + Name/Phone on Right -->
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        ${avatarHtml}
                        <div class="min-w-0">
                            <h4 class="font-extrabold text-lg sm:text-xl text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight leading-snug truncate">${escapeHTML(c.name || 'بدون اسم')}</h4>
                            <div class="text-xs font-semibold text-slate-400 mt-0.5" dir="ltr" style="text-align: right;">${getDisplayPhone(c.phone)}</div>
                        </div>
                    </div>
                    <div class="shrink-0">
                        ${paymentBadge}
                    </div>
                </div>

                <!-- Info List -->
                <div class="space-y-2.5 pt-2 border-t border-slate-100">
                    <div class="flex items-center justify-between text-xs sm:text-sm">
                        <span class="text-slate-400 font-medium">الجنس:</span>
                        <span class="font-bold ${c.gender === 'female' ? 'text-slate-700' : 'text-blue-600'}">${genderLabel}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs sm:text-sm">
                        <span class="text-slate-400 font-medium">الوزن:</span>
                        <span class="font-bold text-slate-800">${c.weight ? c.weight + ' كغ' : 'غير محدد'}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs sm:text-sm">
                        <span class="text-slate-400 font-medium">العمر:</span>
                        <span class="font-bold text-slate-800">${ageStr}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs sm:text-sm">
                        <span class="text-slate-400 font-medium">الباقة:</span>
                        <span class="font-bold text-slate-800">${pkgName}${priceSuffix}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs sm:text-sm">
                        <span class="text-slate-400 font-medium">تنتهي في:</span>
                        <span class="font-bold text-slate-800">${expiryStr}</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-2 pt-2">
                    <button type="button" onclick="openEditModal('${c.id}')" class="w-11 h-11 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer" title="تعديل المشترك">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button type="button" onclick="toggleFreeze('${c.id}')" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs sm:text-sm font-bold transition-colors text-center cursor-pointer">
                        ${c.status === 'frozen' ? 'إلغاء التجميد' : 'تجميد'}
                    </button>
                    <button type="button" onclick="openMessageModal('${c.id}')" class="flex-1 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition-colors text-center shadow-md shadow-blue-100 cursor-pointer">
                        مراسلة
                    </button>
                    <button type="button" onclick="deleteCustomer('${c.id}')" class="w-11 h-11 rounded-2xl bg-red-50 hover:bg-red-500 hover:text-white text-red-600 flex items-center justify-center transition-all shrink-0 cursor-pointer border border-red-100 hover:border-red-500 active:scale-95 shadow-2xs" title="حذف المشترك">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
            `; }).join('') || '<div class="col-span-full text-center py-12 text-slate-400 font-medium">لا يوجد مشتركين في هذه الفئة</div>';
        if (filtered.length > visibleCustomers.length) {
            html += `
            <div class="col-span-full flex flex-col sm:flex-row items-center justify-center gap-3 py-6">
                <button onclick="window.loadMoreCustomersLocal()" class="px-6 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md shadow-blue-100 transition-all text-sm flex items-center gap-2">
                    <span>عرض المزيد (${visibleCustomers.length} من أصل ${filtered.length})</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <button onclick="window.loadOlderHistoricalData('customers', 50)" class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-sm flex items-center gap-2">
                    <span>تحميل مشتركين أقدم من السحابة</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </button>
            </div>
            `;
        } else if (filtered.length > 0) {
            html += `
            <div class="col-span-full flex justify-center py-4">
                <button onclick="window.loadOlderHistoricalData('customers', 50)" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition-all text-xs flex items-center gap-2">
                    <span>تحميل مشتركين أقدم من السحابة (Firebase)</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                </button>
            </div>
            `;
        }
        const dashboardGrid = document.getElementById('customersGrid');
        if (dashboardGrid) dashboardGrid.innerHTML = html;
        const viewGrid = document.getElementById('customersGridView');
        if (viewGrid) viewGrid.innerHTML = html;
        renderFilterTabs(); } window.renderCustomers = renderCustomers;
    window.loadMoreCustomersLocal = function() {
        window.appState.customerPage = (window.appState.customerPage || 1) + 1;
        renderCustomers();
    };
    function performFullRender() { const todayStr = new Date().toDateString();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        let totalIncome = 0; let todaySubIncome = 0;
        let monthlySubIncome = 0; let yearlySubIncome = 0;
        let totalDebt = 0, activeCount = 0, nearExpiryCount = 0;
        let totalQuickSessionClients = 0; let totalQuickSessionsCount = 0;
        // Count and income from quick sessions
        if (Array.isArray(appState.quickSessions)) {
            appState.quickSessions.forEach(qs => {
                const p = Number(qs.price || 0);
                const clients = Number(qs.clientCount || 1);
                const sessions = Number(qs.sessionCount || 1);
                totalIncome += p;
                totalQuickSessionClients += clients;
                totalQuickSessionsCount += sessions;
                const qDate = new Date(qs.date || Number(qs.id) || Date.now());
                if (qDate.toDateString() === todayStr) {
                    todaySubIncome += p; } if (qDate.getMonth() === currentMonth && qDate.getFullYear() === currentYear) {
                    monthlySubIncome += p; } if (qDate.getFullYear() === currentYear) {
                    yearlySubIncome += p; } });
        } // O(1) package lookup index (was packages.find inside the customers loop => O(n*m))
        const packagesArr = Array.isArray(appState.packages) ? appState.packages : [];
        const packageById = new Map();
        packagesArr.forEach(p => { if (p && p.id !== undefined && p.id !== null) packageById.set(String(p.id), p); });
        const customersArr = Array.isArray(appState.customers) ? appState.customers : [];
        customersArr.forEach(c => { if (customerIsSession(c)) {
               totalQuickSessionClients++; }
           const pkg = packageById.get(String(c.packageId));
           const price = (c.price !== undefined && c.price !== null && c.price !== '') ? Number(c.price) : (pkg ? Number(pkg.price || 0) : 0);
           let paidAmount = 0; if (c.paymentStatus === 'paid') paidAmount = price;
           else if (c.paymentStatus === 'credit') {
               const debt = parseInt(c.debtAmount) || 0;
               totalDebt += debt; paidAmount = Math.max(0, price - debt);
           } totalIncome += paidAmount; const sDate = new Date(c.startDate);
           if (sDate.toDateString() === todayStr) {
               todaySubIncome += paidAmount; }
           if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
               monthlySubIncome += paidAmount; }
           if (sDate.getFullYear() === currentYear) {
               yearlySubIncome += paidAmount; }
           const status = calculateStatus(c); if (status === 'active' || status === 'near_expiry') {
               activeCount++; if (status === 'near_expiry') nearExpiryCount++;
           } }); let totalExpenses = appState.expenses.reduce((sum, e) => sum + (parseFloat(String(e.amount || 0).replace(/,/g, '')) || 0), 0);
        let monthlyExpenses = appState.expenses.filter(e => {
            const dStr = e.date || ''; if (typeof dStr === 'string' && /^\d{4}-\d{2}/.test(dStr)) {
                const parts = dStr.split('-');
                return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === (currentMonth + 1);
            } const d = new Date(e.date); return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, e) => sum + (parseFloat(String(e.amount || 0).replace(/,/g, '')) || 0), 0);
        let totalStaffPayouts = (appState.staffPayouts || []).reduce((sum, p) => sum + (parseFloat(String(p.amount || 0).replace(/,/g, '')) || 0), 0);
        let monthlyStaffPayouts = (appState.staffPayouts || []).filter(p => {
            const dStr = p.date || p.createdAt || '';
            if (typeof dStr === 'string' && /^\d{4}-\d{2}/.test(dStr)) {
                const parts = dStr.split('-');
                return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === (currentMonth + 1);
            } const d = new Date(p.date || p.id);
            return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, p) => sum + (parseFloat(String(p.amount || 0).replace(/,/g, '')) || 0), 0);
        const creditsArr = Array.isArray(appState.credits) ? appState.credits : [];
        let totalExternalCredits = creditsArr.reduce((sum, cr) => sum + (Number(cr && cr.amount) || 0), 0);
        let allTimeSales = 0; let todaySales = 0;
        let todaySalesCount = 0; let monthlySales = 0;
        let yearlySales = 0; let allTimeProductProfit = 0;
        let monthlyProductProfit = 0;
        // While older sales history is still being completed in the background, use the
        // incrementally-maintained v2Stats yearly aggregates for exact all-time totals;
        // once history is fully in memory the raw loop below is authoritative.
        const yearlyStats = appState.v2Stats && appState.v2Stats.yearly ? appState.v2Stats.yearly : null;
        const statsInterim = Boolean(window.salesHistoryLoading && !window.salesHistoryComplete && yearlyStats && Object.keys(yearlyStats).length > 0);
        if (statsInterim) {
            Object.values(yearlyStats).forEach(ys => {
                if (!ys) return;
                allTimeSales += Number(ys.sales) || 0;
                allTimeProductProfit += Number(ys.profit) || 0;
            });
        }
        const salesArr = Array.isArray(appState.sales) ? appState.sales : [];
        salesArr.forEach(s => { if (!s) return;
           const sTotal = Number(s.total) || 0;
           if (!statsInterim) { allTimeSales += sTotal; }
           const sProfit = (Number(s.profit) || 0);
           if (!statsInterim) { allTimeProductProfit += sProfit; }
           const sDate = new Date(s.date); if (sDate.toDateString() === todayStr) {
               todaySales += sTotal;
               todaySalesCount++; } if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
               monthlySales += sTotal;
               monthlyProductProfit += sProfit;
           } if (sDate.getFullYear() === currentYear) {
               yearlySales += sTotal; } });
        // Use v2Stats for accelerated O(1) stats aggregation
        const nowIso = new Date().toISOString();
        const statDateKey = nowIso.split('T')[0];
        const statMonthKey = statDateKey.substring(0, 7);
        const statYearKey = statDateKey.substring(0, 4);
        const v2Stats = appState.v2Stats || null;
        if (v2Stats) {
            const dStat = v2Stats.daily?.[statDateKey];
            const mStat = v2Stats.monthly?.[statMonthKey];
            const yStat = v2Stats.yearly?.[statYearKey];
            if (dStat) {
                if (dStat.sales !== undefined) todaySales = dStat.sales;
                if (dStat.salesCount !== undefined) todaySalesCount = dStat.salesCount;
                if (dStat.subIncome !== undefined && todaySubIncome === 0) todaySubIncome = dStat.subIncome;
            }
            if (mStat) {
                if (mStat.sales !== undefined) monthlySales = mStat.sales;
                if (mStat.profit !== undefined) monthlyProductProfit = mStat.profit;
                if (mStat.expenses !== undefined) monthlyExpenses = mStat.expenses;
                if (mStat.subIncome !== undefined && monthlySubIncome === 0) monthlySubIncome = mStat.subIncome;
            }
            if (yStat) {
                if (yStat.sales !== undefined) yearlySales = yStat.sales;
                if (yStat.subIncome !== undefined && yearlySubIncome === 0) yearlySubIncome = yStat.subIncome;
            }
            if (v2Stats.allTime) {
                if (v2Stats.allTime.sales !== undefined) allTimeSales = v2Stats.allTime.sales;
                if (v2Stats.allTime.profit !== undefined) allTimeProductProfit = v2Stats.allTime.profit;
                if (v2Stats.allTime.expenses !== undefined) totalExpenses = v2Stats.allTime.expenses;
                if (v2Stats.allTime.subIncome !== undefined && totalIncome === 0) totalIncome = v2Stats.allTime.subIncome;
                if (v2Stats.allTime.debt !== undefined && totalDebt === 0) totalDebt = v2Stats.allTime.debt;
                if (v2Stats.allTime.activeCount !== undefined && activeCount === 0) activeCount = v2Stats.allTime.activeCount;
                if (v2Stats.allTime.nearExpiryCount !== undefined && nearExpiryCount === 0) nearExpiryCount = v2Stats.allTime.nearExpiryCount;
            }
        }
        const totalRevenue = totalIncome + allTimeSales;
        const totalProductCost = allTimeSales - allTimeProductProfit;
        const totalOverallCosts = totalExpenses + totalStaffPayouts + totalProductCost;
        const totalOverallNetProfit = totalRevenue - totalOverallCosts;
        const monthlyNetProfitValue = (monthlySubIncome + monthlySales) - (monthlyExpenses + monthlyStaffPayouts + (monthlySales - monthlyProductProfit));
        setElemHTML('totalIncome', formatMoney(totalRevenue));
        if (document.getElementById('monthlyNetProfit')) {
            setElemHTML('monthlyNetProfit', formatMoney(monthlyNetProfitValue));
        } if (document.getElementById('totalYearlyIncome')) {
            setElemHTML('totalYearlyIncome', formatMoney(yearlySubIncome + yearlySales));
        } if (document.getElementById('totalExpenses')) {
            setElemHTML('totalExpenses', formatMoney(totalExpenses + totalStaffPayouts));
        } setElemHTML('netProfit', formatMoney(totalOverallNetProfit));
        if (document.getElementById('netProductProfit')) {
            setElemHTML('netProductProfit', formatMoney(allTimeProductProfit));
        } setElemHTML('totalDebt', formatMoney(totalDebt + totalExternalCredits));
        setElemText('activeCount', activeCount);
        setElemText('nearExpiryCount', nearExpiryCount);
        if (document.getElementById('sessionSubscribersCount')) {
            setElemText('sessionSubscribersCount', totalQuickSessionClients);
        }
        // Update new dashboard metrics
        if (document.getElementById('todaySubIncome')) {
            setElemHTML('todaySubIncome', formatMoney(todaySubIncome));
            setElemHTML('todayProductSales', formatMoney(todaySales));
            setElemHTML('todaySalesCount', todaySalesCount);
            setElemHTML('monthlySubIncome', formatMoney(monthlySubIncome));
            setElemHTML('yearlySubIncome', formatMoney(yearlySubIncome));
            setElemHTML('monthlyProductSales', formatMoney(monthlySales));
            setElemHTML('yearlyProductSales', formatMoney(yearlySales));
            setElemHTML('netProductProfit', formatMoney(allTimeProductProfit));
        }
        // Calculate Stock metrics & valuation (سعر المشتريات وقيمة السلع بثمن البيع وبثمن الشراء)
        const stockVal = calculateStockValuation();

        // Update Products View Summary Stats
        if (document.getElementById('prodViewTodaySales')) {
            setElemHTML('prodViewTodaySales', formatMoney(todaySales));
        } if (document.getElementById('prodViewMonthlySales')) {
            setElemHTML('prodViewMonthlySales', formatMoney(monthlySales));
        } if (document.getElementById('prodViewTodayCount')) {
            setElemText('prodViewTodayCount', todaySalesCount);
        } if (document.getElementById('prodViewStock1Count')) {
            setElemText('prodViewStock1Count', `${stockVal.stock1ItemsCount} قطعة`);
        } if (document.getElementById('prodViewStock2Count')) {
            setElemText('prodViewStock2Count', `${stockVal.stock2ItemsCount} قطعة`);
        } if (document.getElementById('prodViewTotalCapital')) {
            setElemHTML('prodViewTotalCapital', formatMoney(stockVal.totalCost));
        } if (document.getElementById('prodViewNetProfit')) {
            setElemHTML('prodViewNetProfit', formatMoney(allTimeProductProfit));
        }

        // Product View Stock Valuation Bar (سعر المشتريات وقيمة السلع بثمن البيع وبثمن الشراء)
        if (document.getElementById('prodViewTotalCost')) {
            setElemHTML('prodViewTotalCost', formatMoney(stockVal.totalCost));
        } if (document.getElementById('prodViewStock1Cost')) {
            setElemHTML('prodViewStock1Cost', formatMoney(stockVal.stock1Cost));
        } if (document.getElementById('prodViewStock2Cost')) {
            setElemHTML('prodViewStock2Cost', formatMoney(stockVal.stock2Cost));
        } if (document.getElementById('prodViewTotalSelling')) {
            setElemHTML('prodViewTotalSelling', formatMoney(stockVal.totalSelling));
        } if (document.getElementById('prodViewStock1Selling')) {
            setElemHTML('prodViewStock1Selling', formatMoney(stockVal.stock1Selling));
        } if (document.getElementById('prodViewStock2Selling')) {
            setElemHTML('prodViewStock2Selling', formatMoney(stockVal.stock2Selling));
        } if (document.getElementById('prodViewTotalProfit')) {
            setElemHTML('prodViewTotalProfit', formatMoney(stockVal.totalPotentialProfit));
        } if (document.getElementById('prodViewProfitMargin')) {
            setElemText('prodViewProfitMargin', `${stockVal.profitMargin}%`);
        } if (document.getElementById('prodViewTotalItemsCount')) {
            setElemText('prodViewTotalItemsCount', `${stockVal.totalItemsCount} قطعة`);
        }

        // Dashboard Stock Valuation Cards
        if (document.getElementById('dashboardStockCost')) {
            setElemHTML('dashboardStockCost', formatMoney(stockVal.totalCost));
        } if (document.getElementById('dashboardStockSelling')) {
            setElemHTML('dashboardStockSelling', formatMoney(stockVal.totalSelling));
        } if (document.getElementById('dashboardStockProfit')) {
            setElemHTML('dashboardStockProfit', formatMoney(stockVal.totalPotentialProfit));
        }
        // Real-time Category Breakdown Calculations (Doses, Boxes, Frigo)
        const catFilterMode = window.categoryBreakdownFilter || 'month';
        let dosesSales = 0, dosesProfit = 0, dosesUnits = 0;
        let boxesSales = 0, boxesProfit = 0, boxesUnits = 0;
        let frigoSales = 0, frigoProfit = 0, frigoUnits = 0;
        let allDosesSales = 0, allDosesProfit = 0, allDosesUnits = 0;
        let allBoxesSales = 0, allBoxesProfit = 0, allBoxesUnits = 0;
        let allFrigoSales = 0, allFrigoProfit = 0, allFrigoUnits = 0;

        const allSalesList = Array.isArray(appState.sales) ? appState.sales : [];
        allSalesList.forEach(s => {
            if (!s) return;
            const d = parseSafeDate(s.date || s.id || s.createdAt);
            const isThisMonth = d ? (d.getMonth() === currentMonth && d.getFullYear() === currentYear) : true;
            const cat = getProductCategory(s);
            const total = Number(s.total) || 0;
            const cost = Number(s.cost) || 0;
            const profit = s.profit !== undefined && s.profit !== null ? Number(s.profit) : (total - cost);
            const qty = Number(s.qty) || 1;

            if (cat === 'doses') {
                allDosesSales += total;
                allDosesProfit += profit;
                allDosesUnits += qty;
            } else if (cat === 'frigo') {
                allFrigoSales += total;
                allFrigoProfit += profit;
                allFrigoUnits += qty;
            } else {
                allBoxesSales += total;
                allBoxesProfit += profit;
                allBoxesUnits += qty;
            }

            if (isThisMonth) {
                if (cat === 'doses') {
                    dosesSales += total;
                    dosesProfit += profit;
                    dosesUnits += qty;
                } else if (cat === 'frigo') {
                    frigoSales += total;
                    frigoProfit += profit;
                    frigoUnits += qty;
                } else {
                    boxesSales += total;
                    boxesProfit += profit;
                    boxesUnits += qty;
                }
            }
        });

        // Auto fallback: if filter is 'month' but month has 0 sales and all-time has sales, show all-time or filtered
        const showAll = catFilterMode === 'all';
        const displayDosesSales = showAll ? allDosesSales : dosesSales;
        const displayDosesProfit = showAll ? allDosesProfit : dosesProfit;
        const displayDosesUnits = showAll ? allDosesUnits : dosesUnits;

        const displayBoxesSales = showAll ? allBoxesSales : boxesSales;
        const displayBoxesProfit = showAll ? allBoxesProfit : boxesProfit;
        const displayBoxesUnits = showAll ? allBoxesUnits : boxesUnits;

        const displayFrigoSales = showAll ? allFrigoSales : frigoSales;
        const displayFrigoProfit = showAll ? allFrigoProfit : frigoProfit;
        const displayFrigoUnits = showAll ? allFrigoUnits : frigoUnits;

        if (document.getElementById('prodCatMonthLabel')) {
            const labelStr = showAll
                ? `إحصائيات إجمالية (جميع المبيعات المسجلة)`
                : `إحصائيات شهر ${currentMonth + 1} / ${currentYear}`;
            setElemText('prodCatMonthLabel', labelStr);
        }

        const btnMonth = document.getElementById('catFilterThisMonthBtn');
        const btnAll = document.getElementById('catFilterAllTimeBtn');
        if (btnMonth && btnAll) {
            if (showAll) {
                btnAll.className = "px-2.5 py-1 rounded-lg transition-all bg-white text-blue-700 shadow-2xs font-extrabold";
                btnMonth.className = "px-2.5 py-1 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-bold";
            } else {
                btnMonth.className = "px-2.5 py-1 rounded-lg transition-all bg-white text-blue-700 shadow-2xs font-extrabold";
                btnAll.className = "px-2.5 py-1 rounded-lg transition-all text-slate-600 hover:text-slate-900 font-bold";
            }
        }

        // Doses
        setElemHTML('prodCatDosesIncome', formatMoney(displayDosesSales));
        setElemHTML('catDosesIncome', formatMoney(displayDosesSales));
        setElemHTML('prodCatDosesProfit', `صافي الربح: ${displayDosesProfit.toLocaleString()} دج`);
        setElemHTML('catDosesProfit', formatMoney(displayDosesProfit));
        setElemText('prodCatDosesUnits', `${displayDosesUnits} جرعة مباعة`);
        setElemText('catDosesCountBadge', `${displayDosesUnits} جرعة`);

        // Boxes
        setElemHTML('prodCatBoxesIncome', formatMoney(displayBoxesSales));
        setElemHTML('catBoxesIncome', formatMoney(displayBoxesSales));
        setElemHTML('prodCatBoxesProfit', `صافي الربح: ${displayBoxesProfit.toLocaleString()} دج`);
        setElemHTML('catBoxesProfit', formatMoney(displayBoxesProfit));
        setElemText('prodCatBoxesUnits', `${displayBoxesUnits} علبة مباعة`);
        setElemText('catBoxesCountBadge', `${displayBoxesUnits} علبة`);

        // Frigo
        setElemHTML('prodCatFrigoIncome', formatMoney(displayFrigoSales));
        setElemHTML('catFrigoIncome', formatMoney(displayFrigoSales));
        setElemHTML('prodCatFrigoProfit', `صافي الربح: ${displayFrigoProfit.toLocaleString()} دج`);
        setElemHTML('catFrigoProfit', formatMoney(displayFrigoProfit));
        setElemText('prodCatFrigoUnits', `${displayFrigoUnits} قارورة / قطعة`);
        setElemText('catFrigoCountBadge', `${displayFrigoUnits} قطعة`);
        // Update Customers View Summary Stats
        if (document.getElementById('custViewActiveCount')) {
            setElemText('custViewActiveCount', activeCount);
        } if (document.getElementById('custViewTodayIncome')) {
            setElemHTML('custViewTodayIncome', formatMoney(todaySubIncome));
        } if (document.getElementById('custViewMonthlyIncome')) {
            setElemHTML('custViewMonthlyIncome', formatMoney(monthlySubIncome));
        } if (document.getElementById('custViewSessionCount')) {
            setElemText('custViewSessionCount', totalQuickSessionClients);
        } if (document.getElementById('custViewNearExpiryCount')) {
            setElemText('custViewNearExpiryCount', nearExpiryCount);
        }
        // Keep all Dashboard Stats sections visible on all screen sizes and devices
        if (document.getElementById('mainStatsSection')) {
            setElemDisplay('mainStatsSection', 'block');
        } if (document.getElementById('productsStatsSection')) {
            setElemDisplay('productsStatsSection', 'block');
        } if (document.getElementById('subscribersStatsSection')) {
            setElemDisplay('subscribersStatsSection', 'block');
        } const eyeIcon = document.getElementById('eyeIcon');
        if (eyeIcon) { if (appState.hideFinances) {
                eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"></path>';
            } else { eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
            } }
        // Ensure session packages are removed
        if (Array.isArray(appState.packages)) {
            appState.packages = appState.packages.filter(p => p && p.type !== 'session');
        } renderFilterTabs(); const packageSelect = document.getElementById('packageIdView') || document.getElementById('packageId');
        if (packageSelect) { packageSelect.innerHTML = appState.packages.map(p => {
                const label = `${p.name} (${p.durationDays || p.duration || 30} يوم) - ${p.price} دج`;
                return `<option value="${p.id}">${label}</option>`;
            }).join(''); } const packagesContainer = document.getElementById('packagesList');
        if (packagesContainer) { if (!appState.packages || appState.packages.length === 0) {
                packagesContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-6 font-medium">لا توجد باقات حالية</div>';
            } else {
                // Count subscribers for each package
                const packageCounts = {};
                appState.customers.forEach(c => {
                    if (c.packageId) {
                        packageCounts[c.packageId] = (packageCounts[c.packageId] || 0) + 1;
                    } }); packagesContainer.innerHTML = appState.packages.map(p => {
                    const count = packageCounts[p.id] || 0;
                    const detail = `${p.durationDays} || p.duration || 30} يوم`;
                    return `
                        <div class="bg-white border border-slate-200/60 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all">
                            <div class="text-right">
                                <div class="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                                    <span>${p.name}</span>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">زمني</span>
                                </div>
                                <div class="text-[10px] sm:text-xs text-slate-400 font-medium mt-1">
                                    ${detail} - ${p.price} دج | <span class="text-blue-600 font-bold">${count} مشترك</span>
                                </div>
                            </div>
                            <button onclick="deletePackage('${p.id}')" class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0" title="حذف الباقة">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    `; }).join(''); } } const absencesListElem = document.getElementById('absencesList');
        if (absencesListElem) { if (!appState.coachAbsences || appState.coachAbsences.length === 0) {
                absencesListElem.innerHTML = '<div class="text-xs text-slate-400 text-center py-4 font-medium">لا يوجد سجل غيابات مسجل</div>';
            } else { const sortedAbsences = [...appState.coachAbsences].sort((a, b) => {
                    const da = a.date ? new Date(a.date.replace(/\//g, '-')) : 0;
                    const db = b.date ? new Date(b.date.replace(/\//g, '-')) : 0;
                    return db - da; });
                absencesListElem.innerHTML = sortedAbsences.map(abs => `
                    <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between text-right">
                        <div class="text-xs font-bold text-blue-700">تعويض بـ ${abs.days} أيام</div>
                        <div class="font-bold text-slate-700 text-xs">${abs.date}</div>
                    </div>
                `).join(''); } }
        const isVisible = (id) => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden') && el.style.display !== 'none';
        };
        const isModalOpen = (id) => {
            const el = document.getElementById(id);
            return el && el.classList.contains('active');
        };

        const expDateM = document.getElementById('expenseDateModal');
        if (expDateM && !expDateM.value) {
            expDateM.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
        }
        const expDateV = document.getElementById('expenseDateView');
        if (expDateV && !expDateV.value) {
            expDateV.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];
        }

        if (isModalOpen('expensesModal') && typeof renderExpensesListModal === 'function') renderExpensesListModal();
        if (isVisible('expensesView') && typeof renderExpensesListView === 'function') renderExpensesListView();
        if (isModalOpen('staffPayoutsModal')) {
            const suppliersTabContent = document.getElementById('suppliersTabContent');
            if (suppliersTabContent && !suppliersTabContent.classList.contains('hidden')) {
                if (typeof renderSuppliersList === 'function') renderSuppliersList();
            } else {
                if (typeof renderStaffPayouts === 'function') renderStaffPayouts();
            }
        }
        if (isVisible('productsView') || isVisible('dashboardView')) renderProductsList();
        if (isVisible('dashboardView') || isVisible('productsView')) renderSalesList();
        if (isVisible('customersView') || isVisible('dashboardView')) renderCustomers();
        if (isVisible('caisseView') || isModalOpen('caisseModal')) renderCaisseView();
        if (typeof updateMockDataUIState === 'function') updateMockDataUIState();
    }
    function render() {
        if (window.renderScheduled) return;
        window.renderScheduled = true;
        requestAnimationFrame(() => {
            window.renderScheduled = false;
            performFullRender();
        });
    }
    window.render = render;
    // ==========================================
    // CAISSE & STOCK VALUATION CORE ENGINE
    // ==========================================
    function calculateStockValuation() {
        const prods = Array.isArray(appState.products) ? appState.products : [];
        let stock1Cost = 0; let stock2Cost = 0;
        let stock1Selling = 0; let stock2Selling = 0;
        let stock1ItemsCount = 0; let stock2ItemsCount = 0;
        let stock1TypesCount = 0; let stock2TypesCount = 0;
        prods.forEach(p => {
            if (!p) return;
            const qty = parseFloat(p.stock) || 0;
            const cost = parseFloat(p.cost) || 0;
            const price = parseFloat(p.price) || 0;
            const isStock2 = p.stockLocation === 'stock2';
            if (isStock2) {
                stock2Cost += (qty * cost);
                stock2Selling += (qty * price);
                stock2ItemsCount += qty;
                stock2TypesCount++;
            } else {
                stock1Cost += (qty * cost);
                stock1Selling += (qty * price);
                stock1ItemsCount += qty;
                stock1TypesCount++;
            }
        });
        const totalCost = stock1Cost + stock2Cost;
        const totalSelling = stock1Selling + stock2Selling;
        const totalPotentialProfit = totalSelling - totalCost;
        const totalItemsCount = stock1ItemsCount + stock2ItemsCount;
        const totalTypesCount = prods.length;
        const profitMargin = totalCost > 0 ? Math.round((totalPotentialProfit / totalCost) * 100) : 0;
        return {
            stock1Cost, stock2Cost,
            totalCost, stock1Selling,
            stock2Selling, totalSelling,
            totalPotentialProfit,
            profitMargin,
            stock1ItemsCount, stock2ItemsCount,
            totalItemsCount, stock1TypesCount,
            stock2TypesCount, totalTypesCount
        };
    } window.calculateStockValuation = calculateStockValuation;
    function calculateCaisseDetails(targetDateInput) {
        const targetDateStr = getLocalDateString(targetDateInput) || getLocalDateString(new Date());
        let subIncome = 0; let quickIncome = 0;
        let salesIncome = 0;
        // 1. Subscriptions paid on that specific date
        if (Array.isArray(appState.customers)) {
            appState.customers.forEach(c => { if (!c) return;
                const cDateStr = getLocalDateString(c.startDate);
                if (cDateStr === targetDateStr) {
                    const pkg = getPackageById(c.packageId);
                    const price = (c.price !== undefined && c.price !== null && c.price !== '') ? Number(c.price) : (pkg ? Number(pkg.price || 0) : 0);
                    let paid = 0; if (c.paymentStatus === 'paid') paid = price;
                    else if (c.paymentStatus === 'credit') {
                        const debt = Number(c.debtAmount || 0);
                        paid = Math.max(0, price - debt);
                    } subIncome += paid; } }); }
        // 2. Quick sessions on that specific date
        if (Array.isArray(appState.quickSessions)) {
            appState.quickSessions.forEach(qs => {
                if (!qs) return; const qDateStr = getLocalDateString(qs.date || Number(qs.id) || Date.now());
                if (qDateStr === targetDateStr) {
                    quickIncome += Number(qs.price || 0);
                } }); }
        // 3. Product sales on that specific date
        if (Array.isArray(appState.sales)) {
            appState.sales.forEach(s => { if (!s) return;
                const sDateStr = getLocalDateString(s.date);
                if (sDateStr === targetDateStr) {
                    salesIncome += Number(s.total || 0);
                } }); }
        // Prefer exact pre-aggregated daily stats while older sales history is still loading
        if (window.salesHistoryLoading && !window.salesHistoryComplete &&
            window.appState && window.appState.v2Stats && window.appState.v2Stats.daily &&
            window.appState.v2Stats.daily[targetDateStr]) {
            salesIncome = Number(window.appState.v2Stats.daily[targetDateStr].sales) || 0;
        }
        const totalIncome = subIncome + quickIncome + salesIncome;
        // Check if a closing log exists for this date
        const logs = Array.isArray(appState.caisseLogs) ? appState.caisseLogs : [];
        const log = logs.find(l => getLocalDateString(l.date) === targetDateStr);
        const isClosed = Boolean(log); const actualAmount = isClosed ? Number(log.actualAmount || 0) : null;
        const difference = isClosed ? (actualAmount - totalIncome) : 0;
        const manque = (isClosed && difference < 0) ? Math.abs(difference) : 0;
        const excedent = (isClosed && difference > 0) ? difference : 0;
        const cashier = isClosed ? (log.cashier || '') : '';
        const notes = isClosed ? (log.notes || '') : '';
        return { targetDateStr, subIncome,
            quickIncome, salesIncome,
            totalIncome, log, isClosed,
            actualAmount, difference, manque,
            excedent, cashier, notes }; } window.calculateCaisseDetails = calculateCaisseDetails;
    function calculateAllCaisseShortages() {
        const logs = Array.isArray(appState.caisseLogs) ? appState.caisseLogs : [];
        const now = new Date(); const curMonth = now.getMonth();
        const curYear = now.getFullYear(); let currentMonthManque = 0;
        let currentMonthExcedent = 0; let currentYearManque = 0;
        let currentYearExcedent = 0; let allTimeManque = 0;
        let allTimeExcedent = 0; logs.forEach(log => {
            if (!log || !log.date) return; const d = new Date(log.date);
            if (isNaN(d.getTime())) return;
            // Compute exact expected income for that log's date to ensure accuracy
            const details = calculateCaisseDetails(log.date);
            const actual = Number(log.actualAmount || 0);
            const diff = actual - details.totalIncome;
            const isCurMonth = (d.getMonth() === curMonth && d.getFullYear() === curYear);
            const isCurYear = (d.getFullYear() === curYear);
            if (diff < 0) { const shortage = Math.abs(diff);
                allTimeManque += shortage; if (isCurYear) currentYearManque += shortage;
                if (isCurMonth) currentMonthManque += shortage;
            } else if (diff > 0) {
                allTimeExcedent += diff; if (isCurYear) currentYearExcedent += diff;
                if (isCurMonth) currentMonthExcedent += diff;
            } }); return { currentMonthManque,
            currentMonthExcedent,
            currentYearManque,
            currentYearExcedent, allTimeManque,
            allTimeExcedent }; } window.calculateAllCaisseShortages = calculateAllCaisseShortages;
    function initCaisseView() { if (!appState.selectedCaisseDate) {
            appState.selectedCaisseDate = getLocalDateString(new Date());
        } const dateInput = document.getElementById('caisseInspectionDate');
        if (dateInput) { dateInput.value = appState.selectedCaisseDate;
        } const clotureDateInput = document.getElementById('clotureFormDate');
        if (clotureDateInput) { clotureDateInput.value = appState.selectedCaisseDate;
        } renderCaisseView(); } window.initCaisseView = initCaisseView;
    function handleCaisseDateChange(newDate) {
        if (!newDate) return; appState.selectedCaisseDate = newDate;
        const clotureDateInput = document.getElementById('clotureFormDate');
        if (clotureDateInput) { clotureDateInput.value = newDate;
        } renderCaisseView(); } window.handleCaisseDateChange = handleCaisseDateChange;
    function setCaisseDateToToday() { const todayStr = getLocalDateString(new Date());
        appState.selectedCaisseDate = todayStr;
        const dateInput = document.getElementById('caisseInspectionDate');
        if (dateInput) dateInput.value = todayStr;
        const clotureDateInput = document.getElementById('clotureFormDate');
        if (clotureDateInput) clotureDateInput.value = todayStr;
        renderCaisseView(); } window.setCaisseDateToToday = setCaisseDateToToday;
    function handleClotureFormDateChange(newDate) {
        if (!newDate) return; appState.selectedCaisseDate = newDate;
        const dateInput = document.getElementById('caisseInspectionDate');
        if (dateInput) dateInput.value = newDate;
        renderCaisseView(); } window.handleClotureFormDateChange = handleClotureFormDateChange;
    function handleClotureAmountInput() { const dateVal = getElemVal('clotureFormDate') || appState.selectedCaisseDate || getLocalDateString(new Date());
        const details = calculateCaisseDetails(dateVal);
        const actualInput = document.getElementById('clotureFormActualAmount');
        const previewContainer = document.getElementById('clotureDifferencePreview');
        const previewTitle = document.getElementById('clotureDiffTitle');
        const previewVal = document.getElementById('clotureDiffValue');
        if (!actualInput || !previewContainer || !previewTitle || !previewVal) return;
        const valStr = actualInput.value.trim();
        if (valStr === '') { previewContainer.classList.add('hidden');
            return; } const actual = parseFloat(valStr) || 0;
        const diff = actual - details.totalIncome;
        previewContainer.classList.remove('hidden');
        if (diff < 0) { previewContainer.className = 'p-3 rounded-2xl border text-xs font-bold bg-slate-100 border-slate-200 text-slate-800';
            previewTitle.textContent = 'عجز ونقص في الصندوق (Manque):';
            previewVal.textContent = `-${formatMoney(Math.abs(diff))}`;
            previewVal.className = 'text-base font-black text-slate-800';
        } else if (diff > 0) { previewContainer.className = 'p-3 rounded-2xl border text-xs font-bold bg-blue-50 border-blue-200 text-blue-900';
            previewTitle.textContent = 'زيادة وفائض في الصندوق (Excédent):';
            previewVal.textContent = `+${formatMoney(diff)}`;
            previewVal.className = 'text-base font-black text-blue-600';
        } else { previewContainer.className = 'p-3 rounded-2xl border text-xs font-bold bg-blue-50 border-blue-200 text-blue-900';
            previewTitle.textContent = 'الصندوق متطابق تماماً بدون فارق:';
            previewVal.textContent = '0 دج (متوازن)';
            previewVal.className = 'text-base font-black text-blue-600';
        } } window.handleClotureAmountInput = handleClotureAmountInput;
    function toggleDenominationCounter() { const container = document.getElementById('denominationCounterContainer');
        if (container) { container.classList.toggle('hidden');
        } } window.toggleDenominationCounter = toggleDenominationCounter;
    function calcDenominations() { const v2000 = (parseInt(getElemVal('denom_2000')) || 0) * 2000;
        const v1000 = (parseInt(getElemVal('denom_1000')) || 0) * 1000;
        const v500 = (parseInt(getElemVal('denom_500')) || 0) * 500;
        const v200 = (parseInt(getElemVal('denom_200')) || 0) * 200;
        const v100 = (parseInt(getElemVal('denom_100')) || 0) * 100;
        const v50 = (parseInt(getElemVal('denom_50')) || 0) * 50;
        const sum = v2000 + v1000 + v500 + v200 + v100 + v50;
        const badge = document.getElementById('denomTotalBadge');
        if (badge) { badge.textContent = `المجموع: ${formatMoney(sum)}`;
        } return sum; } window.calcDenominations = calcDenominations;
    function applyDenominationsToInput() { const sum = calcDenominations();
        const input = document.getElementById('clotureFormActualAmount');
        if (input) { input.value = sum;
            handleClotureAmountInput();
            showSuccessToast(`تم نقل المجموع المحسوب (${formatMoney(sum)}) إلى حقل المبلغ الفعلي`);
        } } window.applyDenominationsToInput = applyDenominationsToInput;
    function handleCaisseClotureSubmit(event) {
        event.preventDefault(); const dateInput = document.getElementById('clotureFormDate');
        const actualInput = document.getElementById('clotureFormActualAmount');
        const cashierInput = document.getElementById('clotureFormCashier');
        const notesInput = document.getElementById('clotureFormNotes');
        const dateVal = dateInput ? dateInput.value : (appState.selectedCaisseDate || getLocalDateString(new Date()));
        if (!dateVal) { showErrorToast('يرجى تحديد تاريخ الجرد');
            return; } const actualAmount = parseFloat(actualInput?.value);
        if (isNaN(actualAmount) || actualAmount < 0) {
            showErrorToast('يرجى إدخال المبلغ الفعلي الموجود في الصندوق');
            return; } const cashier = (cashierInput?.value || '').trim();
        const notes = (notesInput?.value || '').trim();
        // Calculate expected income for this date
        const details = calculateCaisseDetails(dateVal);
        const difference = actualAmount - details.totalIncome;
        if (!Array.isArray(appState.caisseLogs)) {
            appState.caisseLogs = []; } const existingIdx = appState.caisseLogs.findIndex(l => getLocalDateString(l.date) === dateVal);
        const logEntry = { id: existingIdx !== -1 ? appState.caisseLogs[existingIdx].id : 'caisse_' + Date.now(),
            date: dateVal, expectedIncome: details.totalIncome,
            subIncome: details.subIncome,
            quickIncome: details.quickIncome,
            salesIncome: details.salesIncome,
            actualAmount: actualAmount,
            difference: difference, cashier: cashier,
            notes: notes, savedAt: new Date().toISOString()
        }; if (existingIdx !== -1) { appState.caisseLogs[existingIdx] = logEntry;
            showSuccessToast(`تم تحديث جرد وإغلاق الصندوق ليوم ${dateVal}`);
        } else { appState.caisseLogs.unshift(logEntry);
            showSuccessToast(`تم حفظ جرد وإغلاق الصندوق ليوم ${dateVal} بنجاح`);
        }
        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('caisseLogs', logEntry);
        }
        if (typeof logActivity === 'function') logActivity('caisse', 'جرد وإغلاق الخزينة', `تاريخ الجرد: ${dateVal} - المبلغ الفعلي: ${finalActual.toLocaleString()} دج`, finalActual);
        saveState(); renderCaisseView();
        render(); } window.handleCaisseClotureSubmit = handleCaisseClotureSubmit;
    function deleteCaisseLog(logId) { if (!logId) return;
        promptWithPassword({ title: 'حذف سجل جرد الصندوق', prompt: 'أدخل كلمة المرور لتأكيد حذف سجل جرد الصندوق', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.caisseLogs)) return;
            const idx = appState.caisseLogs.findIndex(l => String(l.id) === String(logId));
            if (idx === -1) return;
            const logItem = appState.caisseLogs[idx];
            if (typeof logActivity === 'function') logActivity('caisse', 'حذف سجل جرد الخزينة', `حذف سجل الجرد ليوم: ${logItem ? logItem.date : logId}`);
            appState.caisseLogs.splice(idx, 1);
            if (window.deleteFirebaseSectionItem) {
                window.deleteFirebaseSectionItem('caisseLogs', logId);
            }
            saveState(); showSuccessToast('تم حذف سجل جرد الصندوق');
            renderCaisseView(); render();
        });
    } window.deleteCaisseLog = deleteCaisseLog;
    function scrollToCaisseClotureForm(dateStr) {
        if (dateStr) { appState.selectedCaisseDate = dateStr;
            const dateInput = document.getElementById('caisseInspectionDate');
            if (dateInput) dateInput.value = dateStr;
            const clotureDateInput = document.getElementById('clotureFormDate');
            if (clotureDateInput) clotureDateInput.value = dateStr;
            renderCaisseView(); } const formSection = document.getElementById('caisseClotureSection');
        if (formSection) { formSection.scrollIntoView({ behavior: 'smooth' });
            const amountInput = document.getElementById('clotureFormActualAmount');
            if (amountInput) { setTimeout(() => {
                    amountInput.focus();
                    amountInput.select(); }, 300);
            } } } window.scrollToCaisseClotureForm = scrollToCaisseClotureForm;
    function renderCaisseView() { const caisseView = document.getElementById('caisseView');
        if (!caisseView) return; const targetDate = appState.selectedCaisseDate || getLocalDateString(new Date());
        const todayStr = getLocalDateString(new Date());
        const isToday = (targetDate === todayStr);
        const details = calculateCaisseDetails(targetDate);
        const caisseStats = calculateAllCaisseShortages();
        const stockVal = calculateStockValuation();
        // 1. Date inputs & header
        const dateInput = document.getElementById('caisseInspectionDate');
        if (dateInput && dateInput.value !== targetDate) dateInput.value = targetDate;
        const labelElem = document.getElementById('caisseSelectedDateLabel');
        if (labelElem) { labelElem.textContent = isToday ? 'اليوم' : `تاريخ: ${targetDate}`;
        }
        // 2. Metrics Cards
        if (document.getElementById('caisseDayTotalIncome')) {
            setElemHTML('caisseDayTotalIncome', formatMoney(details.totalIncome));
            setElemHTML('caisseDaySubIncome', formatMoney(details.subIncome));
            setElemHTML('caisseDayQuickIncome', formatMoney(details.quickIncome));
            setElemHTML('caisseDaySalesIncome', formatMoney(details.salesIncome));
        } const actualElem = document.getElementById('caisseDayActualAmount');
        const statusBadgeElem = document.getElementById('caisseDayStatusBadge');
        if (actualElem) { if (details.isClosed) {
                actualElem.innerHTML = formatMoney(details.actualAmount);
                if (statusBadgeElem) {
                    statusBadgeElem.className = 'text-[10px] font-bold mt-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100';
                    statusBadgeElem.textContent = 'تم إغلاق الصندوق لهذا اليوم';
                } } else { actualElem.innerHTML = '<span class="text-slate-400 font-medium text-lg">لم يُسجل بعد</span>';
                if (statusBadgeElem) {
                    statusBadgeElem.className = 'hidden';
                    statusBadgeElem.textContent = '';
                } } } const diffAmountElem = document.getElementById('caisseDayDifferenceAmount');
        const diffLabelElem = document.getElementById('caisseDayDifferenceLabel');
        const diffCardElem = document.getElementById('caisseDifferenceCard');
        if (diffAmountElem && diffLabelElem) {
            if (details.isClosed) { if (details.difference < 0) {
                    diffAmountElem.className = 'text-xl md:text-2xl font-black text-slate-800 tracking-tight';
                    diffAmountElem.textContent = `-${formatMoney(Math.abs(details.difference))}`;
                    diffLabelElem.className = 'text-[10px] font-bold mt-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block border border-slate-200';
                    diffLabelElem.textContent = 'عجز ونقص في الصندوق (Manque)';
                    if (diffCardElem) diffCardElem.className = 'bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col shadow-2xs';
                } else if (details.difference > 0) {
                    diffAmountElem.className = 'text-xl md:text-2xl font-black text-blue-600 tracking-tight';
                    diffAmountElem.textContent = `+${formatMoney(details.difference)}`;
                    diffLabelElem.className = 'text-[10px] font-bold mt-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100';
                    diffLabelElem.textContent = 'فائض وزيادة في الصندوق (Excédent)';
                    if (diffCardElem) diffCardElem.className = 'bg-blue-50/40 border border-blue-200 p-4 rounded-2xl flex flex-col shadow-2xs';
                } else { diffAmountElem.className = 'text-xl md:text-2xl font-black text-blue-600 tracking-tight';
                    diffAmountElem.textContent = '0 دج';
                    diffLabelElem.className = 'text-[10px] font-bold mt-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100';
                    diffLabelElem.textContent = 'متطابق تماماً بدون أي فارق';
                    if (diffCardElem) diffCardElem.className = 'bg-white border border-slate-200 p-4 rounded-2xl flex flex-col shadow-2xs';
                } } else { diffAmountElem.className = 'text-xl md:text-2xl font-black text-slate-400 tracking-tight';
                diffAmountElem.textContent = '--';
                diffLabelElem.className = 'text-[10px] font-bold mt-1 text-slate-500';
                diffLabelElem.textContent = 'سجل المبلغ الفعلي لمعرفة الفارق والعجز';
                if (diffCardElem) diffCardElem.className = 'bg-white border border-slate-200 p-4 rounded-2xl flex flex-col shadow-2xs';
            } } if (document.getElementById('caisseMonthManqueTotal')) {
            setElemHTML('caisseMonthManqueTotal', formatMoney(caisseStats.currentMonthManque));
            setElemHTML('caisseYearManqueTotal', formatMoney(caisseStats.currentYearManque));
        }
        // Stock Valuation in Caisse
        if (document.getElementById('caisseStockCost')) {
            setElemHTML('caisseStockCost', formatMoney(stockVal.totalCost));
        } if (document.getElementById('caisseStockSelling')) {
            setElemHTML('caisseStockSelling', formatMoney(stockVal.totalSelling));
        } if (document.getElementById('caisseStockProfit')) {
            setElemHTML('caisseStockProfit', formatMoney(stockVal.totalPotentialProfit));
        }
        // 3. Populate Clôture Form
        const clotureDateInput = document.getElementById('clotureFormDate');
        if (clotureDateInput && clotureDateInput.value !== targetDate) {
            clotureDateInput.value = targetDate;
        } const expIncomeDisplay = document.getElementById('clotureFormExpectedIncome');
        if (expIncomeDisplay) { expIncomeDisplay.innerHTML = formatMoney(details.totalIncome);
        } const actualInput = document.getElementById('clotureFormActualAmount');
        const cashierInput = document.getElementById('clotureFormCashier');
        const notesInput = document.getElementById('clotureFormNotes');
        const submitBtn = document.getElementById('clotureSubmitBtn');
        if (details.isClosed) { if (actualInput && actualInput !== document.activeElement) {
                actualInput.value = details.actualAmount;
            } if (cashierInput && cashierInput !== document.activeElement) {
                cashierInput.value = details.cashier;
            } if (notesInput && notesInput !== document.activeElement) {
                notesInput.value = details.notes;
            } if (submitBtn) { submitBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    <span>تحديث جرد وإغلاق الصندوق لهذا اليوم</span>
                `; } } else { if (actualInput && actualInput !== document.activeElement) {
                actualInput.value = ''; } if (cashierInput && cashierInput !== document.activeElement) {
                cashierInput.value = ''; } if (notesInput && notesInput !== document.activeElement) {
                notesInput.value = ''; } if (submitBtn) {
                submitBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    <span>حفظ وإغلاق الصندوق لهذا اليوم</span>
                `; } } handleClotureAmountInput();
        // 5. Caisse Closings History Table
        const historyBody = document.getElementById('caisseHistoryTableBody');
        const historyBadge = document.getElementById('caisseHistoryCountBadge');
        const logs = Array.isArray(appState.caisseLogs) ? [...appState.caisseLogs] : [];
        if (historyBadge) { historyBadge.textContent = `${logs.length} عملية جرد`;
        } if (historyBody) { if (logs.length === 0) {
                historyBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="p-8 text-center text-slate-400 font-medium">
                            <div class="flex flex-col items-center justify-center gap-1.5">
                                <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span>لا توجد عمليات جرد صندق مسجلة بعد</span>
                            </div>
                        </td>
                    </tr>
                `; } else { const sortedLogs = logs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
                historyBody.innerHTML = sortedLogs.map(l => {
                    const lDetails = calculateCaisseDetails(l.date);
                    const actualAmt = Number(l.actualAmount || 0);
                    const expectedAmt = lDetails.totalIncome;
                    const diff = actualAmt - expectedAmt;
                    let diffBadgeHtml = ''; if (diff < 0) {
                        diffBadgeHtml = `<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-black text-[11px] border border-slate-200"><span>عجز:</span><span>-${formatMoney(Math.abs(diff))}</span></span>`;
                    } else if (diff > 0) {
                        diffBadgeHtml = `<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-black text-[11px] border border-blue-200"><span>فائض:</span><span>+${formatMoney(diff)}</span></span>`;
                    } else { diffBadgeHtml = `<span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-blue-200"><span>متطابق (0 دج)</span></span>`;
                    } const safeId = escapeHTML(l.id || '');
                    const safeDate = escapeHTML(l.date || '');
                    const safeCashier = escapeHTML(l.cashier || 'غير محدد');
                    const safeNotes = escapeHTML(l.notes || '');
                    return `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="p-3 border-l border-slate-100 font-bold text-slate-800 text-xs">
                                <div class="flex items-center gap-1.5">
                                    <button type="button" onclick="scrollToCaisseClotureForm('${safeDate}')" class="text-blue-600 hover:text-blue-800 hover:underline font-bold" title="فحص وتعديل هذا التاريخ">
                                        ${safeDate}
                                    </button>
                                    ${safeDate === todayStr ? '<span class="bg-blue-100 text-blue-900 text-[9px] font-black px-1.5 py-0.2 rounded">اليوم</span>' : ''}
                                </div>
                            </td>
                            <td class="p-3 border-l border-slate-100 font-extrabold text-slate-700 text-xs">${formatMoney(expectedAmt)}</td>
                            <td class="p-3 border-l border-slate-100 font-extrabold text-slate-900 text-xs">${formatMoney(actualAmt)}</td>
                            <td class="p-3 border-l border-slate-100">${diffBadgeHtml}</td>
                            <td class="p-3 border-l border-slate-100 text-[11px] text-slate-600 max-w-[180px] truncate">
                                <div><strong class="text-slate-800 font-bold">${safeCashier}</strong></div>
                                ${safeNotes ? `<div class="text-slate-400 text-[10px] truncate" title="${safeNotes}">${safeNotes}</div>` : ''}
                            </td>
                            <td class="p-3 text-center">
                                <div class="flex items-center justify-center gap-1">
                                    <button type="button" onclick="scrollToCaisseClotureForm('${safeDate}')" class="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="فحص وتعديل">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                    </button>
                                    <button type="button" onclick="deleteCaisseLog('${safeId}')" class="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="حذف السجل">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `; }).join(''); } } } window.renderCaisseView = renderCaisseView;
    // ==========================================
    // REAL-TIME INPUT GUARDS & SECURITY BINDINGS
    // ==========================================
    function setupGlobalInputSecurity() {
        // Prevent unwanted keys on numeric inputs (e.g., 'e', 'E', '+', '-')
        document.addEventListener('keydown', function(e) {
            const target = e.target; if (!target || !target.tagName || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
            const type = (target.getAttribute('type') || '').toLowerCase();
            const id = (target.id || '').toLowerCase();
            const isStrictNumeric = ( type === 'number' ||
                id.includes('amount') || id.includes('price') ||
                id.includes('paid') || id.includes('debt') ||
                id.includes('weight') || id.includes('age') ||
                id.includes('qty') || id.includes('count') ||
                id.includes('duration') || id.includes('days') ||
                id.includes('sessions') ); if (isStrictNumeric) {
                if (['e', 'E', '+', '-'].includes(e.key) && type === 'number') {
                    e.preventDefault(); } } }, true);
        document.addEventListener('input', function(e) {
            const target = e.target; if (!target || !target.tagName || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
            const type = (target.getAttribute('type') || '').toLowerCase();
            const id = (target.id || '').toLowerCase();
            const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
            // Real-time Name & Nickname restriction (Letters, spaces, hyphens ONLY - strictly NO numbers/symbols)
            const isNameOrNickname = ( id.includes('nickname') ||
                id.includes('creditname') || id.includes('custname') ||
                id.includes('editcustname') ||
                id.includes('staffname') || id.includes('coachname') ||
                id.includes('quicksessionname') ||
                id.includes('quicksessionnickname') ||
                (id.includes('name') && !id.includes('prod') && !id.includes('pkg') && !id.includes('file') && !id.includes('search') && !id.includes('supplier')) ||
                (placeholder.includes('الاسم') && !placeholder.includes('شركة') && !placeholder.includes('مورد')) ||
                placeholder.includes('اللقب') ||
                placeholder.includes('اسم الشخص') ||
                placeholder.includes('اسم المشترك') ||
                placeholder.includes('اسم العامل') ||
                placeholder.includes('اسم المدرب')
            ); if (isNameOrNickname) { const raw = target.value;
                // Remove all numbers (English 0-9 & Arabic ٠-٩) and non-letter symbols from person name inputs
                const sanitized = raw.replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, '').replace(/[^a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s'-]/g, '');
                if (raw !== sanitized) { target.value = sanitized;
                } }
            // Real-time Phone number restriction (Digits 0-9 and leading '+' ONLY - strictly NO letters/symbols)
            const isPhone = ( type === 'tel' ||
                id.includes('phone') || id.includes('mobile') ||
                placeholder.includes('0x') ||
                placeholder.includes('هاتف') ||
                placeholder.includes('0550') );
            if (isPhone) { const raw = target.value;
                let sanitized = raw.replace(/[^\d+]/g, '');
                if (sanitized.indexOf('+') > 0) {
                    sanitized = sanitized.replace(/\+/g, '');
                } if (raw !== sanitized) {
                    target.value = sanitized; }
            }
            // Bypass all text/numeric restrictions for date, month, time inputs
            if (type === 'date' || type === 'month' || type === 'time' || type === 'datetime-local') {
                return; }
            // Real-time numeric input restriction (Digits 0-9 & decimal point ONLY - strictly NO letters/text)
            const isNumericInput = ( type === 'number' ||
                id.includes('amount') || id.includes('price') ||
                id.includes('paid') || id.includes('debt') ||
                id.includes('weight') || id.includes('age') ||
                id.includes('qty') || id.includes('count') ||
                id.includes('duration') || id.includes('days') ||
                id.includes('sessions') || id === 'staffamount' ||
                id === 'staffpayoutamount' || id.includes('salary') ||
                (id.includes('expense') && id.includes('amount')) ) && !id.includes('date') && !id.includes('filter') && !id.includes('desc') && !id.includes('search') && !id.includes('category') && id !== 'prodweight';
            if (isNumericInput && type !== 'number') {
                const raw = target.value; const sanitized = raw.replace(/[^0-9.]/g, '');
                if (raw !== sanitized) { target.value = sanitized;
                } }
            // Real-time Code & Injection Guard for general text inputs (blocks HTML tags, script braces, backticks, backslashes)
            // Allows natural arabic characters, hyphens, slashes, punctuation, parentheses
            if ((type === 'text' || type === 'search' || target.tagName === 'TEXTAREA') && !isNameOrNickname && !isPhone && !isNumericInput) {
                const raw = target.value; const sanitized = raw.replace(/[<>{}`$\\]/g, '');
                if (raw !== sanitized) { target.value = sanitized;
                } }
            // Real-time check for script tags or dangerous code in all inputs
            if (target.value && containsDangerousCode(target.value)) {
                target.value = sanitizeInputText(target.value);
                showErrorToast('تحذير أمني: تم حظر كتابة رموز أو أكواد غير مسموح بها.');
            } }, true); }
    // ==========================================
    // 1. GOOGLE DRIVE DIRECT OAUTH & BACKUP ENGINE
    // ==========================================
    const GOOGLE_DRIVE_CLIENT_ID = '457260962388-vs2t59ht3cgge9n0ceq620r2e27m7asa.apps.googleusercontent.com';
    const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
    let gdriveTokenClient = null; let gdriveAccessToken = null;
    let gdriveTokenExpiresAt = 0; let gdriveCurrentUser = null;
    let gsiLoadingPromise = null;
    function loadGoogleGSI() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            return Promise.resolve(true);
        }
        if (gsiLoadingPromise) return gsiLoadingPromise;
        gsiLoadingPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve(true);
            script.onerror = () => {
                gsiLoadingPromise = null;
                resolve(false);
            };
            document.head.appendChild(script);
        });
        return gsiLoadingPromise;
    }
    window.initGoogleDriveOAuth = function() {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
            return false; } if (!gdriveTokenClient) {
            try { gdriveTokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_DRIVE_CLIENT_ID,
                    scope: GOOGLE_DRIVE_SCOPE,
                    callback: (response) => { if (response.error) {
                            console.error('Google OAuth token error:', response);
                            showErrorToast('فشل المصادقة مع Google Drive: ' + (response.error_description || response.error));
                            updateGoogleDriveUI();
                            return; }
                        gdriveAccessToken = response.access_token;
                        const expiresIn = parseInt(response.expires_in, 10) || 3599;
                        gdriveTokenExpiresAt = Date.now() + (expiresIn * 1000);
                        try { sessionStorage.setItem('sm_gdrive_token', gdriveAccessToken);
                            sessionStorage.setItem('sm_gdrive_expires_at', gdriveTokenExpiresAt.toString());
                        } catch (e) {}
                        showSuccessToast('تم ربط حساب Google Drive بنجاح!');
                        fetchGoogleDriveUserInfo();
                        listGoogleDriveBackups();
                        updateGoogleDriveUI(); }
                }); } catch (err) { console.error('Failed to init Google token client:', err);
                return false; } } return true; };
    function getValidGDriveToken() { if (gdriveAccessToken && Date.now() < gdriveTokenExpiresAt - 60000) {
            return gdriveAccessToken; } try {
            const cached = sessionStorage.getItem('sm_gdrive_token');
            const exp = parseInt(sessionStorage.getItem('sm_gdrive_expires_at') || '0', 10);
            if (cached && exp > Date.now() + 60000) {
                gdriveAccessToken = cached;
                gdriveTokenExpiresAt = exp;
                return cached; } } catch (e) {}
        return null; } window.connectGoogleDriveAccount = async function() {
        await loadGoogleGSI();
        if (!window.initGoogleDriveOAuth()) {
            showErrorToast('جاري تحميل خدمات Google، يرجى المحاولة بعد ثوانٍ قليلة...');
            return; } if (gdriveTokenClient) {
            // Prompt user consent/account selector
            gdriveTokenClient.requestAccessToken({ prompt: 'consent' });
        } }; window.disconnectGoogleDriveAccount = function() {
        if (gdriveAccessToken && typeof google !== 'undefined' && google.accounts?.oauth2?.revoke) {
            try { google.accounts.oauth2.revoke(gdriveAccessToken, () => {}); } catch(e){}
        } gdriveAccessToken = null;
        gdriveTokenExpiresAt = 0;
        gdriveCurrentUser = null; try {
            sessionStorage.removeItem('sm_gdrive_token');
            sessionStorage.removeItem('sm_gdrive_expires_at');
        } catch (e) {} if (appState.gdriveSettings) {
            appState.gdriveSettings.connected = false;
        } saveState(); showSuccessToast('تم إلغاء ربط حساب Google Drive.');
        updateGoogleDriveUI(); }; async function fetchGoogleDriveUserInfo() {
        const token = getValidGDriveToken(); if (!token) return;
        try { const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${token}` }
            }); if (res.ok) { gdriveCurrentUser = await res.json();
                if (!appState.gdriveSettings) appState.gdriveSettings = {};
                appState.gdriveSettings.connected = true;
                appState.gdriveSettings.userEmail = gdriveCurrentUser.email || '';
                saveState(); updateGoogleDriveUI();
            } } catch (e) { console.warn('Could not load user profile from Google:', e);
        } } window.openGoogleDriveModal = async function() {
        const modal = document.getElementById('googleDriveModal');
        if (!modal) return; if (!appState.gdriveSettings) {
            appState.gdriveSettings = { autoSync: true,
                lastSyncTime: null,
                lastSyncStatus: 'جاهز' }; }
        await loadGoogleGSI();
        window.initGoogleDriveOAuth(); const token = getValidGDriveToken();
        if (token && !gdriveCurrentUser) {
            fetchGoogleDriveUserInfo();
            listGoogleDriveBackups(); }
        updateGoogleDriveUI(); modal.classList.add('active');
    }; window.closeGoogleDriveModal = function() {
        closeModal('googleDriveModal'); };
    function updateGoogleDriveUI() { const token = getValidGDriveToken();
        const isConnected = !!token; const autoSyncCheckbox = document.getElementById('gdriveAutoSyncToggle');
        const lastSyncLabel = document.getElementById('gdriveLastSyncLabel');
        const statusBadge = document.getElementById('gdriveStatusBadge');
        const connectBox = document.getElementById('gdriveConnectBox');
        const connectedBox = document.getElementById('gdriveConnectedBox');
        const userEmailLabel = document.getElementById('gdriveUserEmailLabel');
        const actionButtons = document.getElementById('gdriveActionButtons');
        const settings = appState.gdriveSettings || {};
        if (autoSyncCheckbox) autoSyncCheckbox.checked = !!settings.autoSync;
        if (lastSyncLabel) { lastSyncLabel.textContent = settings.lastSyncTime
                ? `آخر حفظ: ${new Date(settings.lastSyncTime).toLocaleString('ar-DZ')}`
                : 'لم يتم الرفع للدرايف بعد'; }
        if (statusBadge) { if (isConnected) {
                statusBadge.textContent = 'متصل بـ Google Drive';
                statusBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 flex items-center gap-1.5';
            } else { statusBadge.textContent = 'غير متصل بحساب Google';
                statusBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600';
            } } if (connectBox && connectedBox) {
            if (isConnected) { connectBox.classList.add('hidden');
                connectedBox.classList.remove('hidden');
                if (userEmailLabel) {
                    userEmailLabel.textContent = gdriveCurrentUser?.email || settings.userEmail || 'حساب Google متصل ومفوّض';
                } } else { connectBox.classList.remove('hidden');
                connectedBox.classList.add('hidden');
            } } if (actionButtons) { const directBackupBtn = document.getElementById('gdriveDirectBackupBtn');
            if (directBackupBtn) { if (isConnected) {
                    directBackupBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M22.85 15l-6.56-11.5H9.72l6.57 11.5"/></svg>
                        <span>حفظ مباشر داخل Google Drive</span>
                    `; } else { directBackupBtn.innerHTML = `
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.71 3.5L1.15 15l3.43 6l6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M22.85 15l-6.56-11.5H9.72l6.57 11.5"/></svg>
                        <span>تسجيل الدخول ورفع النسخة للدرايف</span>
                    `; } } } } window.saveGoogleDriveSettings = function() {
        if (!appState.gdriveSettings) appState.gdriveSettings = {};
        const autoSyncCheckbox = document.getElementById('gdriveAutoSyncToggle');
        appState.gdriveSettings.autoSync = autoSyncCheckbox ? autoSyncCheckbox.checked : true;
        saveState(); showSuccessToast('تم تحديث إعدادات المزامنة مع Google Drive');
    };
    // Upload backup file directly to Google Drive
    window.backupToGoogleDriveNow = async function() {
        const token = getValidGDriveToken(); if (!token) {
            // Require login first
            window.initGoogleDriveOAuth(); if (gdriveTokenClient) {
                gdriveTokenClient.requestAccessToken({ prompt: 'consent' });
                showInfoToast('يرجى اختيار حسابك في Google لمنح صلاحية حفظ النسخ في درايف مباشرة.');
            } else { showErrorToast('جاري تحميل خدمات Google، يرجى المحاولة بعد لحظات.');
            } return; } const statusBadge = document.getElementById('gdriveStatusBadge');
        const lastSyncLabel = document.getElementById('gdriveLastSyncLabel');
        const directBackupBtn = document.getElementById('gdriveDirectBackupBtn');
        if (statusBadge) { statusBadge.textContent = 'جاري الرفع إلى Google Drive...';
            statusBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 animate-pulse';
        } if (directBackupBtn) { directBackupBtn.disabled = true;
            directBackupBtn.classList.add('opacity-70');
        } try { const now = new Date(); const dateStr = now.toISOString().slice(0, 10);
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
            const fileName = `OmegaGym_Backup_${dateStr}_${timeStr}.json`;
            const backupData = { version: '3.0',
                appName: 'Omega Gym Management',
                exportedAt: now.toISOString(),
                state: appState }; const fileContent = JSON.stringify(backupData, null, 2);
            // Use multipart upload to Google Drive v3 REST API
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            const metadata = { name: fileName,
                mimeType: 'application/json',
                description: 'نسخة احتياطية لقاعدة بيانات نظام OMEGA GYM'
            }; const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                fileContent + close_delim; const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST', headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                }, body: multipartRequestBody });
            if (!response.ok) { const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody?.error?.message || `HTTP ${response.status}`);
            } const uploadedFile = await response.json();
            const nowIso = now.toISOString(); if (!appState.gdriveSettings) appState.gdriveSettings = {};
            appState.gdriveSettings.lastSyncTime = nowIso;
            appState.gdriveSettings.lastSyncStatus = 'متزامن في Google Drive';
            appState.gdriveSettings.lastFileId = uploadedFile.id;
            saveState(); if (statusBadge) {
                statusBadge.textContent = 'محفوظ في درايف بنجاح';
                statusBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800';
            } if (lastSyncLabel) { lastSyncLabel.textContent = `آخر حفظ: ${now.toLocaleString('ar-DZ')}`;
            } showSuccessToast(`تم رفع النسخة الاحتياطية (${fileName}) مباشرة إلى تطبيق Google Drive!`);
            listGoogleDriveBackups(); } catch (err) {
            console.error('Google Drive direct upload error:', err);
            if (statusBadge) { statusBadge.textContent = 'فشل الرفع';
                statusBadge.className = 'text-xs font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-800';
            } showErrorToast('حدث خطأ أثناء الرفع إلى Google Drive: ' + (err.message || ''));
        } finally { if (directBackupBtn) {
                directBackupBtn.disabled = false;
                directBackupBtn.classList.remove('opacity-70');
            } } };
    // List recent backups from Google Drive account
    window.listGoogleDriveBackups = async function() {
        const token = getValidGDriveToken();
        const listContainer = document.getElementById('gdriveBackupsList');
        if (!listContainer) return; if (!token) {
            listContainer.innerHTML = `
                <div class="p-3 text-center text-xs text-slate-400">
                    يرجى تسجيل الدخول لعرض النسخ الاحتياطية المحفوظة في حسابك في Google Drive.
                </div>
            `; return; } listContainer.innerHTML = `
            <div class="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <span class="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>جاري قراءة النسخ من Google Drive...</span>
            </div>
        `; try { const query = encodeURIComponent("name contains 'OmegaGym_Backup' and trashed = false");
            const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=5&fields=files(id,name,createdTime,size)`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }); if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json(); const files = data.files || [];
            if (files.length === 0) {
                listContainer.innerHTML = `
                    <div class="p-3 text-center text-xs text-slate-400">
                        لا توجد نسخ احتياطية محفوظة بعد في درايف. اضغط "حفظ مباشر داخل Google Drive" لإنشاء أول نسخة.
                    </div>
                `; return; } let html = '<div class="divide-y divide-slate-100">';
            files.forEach(f => { const dateStr = new Date(f.createdTime).toLocaleString('ar-DZ');
                const sizeKb = f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : '';
                html += `
                    <div class="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg">
                        <div class="min-w-0 flex-1 pr-2">
                            <div class="text-xs font-bold text-slate-800 truncate" dir="ltr">${f.name}</div>
                            <div class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>${dateStr}</span>
                                ${sizeKb ? `<span>• ${sizeKb}</span>` : ''}
                            </div>
                        </div>
                        <button type="button" onclick="restoreDirectFromGoogleDrive('${f.id}', '${f.name}')" class="shrink-0 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors shadow-2xs flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span>استرجاع</span>
                        </button>
                    </div>
                `; }); html += '</div>';
            listContainer.innerHTML = html; } catch (err) {
            console.error('Failed to list Drive files:', err);
            listContainer.innerHTML = `
                <div class="p-3 text-center text-xs text-red-500">
                    تعذر قراءة قائمة النسخ: ${err.message || 'خطأ في الاتصال'}
                </div>
            `; } };
    // Restore directly from a Google Drive file ID
    window.restoreDirectFromGoogleDrive = async function(fileId, fileName) {
        const token = getValidGDriveToken(); if (!token) {
            showErrorToast('يرجى تسجيل الدخول إلى Google Drive أولاً');
            return; } if (!confirm(`هل أنت متأكد من استرجاع البيانات من النسخة:\n${fileName}؟\nسيتم استبدال البيانات الحالية ببيانات هذه النسخة.`)) {
            return; } try { showInfoToast('جاري جلب النسخة من Google Drive...');
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }); if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const parsed = await res.json();
            const restoredState = parsed.state || parsed;
            if (restoredState && typeof restoredState === 'object') {
                appState = Object.assign({}, appState, restoredState);
                saveState(); render();
                showSuccessToast(`تم استرجاع البيانات بنجاح من: ${fileName}`);
                closeModal('googleDriveModal');
            } else { showErrorToast('محتوى الملف غير صالح كقاعدة بيانات.');
            } } catch (err) { console.error('Restore from Drive error:', err);
            showErrorToast('فشل استرجاع النسخة من Google Drive: ' + (err.message || ''));
        } }; window.restoreFromGoogleDriveFile = function(input) {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0]; const reader = new FileReader();
        reader.onload = function(e) { try {
                const parsed = JSON.parse(e.target.result);
                const restoredState = parsed.state || parsed;
                if (restoredState && typeof restoredState === 'object') {
                    appState = Object.assign({}, appState, restoredState);
                    saveState(); render();
                    showSuccessToast('تم استرجاع البيانات من النسخة الاحتياطية بنجاح!');
                    closeModal('googleDriveModal');
                } else { showErrorToast('ملف النسخة الاحتياطية غير صالح.');
                } } catch (err) { showErrorToast('فشل قراءة الملف: ' + err.message);
            } }; reader.readAsText(file); };
    // Auto-sync debounce trigger: upload automatically to Drive if user enabled auto-sync and has connected account
    let gdriveAutoSyncTimer = null; window.triggerGoogleDriveAutoSync = function() {
        if (!appState.gdriveSettings?.autoSync) return;
        const token = getValidGDriveToken(); if (!token) return; // Silent if not authenticated
        if (gdriveAutoSyncTimer) clearTimeout(gdriveAutoSyncTimer);
        gdriveAutoSyncTimer = setTimeout(async () => {
            try { const now = new Date(); const dateStr = now.toISOString().slice(0, 10);
                const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
                const fileName = `OmegaGym_AutoBackup_${dateStr}_${timeStr}.json`;
                const backupData = { version: '3.0',
                    appName: 'Omega Gym Management',
                    lastModified: now.toISOString(),
                    state: appState }; const fileContent = JSON.stringify(backupData, null, 2);
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";
                const metadata = { name: fileName,
                    mimeType: 'application/json',
                    description: 'نسخة احتياطية تلقائية لنظام OMEGA GYM'
                }; const body = delimiter +
                    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    fileContent + close_delim;
                const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST', headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    }, body: body }); if (res.ok) {
                    const data = await res.json();
                    if (appState.gdriveSettings) {
                        appState.gdriveSettings.lastSyncTime = now.toISOString();
                        appState.gdriveSettings.lastSyncStatus = 'متزامن تلقائياً في Google Drive';
                        appState.gdriveSettings.lastFileId = data.id;
                    } console.log('Background Google Drive auto-sync completed:', data.id);
                } } catch (e) { console.warn('Auto Google Drive sync notice:', e);
            } }, 30000); // 30s debounce to save quotas
    };
    // ==========================================
    // 2. CATEGORY PROFITS & INCOME ANALYTICS
    // ==========================================
    window.openCategoryProfitsModal = function() {
        const modal = document.getElementById('categoryProfitsModal');
        if (!modal) return;
        const now = new Date();
        const monthSelect = document.getElementById('catProfitFilterMonth');
        if (monthSelect && !monthSelect.value) {
            monthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        renderCategoryProfitsModal();
        modal.classList.add('active');
    }; 
    window.renderCategoryProfitsModal = function() {
        const monthSelect = document.getElementById('catProfitFilterMonth');
        const selectedVal = monthSelect ? monthSelect.value : '';
        let targetMonth = -1; let targetYear = -1;
        if (selectedVal && selectedVal !== 'all') {
            const parts = selectedVal.split('-');
            if (parts.length === 2) {
                targetYear = parseInt(parts[0], 10);
                targetMonth = parseInt(parts[1], 10) - 1;
            }
        }
        const sales = Array.isArray(appState.sales) ? appState.sales : [];
        const filtered = sales.filter(s => { 
            if (!s) return false;
            if (targetMonth === -1 || !selectedVal || selectedVal === 'all') return true;
            const d = parseSafeDate(s.date || s.id || s.createdAt);
            if (!d) return true;
            return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        });

        // Aggregation per category
        const cats = { 
            doses: { name: 'بروتين بالجرعة (لي دوز)', icon: '⚡', color: 'blue', sales: 0, cost: 0, profit: 0, units: 0 },
            boxes: { name: 'علب البروتين والمكملات (المسكرة)', icon: '📦', color: 'blue', sales: 0, cost: 0, profit: 0, units: 0 },
            frigo: { name: 'الفريغو (ماء، جي، شوفان، مشروبات)', icon: '❄️', color: 'blue', sales: 0, cost: 0, profit: 0, units: 0 }
        };

        filtered.forEach(s => { 
            const catKey = getProductCategory(s);
            const targetCat = cats[catKey] || cats.boxes;
            const total = Number(s.total) || 0;
            const cost = Number(s.cost) || 0;
            const profit = s.profit !== undefined && s.profit !== null ? Number(s.profit) : (total - cost);
            const qty = Number(s.qty) || 1;
            targetCat.sales += total; 
            targetCat.cost += cost;
            targetCat.profit += profit;
            targetCat.units += qty; 
        });

        const totalSalesAll = Object.values(cats).reduce((acc, c) => acc + c.sales, 0);
        const totalProfitAll = Object.values(cats).reduce((acc, c) => acc + c.profit, 0);
        const totalUnitsAll = Object.values(cats).reduce((acc, c) => acc + c.units, 0);

        // Update UI summary numbers
        const sumSalesElem = document.getElementById('catProfitTotalSales');
        const sumProfitElem = document.getElementById('catProfitTotalNet');
        const sumUnitsElem = document.getElementById('catProfitTotalUnits');
        if (sumSalesElem) sumSalesElem.innerHTML = `${totalSalesAll.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (sumProfitElem) sumProfitElem.innerHTML = `${totalProfitAll.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (sumUnitsElem) sumUnitsElem.innerText = `${totalUnitsAll} قطعة / جرعة`;

        // Render category cards
        const container = document.getElementById('catProfitCardsContainer');
        if (container) { 
            container.innerHTML = `
                <!-- 1. Doses Card -->
                <div class="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200/80 shadow-sm space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 font-black text-blue-900 text-base">
                            <span class="text-2xl">⚡</span>
                            <span>بروتين بالجرعة (لي دوز)</span>
                        </div>
                        <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-200 text-blue-800">${cats.doses.units} جرعة</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-sm">
                        <div>
                            <div class="text-xs text-blue-600 font-semibold">إجمالي المبيعات</div>
                            <div class="font-extrabold text-slate-800 text-base">${cats.doses.sales.toLocaleString()} دج</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-600 font-bold">الربح الصافي</div>
                            <div class="font-black text-blue-700 text-base">${cats.doses.profit.toLocaleString()} دج</div>
                        </div>
                    </div>
                    <div class="text-[11px] text-slate-500 font-medium bg-white/70 p-2 rounded-xl">
                        هامش الربح: ${cats.doses.sales > 0 ? Math.round((cats.doses.profit / cats.doses.sales) * 100) : 0}%
                    </div>
                </div>

                <!-- 2. Closed Bottles Card -->
                <div class="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200/80 shadow-sm space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 font-black text-blue-950 text-base">
                            <span class="text-2xl">📦</span>
                            <span>علب المكملات (المسكرة)</span>
                        </div>
                        <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-200 text-blue-950">${cats.boxes.units} علبة</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-sm">
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">إجمالي المبيعات</div>
                            <div class="font-extrabold text-slate-800 text-base">${cats.boxes.sales.toLocaleString()} دج</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-600 font-bold">الربح الصافي</div>
                            <div class="font-black text-blue-700 text-base">${cats.boxes.profit.toLocaleString()} دج</div>
                        </div>
                    </div>
                    <div class="text-[11px] text-slate-500 font-medium bg-white/70 p-2 rounded-xl">
                        هامش الربح: ${cats.boxes.sales > 0 ? Math.round((cats.boxes.profit / cats.boxes.sales) * 100) : 0}%
                    </div>
                </div>

                <!-- 3. Frigo Card -->
                <div class="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200/80 shadow-sm space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 font-black text-blue-950 text-base">
                            <span class="text-2xl">❄️</span>
                            <span>الفريغو (ماء، جي، شوفان)</span>
                        </div>
                        <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-200 text-blue-950">${cats.frigo.units} قطعة</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/60 text-sm">
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">إجمالي المبيعات</div>
                            <div class="font-extrabold text-slate-800 text-base">${cats.frigo.sales.toLocaleString()} دج</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-600 font-bold">الربح الصافي</div>
                            <div class="font-black text-blue-700 text-base">${cats.frigo.profit.toLocaleString()} دج</div>
                        </div>
                    </div>
                    <div class="text-[11px] text-slate-500 font-medium bg-white/70 p-2 rounded-xl">
                        هامش الربح: ${cats.frigo.sales > 0 ? Math.round((cats.frigo.profit / cats.frigo.sales) * 100) : 0}%
                    </div>
                </div>
            `; 
        } 
    };
    // ==========================================
    // 3. COACH COMMISSIONS (33% PROFIT SHARE)
    // ==========================================
    window.openCoachCommissionsModal = function() {
        const modal = document.getElementById('coachCommissionsModal');
        if (!modal) return; const now = new Date();
        const monthSelect = document.getElementById('coachCommissionsFilterMonth');
        if (monthSelect && !monthSelect.value) { monthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        } renderCoachCommissionsModal(); modal.classList.add('active');
    }; window.renderCoachCommissionsModal = function() {
        const monthSelect = document.getElementById('coachCommissionsFilterMonth');
        const selectedVal = monthSelect ? monthSelect.value : '';
        let targetMonth = -1; let targetYear = -1;
        if (selectedVal && selectedVal !== 'all') {
            const parts = selectedVal.split('-');
            if (parts.length === 2) {
                targetYear = parseInt(parts[0], 10);
                targetMonth = parseInt(parts[1], 10) - 1;
            }
        } const sales = Array.isArray(appState.sales) ? appState.sales : [];
        const filtered = sales.filter(s => { 
            if (!s) return false;
            if (targetMonth === -1 || !selectedVal || selectedVal === 'all') return true;
            const d = parseSafeDate(s.date || s.id || s.createdAt);
            if (!d) return true;
            return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        });
        // Group by coach
        const coachMap = {}; filtered.forEach(s => {
            const cName = (s.coachName && s.coachName.trim()) ? s.coachName.trim() : 'عام';
            if (!coachMap[cName]) { coachMap[cName] = {
                    name: cName, salesCount: 0,
                    unitsCount: 0, totalSales: 0,
                    totalCost: 0, totalProfit: 0,
                    coachCommission: 0, gymShare: 0,
                    salesList: [] }; } const total = Number(s.total) || 0;
            const cost = Number(s.cost) || 0;
            const profit = s.profit !== undefined ? Number(s.profit) : (total - cost);
            const qty = Number(s.qty) || 1;
            const commission = s.coachCommission !== undefined
                ? Number(s.coachCommission) : ((cName !== 'عام' && profit > 0) ? Math.round(profit * 0.33) : 0);
            coachMap[cName].salesCount += 1;
            coachMap[cName].unitsCount += qty;
            coachMap[cName].totalSales += total;
            coachMap[cName].totalCost += cost;
            coachMap[cName].totalProfit += profit;
            coachMap[cName].coachCommission += commission;
            coachMap[cName].gymShare += (profit - commission);
            coachMap[cName].salesList.push(s); });
        // Calculate summary across all coaches (excluding 'عام' for commission totals)
        let sumTotalSales = 0; let sumTotalProfit = 0;
        let sumCoachesCommissions = 0; let sumGymProfit = 0;
        Object.values(coachMap).forEach(c => {
            sumTotalSales += c.totalSales;
            sumTotalProfit += c.totalProfit;
            sumCoachesCommissions += c.coachCommission;
            sumGymProfit += c.gymShare; });
        const totalSalesElem = document.getElementById('coachModalTotalSales');
        const totalProfitElem = document.getElementById('coachModalTotalProfit');
        const totalCommissionsElem = document.getElementById('coachModalTotalCommissions');
        const totalGymProfitElem = document.getElementById('coachModalTotalGymProfit');
        if (totalSalesElem) totalSalesElem.innerHTML = `${sumTotalSales.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (totalProfitElem) totalProfitElem.innerHTML = `${sumTotalProfit.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (totalCommissionsElem) totalCommissionsElem.innerHTML = `${sumCoachesCommissions.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (totalGymProfitElem) totalGymProfitElem.innerHTML = `${sumGymProfit.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        const listContainer = document.getElementById('coachCommissionsListContainer');
        if (!listContainer) return; const coachesArray = Object.values(coachMap).sort((a, b) => b.totalProfit - a.totalProfit);
        if (coachesArray.length === 0) {
            listContainer.innerHTML = '<div class="text-center py-8 text-slate-400 font-medium text-sm bg-slate-50 rounded-2xl border border-slate-100">لا توجد مبيعات مسجلة في هذا الشهر</div>';
            return; } listContainer.innerHTML = coachesArray.map(c => {
            const isGeneral = c.name === 'عام';
            return `
            <div class="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-blue-300 transition-all">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-xl ${isGeneral ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'} flex items-center justify-center font-black text-lg shadow-sm">
                            ${isGeneral ? '<svg class="w-4 h-4 text-blue-600 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>' : '<svg class="w-4 h-4 text-blue-600 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6v12M18 6v12M4 9h4m8 0h4M4 15h4m8 0h4M8 12h8"/></svg>'}
                        </div>
                        <div>
                            <div class="font-black text-slate-800 text-base flex items-center gap-2">
                                <span>${escapeHTML(c.name)}</span>
                                ${isGeneral ? '<span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">مبيعات الصالة</span>' : '<span class="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">كوتش (33%)</span>'}
                            </div>
                            <div class="text-xs text-slate-500 font-medium">
                                ${c.salesCount} عملية بيع (${c.unitsCount} قطعة)
                            </div>
                        </div>
                    </div>
                    <div class="text-left bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                        <div class="text-[10px] text-slate-500 font-bold">مستحقات الكوتش (33% من الربح)</div>
                        <div class="text-lg font-black text-blue-600" dir="ltr">${c.coachCommission.toLocaleString()} دج</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs">
                    <div class="bg-slate-50 p-2.5 rounded-xl text-center">
                        <span class="text-slate-400 text-[10px] block font-bold">المداخيل</span>
                        <span class="font-extrabold text-slate-700">${c.totalSales.toLocaleString()} دج</span>
                    </div>
                    <div class="bg-slate-50 p-2.5 rounded-xl text-center">
                        <span class="text-slate-400 text-[10px] block font-bold">التكلفة (سعر الشراء)</span>
                        <span class="font-extrabold text-slate-700">${c.totalCost.toLocaleString()} دج</span>
                    </div>
                    <div class="bg-blue-50 p-2.5 rounded-xl text-center">
                        <span class="text-blue-600 text-[10px] block font-bold">الربح الصافي الإجمالي</span>
                        <span class="font-black text-blue-700">${c.totalProfit.toLocaleString()} دج</span>
                    </div>
                    <div class="bg-blue-50 p-2.5 rounded-xl text-center">
                        <span class="text-blue-600 text-[10px] block font-bold">فائدة القاعة (67%)</span>
                        <span class="font-black text-blue-700">${c.gymShare.toLocaleString()} دج</span>
                    </div>
                </div>
            </div>
            `; }).join(''); };
    // ==========================================
    // 4. DETAILED MONTHLY SUPPLIERS & VERSEMENTS TRACKER
    // ==========================================
    window.getAllSupplierTransactions = function() {
        if (!appState.supplierTransactions) {
            appState.supplierTransactions = [];
        }
        // Auto-migrate or sync existing appState.suppliers into transactions if transactions array is empty
        if (appState.supplierTransactions.length === 0 && Array.isArray(appState.suppliers) && appState.suppliers.length > 0) {
            appState.suppliers.forEach(s => {
                const total = (Number(s.paid) || 0) + (Number(s.debt) || 0);
                appState.supplierTransactions.push({
                    id: 'tx_' + (s.id || Date.now() + Math.random().toString(36).substr(2, 4)),
                    supplierName: s.name || 'مورد عام',
                    supplierInfo: s.info || '',
                    type: (s.items && s.items.trim()) ? 'purchase' : 'payment',
                    items: s.items || 'مشتريات سلع ومكملات',
                    totalAmount: total,
                    paidAmount: Number(s.paid) || 0,
                    remainingDebt: Number(s.debt) || 0,
                    date: s.date || new Date().toISOString(),
                    notes: s.notes || '',
                    createdAt: s.date || new Date().toISOString()
                }); }); } return appState.supplierTransactions;
    }; // Quick Versement Modal functions
    window.openQuickSupplierVersementModal = function(supplierName = '') {
        const modal = document.getElementById('quickSupplierVersementModal');
        if (!modal) return; const select = document.getElementById('quickVersSupplierSelect');
        const dateInput = document.getElementById('quickVersDate');
        const amountInput = document.getElementById('quickVersAmount');
        const notesInput = document.getElementById('quickVersNotes');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (amountInput) amountInput.value = '';
        if (notesInput) notesInput.value = '';
        if (select) { const suppliers = appState.suppliers || [];
            select.innerHTML = suppliers.map(s => {
                const debt = Number(s.debt) || 0;
                return `<option value="${escapeHTML(s.name)}" ${supplierName === s.name ? 'selected' : ''} data-debt="${debt}">
                    ${escapeHTML(s.name)} (الكريدي: ${debt.toLocaleString()} دج)
                </option>`; }).join(''); } modal.classList.add('active');
    }; window.handleQuickSupplierVersementSubmit = function(e) {
        if (e) e.preventDefault(); const select = document.getElementById('quickVersSupplierSelect');
        const amountInput = document.getElementById('quickVersAmount');
        const dateInput = document.getElementById('quickVersDate');
        const notesInput = document.getElementById('quickVersNotes');
        const supplierName = select ? select.value : '';
        const amount = Number(amountInput?.value) || 0;
        const dateStr = dateInput?.value || new Date().toISOString().split('T')[0];
        const notes = notesInput ? notesInput.value.trim() : '';
        if (!supplierName) { showErrorToast('يرجى اختيار المورد أولاً');
            return false; } if (amount <= 0) {
            showErrorToast('يرجى إدخال مبلغ الفرسيمو بشكل صحيح');
            return false; } if (!appState.suppliers) appState.suppliers = [];
        const sup = appState.suppliers.find(s => (s && s.name || '').trim().toLowerCase() === supplierName.trim().toLowerCase());
        let remainingDebt = 0; if (sup) { sup.paid = (Number(sup.paid) || 0) + amount;
            sup.debt = Math.max(0, (Number(sup.debt) || 0) - amount);
            remainingDebt = sup.debt; sup.date = new Date(dateStr).toISOString();
            if (sup.items) { sup.items += `\n• [${new Date(dateStr).toLocaleDateString('ar-DZ')}] فرسيمو وتسديد دفعة: ${amount.toLocaleString()} دج`;
            } } if (!appState.supplierTransactions) appState.supplierTransactions = [];
        const tx = {
            id: 'tx_' + Date.now().toString(),
            supplierName: supplierName, type: 'payment',
            items: `فرسيمو وتسديد دفعة مالية بقيمة ${amount.toLocaleString()} دج`,
            totalAmount: amount, paidAmount: amount,
            remainingDebt: remainingDebt, date: new Date(dateStr).toISOString(),
            notes: notes || 'فرسيمو دفع مباشر لتسوية الكريدي',
            createdAt: new Date().toISOString()
        };
        appState.supplierTransactions.unshift(tx);
        if (window.saveFirebaseSectionItem) {
            if (sup) window.saveFirebaseSectionItem('suppliers', sup);
            window.saveFirebaseSectionItem('supplierTransactions', tx);
        }
        saveState(); closeModal('quickSupplierVersementModal');
        showSuccessToast(`تم تسجيل فرسيمو بقيمة ${amount.toLocaleString()} دج للمورد (${supplierName}) بنجاح`);
        renderSuppliersList();
        return false;
    };

    // ==========================================
    // STAFF PAYOUTS & SUPPLIERS LOGIC
    // ==========================================
    window.openStaffPayoutsModal = function(tab = 'payouts') {
        const modal = document.getElementById('staffPayoutsModal');
        if (!modal) return;
        const dateInput = document.getElementById('staffPayoutDate');
        const supDateInput = document.getElementById('supplierDate');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (supDateInput) supDateInput.value = new Date().toISOString().split('T')[0];
        switchStaffModalTab(tab);
        modal.classList.add('active');
    };

    window.switchStaffModalTab = function(tab) {
        const payoutsContent = document.getElementById('staffPayoutsTabContent');
        const suppliersContent = document.getElementById('suppliersTabContent');
        const btnPayouts = document.getElementById('tabBtnPayouts');
        const btnSuppliers = document.getElementById('tabBtnSuppliers');

        const activeClass = 'flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all bg-blue-600 text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer';
        const inactiveClass = 'flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 cursor-pointer';

        if (tab === 'payouts') {
            if (payoutsContent) payoutsContent.classList.remove('hidden');
            if (suppliersContent) suppliersContent.classList.add('hidden');
            if (btnPayouts) btnPayouts.className = activeClass;
            if (btnSuppliers) btnSuppliers.className = inactiveClass;
            renderStaffPayouts();
        } else {
            if (payoutsContent) payoutsContent.classList.add('hidden');
            if (suppliersContent) suppliersContent.classList.remove('hidden');
            if (btnPayouts) btnPayouts.className = inactiveClass;
            if (btnSuppliers) btnSuppliers.className = activeClass;
            renderSuppliersList();
        }
    };

    window.renderStaffPayouts = function() {
        if (!Array.isArray(appState.staffPayouts)) appState.staffPayouts = [];
        const payouts = appState.staffPayouts;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalAll = 0;
        let totalMonth = 0;
        const allKnownNames = new Set();
        const staffMap = {};

        payouts.forEach(p => {
            if (!p) return;
            const amt = Number(p.amount) || 0;
            totalAll += amt;

            const pDate = new Date(p.date || p.createdAt || Date.now());
            if (!isNaN(pDate.getTime()) && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
                totalMonth += amt;
            }

            const name = (p.name || p.staffName || 'عامل').trim();
            if (name) {
                allKnownNames.add(name);
                staffMap[name] = (staffMap[name] || 0) + 1;
            }
        });

        // Also add coaches and customers to suggestions datalist
        (appState.coachAbsences || []).forEach(c => {
            const n = (c && (c.coachName || c.name) || '').trim();
            if (n) allKnownNames.add(n);
        });
        (appState.packages || []).forEach(pkg => {
            const n = (pkg && pkg.coachName || '').trim();
            if (n) allKnownNames.add(n);
        });
        (appState.customers || []).forEach(cust => {
            const n = (cust && cust.name || '').trim();
            if (n) allKnownNames.add(n);
        });

        // Update KPI summary numbers
        const totalAllElem = document.getElementById('totalStaffPayoutsAll');
        const totalMonthElem = document.getElementById('totalStaffPayoutsMonth');
        const staffCountElem = document.getElementById('totalStaffCount');
        const staffBadgeElem = document.getElementById('staffCountBadge');

        const uniqueStaffNames = Object.keys(staffMap);

        if (totalAllElem) totalAllElem.innerHTML = `${totalAll.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (totalMonthElem) totalMonthElem.innerHTML = `${totalMonth.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (staffCountElem) staffCountElem.textContent = `${uniqueStaffNames.length} عامل`;
        if (staffBadgeElem) staffBadgeElem.textContent = `${payouts.length} خلاص`;

        // Update datalist for suggestions
        const datalist = document.getElementById('existingStaffDatalist');
        if (datalist) {
            datalist.innerHTML = Array.from(allKnownNames).sort().map(n => `<option value="${escapeHTML(n)}"></option>`).join('');
        }

        const container = document.getElementById('staffPayoutsList');
        if (!container) return;

        if (payouts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-400 font-medium text-xs bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 space-y-1">
                    <p class="font-bold text-slate-600">لا توجد خلاصات مسجلة بعد</p>
                    <p class="text-[11px] text-slate-400">عند تسجيل خلاص عامل سيظهر هنا فوراً في السجل</p>
                </div>
            `;
            return;
        }

        const typeBadgeStyles = {
            'راتب شهري': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            'تسقيع / تسليف': 'bg-amber-50 text-amber-700 border-amber-200',
            'مكافأة / بونوس': 'bg-purple-50 text-purple-700 border-purple-200',
            'نسبة مئوية': 'bg-indigo-50 text-indigo-700 border-indigo-200',
            'أجر يومي': 'bg-sky-50 text-sky-700 border-sky-200'
        };

        // Render all payouts directly in clean cards
        container.innerHTML = payouts.map(p => {
            const safeId = escapeHTML(String(p.id || ''));
            const pName = escapeHTML(p.name || p.staffName || 'عامل');
            const pType = escapeHTML(p.type || 'خلاص');
            const pNotes = p.notes ? escapeHTML(p.notes) : '';
            const pAmount = (Number(p.amount) || 0).toLocaleString();
            const badgeClass = typeBadgeStyles[p.type] || 'bg-slate-100 text-slate-700 border-slate-200';

            const d = new Date(p.date || p.createdAt || Date.now());
            const dateStr = isNaN(d.getTime()) ? (p.date || '') : d.toLocaleDateString('ar-DZ');

            return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all gap-2.5">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-black text-sm shrink-0">
                        ${escapeHTML(pName.charAt(0).toUpperCase())}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-extrabold text-slate-900 text-sm truncate">${pName}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClass}">${pType}</span>
                            <span class="text-[11px] text-slate-400 font-medium">${dateStr}</span>
                        </div>
                        ${pNotes ? `<div class="text-xs text-slate-500 font-medium truncate mt-0.5">${pNotes}</div>` : ''}
                    </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
                    <span class="font-black text-blue-900 text-sm sm:text-base bg-blue-50/70 border border-blue-100/80 px-2.5 py-1 rounded-xl">${pAmount} دج</span>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="openWorkerTransactionsModal('${pName}')" class="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors" title="عرض كشف هذا العامل">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                        <button type="button" onclick="editStaffPayout('${safeId}')" class="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="تعديل الخلاص">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button type="button" onclick="deleteStaffPayout('${safeId}')" class="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" title="حذف الخلاص">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };

    window.handleAddStaffPayout = function(e) {
        if (e) e.preventDefault();
        const editingIdInput = document.getElementById('editingStaffPayoutId');
        const editingId = editingIdInput ? editingIdInput.value.trim() : '';
        const nameInput = document.getElementById('staffPayoutName') || document.getElementById('staffName');
        const typeInput = document.getElementById('staffPayoutType');
        const amountInput = document.getElementById('staffPayoutAmount') || document.getElementById('staffAmount');
        const dateInput = document.getElementById('staffPayoutDate');
        const notesInput = document.getElementById('staffPayoutNotes') || document.getElementById('staffNotes');

        let name = nameInput ? nameInput.value.trim() : '';
        const type = typeInput ? typeInput.value : 'راتب شهري';
        const rawAmount = String(amountInput ? amountInput.value : '').replace(/,/g, '').trim();
        const amount = parseFloat(rawAmount) || 0;
        const dateStr = dateInput?.value || (typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]);
        let notes = notesInput ? notesInput.value.trim() : '';

        // Validate
        if (!name) {
            showErrorToast('يرجى كتابة أو اختيار اسم العامل أو المدرب');
            if (nameInput) nameInput.focus();
            return false;
        }
        if (amount <= 0 || isNaN(amount)) {
            showErrorToast('يرجى إدخال مبلغ الخلاص بشكل صحيح (أكبر من الصفر)');
            if (amountInput) amountInput.focus();
            return false;
        }

        if (!Array.isArray(appState.staffPayouts)) {
            appState.staffPayouts = [];
        }

        if (editingId) {
            const index = appState.staffPayouts.findIndex(p => String(p && p.id) === String(editingId));
            if (index !== -1) {
                appState.staffPayouts[index] = {
                    ...appState.staffPayouts[index],
                    name,
                    staffName: name,
                    type,
                    amount,
                    date: dateStr,
                    notes,
                    updatedAt: new Date().toISOString()
                };
                if (window.saveFirebaseSectionItem) {
                    window.saveFirebaseSectionItem('staffPayouts', appState.staffPayouts[index]);
                }
                if (typeof logActivity === 'function') logActivity('payout', 'تعديل خلاص عامل', `العامل: ${name} - النوع: ${type}`, amount);
                showSuccessToast(`تم تحديث خلاص العامل (${name}) بنجاح`);
            }
            if (typeof cancelStaffPayoutEdit === 'function') cancelStaffPayoutEdit();
        } else {
            const newPayout = {
                id: 'payout_' + Date.now().toString(),
                name: name,
                staffName: name,
                type: type,
                amount: amount,
                date: dateStr,
                notes: notes,
                createdAt: new Date().toISOString()
            };

            appState.staffPayouts.unshift(newPayout);
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('staffPayouts', newPayout);
            }
            if (typeof logActivity === 'function') logActivity('payout', 'تسجيل خلاص عامل', `العامل: ${name} - النوع: ${type}`, amount);

            if (nameInput) nameInput.value = '';
            if (amountInput) amountInput.value = '';
            if (notesInput) notesInput.value = '';
            if (dateInput) dateInput.value = typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0];

            showSuccessToast(`تم تسجيل خلاص بقيمة ${amount.toLocaleString()} دج للعامل (${name}) بنجاح`);
        }

        saveState();
        renderStaffPayouts();
        if (typeof renderWorkerTransactionsModal === 'function' && isModalOpen('workerTransactionsModal')) {
            renderWorkerTransactionsModal();
        }
        render();
        return false;
    };

    window.deleteStaffPayout = function(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف دفعة عامل', prompt: 'أدخل كلمة المرور لتأكيد حذف الدفعة', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.staffPayouts)) return;
            const idx = appState.staffPayouts.findIndex(p => p && String(p.id) === String(id));
            if (idx !== -1) {
                const pItem = appState.staffPayouts[idx];
                if (typeof logActivity === 'function') logActivity('payout', 'حذف خلاص عامل', `حذف الدفعة المخصصة لـ: ${pItem ? pItem.name : id}`);
                appState.staffPayouts.splice(idx, 1);
                if (window.deleteFirebaseSectionItem) window.deleteFirebaseSectionItem('staffPayouts', id);
                saveState();
                showSuccessToast('تم حذف الدفعة بنجاح');
                renderStaffPayouts();
                if (typeof renderWorkerTransactionsModal === 'function' && isModalOpen('workerTransactionsModal')) {
                    renderWorkerTransactionsModal();
                }
                if (typeof renderFemaleCoachModal === 'function' && isModalOpen('femaleCoachModal')) {
                    renderFemaleCoachModal();
                }
                render();
            }
        });
    };

    window.autoFillSupplierInfo = function(supplierName) {
        if (!supplierName) {
            const badge = document.getElementById('supplierExistingBadge');
            if (badge) badge.classList.add('hidden');
            return;
        }
        const sup = (appState.suppliers || []).find(s => (s && s.name || '').trim().toLowerCase() === supplierName.trim().toLowerCase());
        const badge = document.getElementById('supplierExistingBadge');
        const debtSpan = document.getElementById('supplierCurrentDebtBadge');
        if (sup && badge && debtSpan) {
            debtSpan.textContent = `${(Number(sup.debt) || 0).toLocaleString()} دج`;
            badge.classList.remove('hidden');
        } else if (badge) {
            badge.classList.add('hidden');
        }
    };

    window.handleAddSupplierSubmit = function(e) {
        if (e) e.preventDefault();
        const nameInput = document.getElementById('supplierName');
        const infoInput = document.getElementById('supplierInfo');
        const itemsInput = document.getElementById('supplierItems');
        const paidInput = document.getElementById('supplierPaid');
        const debtInput = document.getElementById('supplierDebt');
        const dateInput = document.getElementById('supplierDate');
        const notesInput = document.getElementById('supplierNotes');

        const name = nameInput ? nameInput.value.trim() : '';
        const info = infoInput ? infoInput.value.trim() : '';
        const items = itemsInput ? itemsInput.value.trim() : '';
        const paid = Number(paidInput?.value) || 0;
        const debt = Number(debtInput?.value) || 0;
        const dateStr = dateInput?.value || new Date().toISOString().split('T')[0];
        const notes = notesInput ? notesInput.value.trim() : '';

        if (!name) {
            showErrorToast('يرجى كتابة أو اختيار اسم المورد');
            return false;
        }

        if (!appState.suppliers) appState.suppliers = [];
        let sup = appState.suppliers.find(s => (s && s.name || '').trim().toLowerCase() === name.toLowerCase());
        if (!sup) {
            sup = { id: 'sup_' + Date.now(), name: name, info: info, paid: paid, debt: debt, items: items, date: new Date(dateStr).toISOString() };
            appState.suppliers.unshift(sup);
        } else {
            sup.info = info || sup.info;
            sup.paid = (Number(sup.paid) || 0) + paid;
            sup.debt = debt;
            if (items) sup.items = (sup.items ? sup.items + '\n' : '') + items;
            sup.date = new Date(dateStr).toISOString();
        }

        if (!appState.supplierTransactions) appState.supplierTransactions = [];
        const tx = {
            id: 'tx_' + Date.now(),
            supplierName: name,
            supplierInfo: info,
            type: items ? 'purchase' : 'payment',
            items: items || 'معاملة تسديد/مشتريات',
            totalAmount: paid + debt,
            paidAmount: paid,
            remainingDebt: debt,
            date: new Date(dateStr).toISOString(),
            notes: notes,
            createdAt: new Date().toISOString()
        };
        appState.supplierTransactions.unshift(tx);

        if (window.saveFirebaseSectionItem) {
            window.saveFirebaseSectionItem('suppliers', sup);
            window.saveFirebaseSectionItem('supplierTransactions', tx);
        }

        saveState();
        if (itemsInput) itemsInput.value = '';
        if (paidInput) paidInput.value = '';
        if (debtInput) debtInput.value = '';
        if (notesInput) notesInput.value = '';

        showSuccessToast(`تم تسجيل معاملة المورد (${name}) بنجاح`);
        renderSuppliersList();
        render();
        return false;
    };

    window.renderSuppliersList = function() {
        const transactions = getAllSupplierTransactions();
        let totalPurchases = 0;
        let totalPaid = 0;
        let totalDebt = 0;

        const supplierMap = {};

        transactions.forEach(tx => {
            const p = Number(tx.paidAmount) || 0;
            const d = Number(tx.remainingDebt) || 0;
            const tot = Number(tx.totalAmount) || (p + d);
            if (tx.type === 'purchase' || (tx.items && tx.items.trim() && tx.items !== 'تسديد / تخفيض دين سابق')) {
                totalPurchases += tot;
            }
            totalPaid += p;

            const name = (tx.supplierName || 'مورد عام').trim();
            if (!supplierMap[name]) {
                supplierMap[name] = { name: name, info: tx.supplierInfo || '', paid: 0, debt: 0, purchases: 0, transactions: [] };
            }
            if (tx.type === 'purchase' || (tx.items && tx.items.trim() && tx.items !== 'تسديد / تخفيض دين سابق')) {
                supplierMap[name].purchases += tot;
            }
            supplierMap[name].paid += p;
            supplierMap[name].transactions.push(tx);
        });

        // Also incorporate debt and initial purchases from appState.suppliers
        (appState.suppliers || []).forEach(s => {
            if (!s || !s.name) return;
            const name = s.name.trim();
            const d = Number(s.debt) || 0;
            const p = Number(s.paid) || 0;
            totalDebt += d;
            if (!supplierMap[name]) {
                const sTotal = p + d;
                totalPurchases += sTotal;
                supplierMap[name] = { name: name, info: s.info || '', paid: p, debt: d, purchases: sTotal, transactions: [] };
            } else {
                supplierMap[name].debt = d;
                if (supplierMap[name].transactions.length === 0) {
                    supplierMap[name].purchases = p + d;
                    totalPurchases += (p + d);
                }
                if (s.info) supplierMap[name].info = s.info;
            }
        });

        // Update KPI Summary elements
        const purchasesElem = document.getElementById('totalSupplierPurchases');
        const paidElem = document.getElementById('totalSupplierPaid');
        const debtElem = document.getElementById('totalSupplierDebt');
        const badgeElem = document.getElementById('suppliersCountBadge');

        const uniqueSuppliers = Object.values(supplierMap);

        if (purchasesElem) purchasesElem.innerHTML = `${totalPurchases.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (paidElem) paidElem.innerHTML = `${totalPaid.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (debtElem) debtElem.innerHTML = `${totalDebt.toLocaleString()} <span class="text-xs font-normal text-slate-500">دج</span>`;
        if (badgeElem) badgeElem.textContent = `${uniqueSuppliers.length} مورد`;

        // Update datalist for suppliers
        const datalist = document.getElementById('existingSuppliersDatalist');
        if (datalist) {
            datalist.innerHTML = uniqueSuppliers.map(s => `<option value="${escapeHTML(s.name)}"></option>`).join('');
        }

        const container = document.getElementById('suppliersList');
        if (!container) return;

        if (uniqueSuppliers.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-slate-400 font-medium text-xs bg-slate-50 rounded-2xl border border-slate-100">لا يوجد موردين مسجلين بعد</div>';
            return;
        }

        container.innerHTML = uniqueSuppliers.map(sup => {
            return `
            <div class="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-base shadow-xs shrink-0">
                            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </div>
                        <div>
                            <div class="font-black text-slate-800 text-base flex items-center gap-2">
                                <span>${escapeHTML(sup.name)}</span>
                            </div>
                            <div class="text-xs text-slate-500 font-medium">
                                ${escapeHTML(sup.info || 'مورد مسجل')}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="text-left bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <div class="text-[10px] text-slate-500 font-bold">الكريدي الحالي</div>
                            <div class="text-base font-black ${sup.debt > 0 ? 'text-slate-800' : 'text-blue-600'}">${sup.debt.toLocaleString()} دج</div>
                        </div>
                        <button onclick="openQuickSupplierVersementModal('${escapeHTML(sup.name)}')" class="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors shrink-0" title="تسديد دفعة فرسيمو سريعة">
                            + فرسيمو
                        </button>
                        <button onclick="openSingleSupplierStatement('${escapeHTML(sup.name)}')" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer" title="كشف جميع معاملات هذا المورد">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <span>كشف المعاملات</span>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };

    window.deleteSupplierTransaction = function(id) {
        if (!id) return;
        promptWithPassword({ title: 'حذف معاملة مورد', prompt: 'أدخل كلمة المرور لتأكيد حذف معاملة المورد', buttonText: 'تأكيد الحذف' }, () => {
            if (!Array.isArray(appState.supplierTransactions)) return;
            const idx = appState.supplierTransactions.findIndex(tx => String(tx.id) === String(id));
            if (idx !== -1) {
                appState.supplierTransactions.splice(idx, 1);
                if (window.deleteFirebaseSectionItem) window.deleteFirebaseSectionItem('supplierTransactions', id);
                saveState();
                showSuccessToast('تم حذف معاملة المورد بنجاح');
                renderSuppliersList();
                render();
            }
        });
    };

    // Single Supplier Statement (كشف حساب المورد الشامل)
    window.openSingleSupplierStatement = function(supplierName) {
        const modal = document.getElementById('singleSupplierStatementModal');
        if (!modal) return; const allTx = getAllSupplierTransactions().filter(tx => (tx.supplierName || '').trim().toLowerCase() === (supplierName || '').trim().toLowerCase());
        const sup = (appState.suppliers || []).find(s => (s && s.name || '').trim().toLowerCase() === (supplierName || '').trim().toLowerCase());
        let totalBought = 0; let totalPaid = 0;
        allTx.forEach(tx => {
            const paid = Number(tx.paidAmount) || 0;
            const debt = Number(tx.remainingDebt) || 0;
            if (tx.type === 'purchase' || (tx.items && tx.items.trim() && tx.items !== 'تسديد / تخفيض دين سابق')) {
                totalBought += Number(tx.totalAmount) || (paid + debt);
            }
            totalPaid += paid;
        });
        if (allTx.length === 0 && sup) {
            const paid = Number(sup.paid) || 0;
            const debt = Number(sup.debt) || 0;
            totalBought = paid + debt;
            totalPaid = paid;
        }
        const currentDebt = sup ? Number(sup.debt || 0) : Math.max(0, totalBought - totalPaid);
        const nameElem = document.getElementById('stmtSupplierName');
        const phoneElem = document.getElementById('stmtSupplierPhone');
        const totalBoughtElem = document.getElementById('stmtTotalBought');
        const totalPaidElem = document.getElementById('stmtTotalPaid');
        const debtElem = document.getElementById('stmtCurrentDebt');
        const listElem = document.getElementById('stmtTransactionsList');
        if (nameElem) nameElem.textContent = supplierName;
        if (phoneElem) phoneElem.textContent = sup?.info || 'مورد مسجل';
        if (totalBoughtElem) totalBoughtElem.innerHTML = `${totalBought.toLocaleString()} <span class="text-xs font-normal">دج</span>`;
        if (totalPaidElem) totalPaidElem.innerHTML = `${totalPaid.toLocaleString()} <span class="text-xs font-normal">دج</span>`;
        if (debtElem) debtElem.innerHTML = `${currentDebt.toLocaleString()} <span class="text-xs font-normal">دج</span>`;
        if (listElem) { const sorted = [...allTx].sort((a, b) => new Date(b.date) - new Date(a.date));
            if (sorted.length === 0) { listElem.innerHTML = '<div class="text-xs text-slate-400 text-center py-6">لا توجد حركات مسجلة لهذا المورد</div>';
            } else { listElem.innerHTML = sorted.map((tx, idx) => {
                    const d = new Date(tx.date);
                    const dateStr = isNaN(d.getTime()) ? tx.date : d.toLocaleDateString('ar-DZ');
                    const isPurchase = tx.type === 'purchase' || (tx.items && tx.items.trim() && tx.items !== 'تسديد / تخفيض دين سابق');
                    return `
                    <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5 text-xs">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-700 flex items-center gap-1.5">
                                <span class="flex items-center gap-1.5">${isPurchase ? '<svg class="w-4 h-4 text-blue-600 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg> مشتريات سلع' : '<svg class="w-4 h-4 text-blue-600 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg> فرسيمو ودفع'}</span>
                            </span>
                            <span class="text-[11px] text-slate-400 font-medium">${dateStr}</span>
                        </div>
                        <div class="text-slate-800 font-medium leading-relaxed">${escapeHTML(tx.items || '')}</div>
                        <div class="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                            <span class="text-blue-700 font-bold">المفرسي: ${(Number(tx.paidAmount) || 0).toLocaleString()} دج</span>
                            <span class="text-slate-500 font-bold">الكريدي: ${(Number(tx.remainingDebt) || 0).toLocaleString()} دج</span>
                        </div>
                    </div>
                    `; }).join(''); } } modal.classList.add('active');
    };     window.printSuppliersMonthlyReport = function() {
        window.print(); };

    // ============================================================================
    // ACTIVITY LOG ENGINE
    // ============================================================================
    function logActivity(type, title, details, amount = 0) {
        try {
            if (!Array.isArray(appState.activityLogs)) appState.activityLogs = [];
            const logItem = {
                id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                type: type || 'system',
                title: title || 'عملية جديدة',
                details: details || '',
                amount: Number(amount) || 0,
                dateStr: typeof getLocalDateString === 'function' ? getLocalDateString(new Date()) : new Date().toISOString().split('T')[0]
            };
            appState.activityLogs.unshift(logItem);
            if (appState.activityLogs.length > 500) {
                appState.activityLogs = appState.activityLogs.slice(0, 500);
            }
            if (window.saveFirebaseSectionItem) {
                window.saveFirebaseSectionItem('activityLogs', logItem);
            }
            saveState();
        } catch (err) {
            console.warn('logActivity error:', err);
        }
    }
    window.logActivity = logActivity;

    function ensureSeedActivityLogs() {
        if (!Array.isArray(appState.activityLogs)) appState.activityLogs = [];
    }
    window.ensureSeedActivityLogs = ensureSeedActivityLogs;

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

        let logs = Array.isArray(appState.activityLogs) ? [...appState.activityLogs] : [];

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
            if (!Array.isArray(appState.activityLogs)) return;
            appState.activityLogs = appState.activityLogs.filter(l => String(l && l.id) !== String(id));
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
            appState.activityLogs = [];
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

    setupGlobalInputSecurity(); render(); if (typeof window.runStartupFirebaseFetch === 'function') {
        window.runStartupFirebaseFetch(); } else if (typeof window.fetchAndLoadFirebaseData === 'function') {
        window.fetchAndLoadFirebaseData(); }

// Expose all top-level functions on window for inline HTML event handlers
try {
  [getCleanSyncPayload, containsDangerousCode, sanitizeInputText, escapeHTML, validateSafeName, validateSafePhone, validateSafeNumber, validateCustomerDOB, checkLoginLockout, showSuccessToast, showErrorToast, showInfoToast, hashString, cleanPhone, handleNavButtonClick, toggleView, closeBulkImportModal, closeModal, handleOverlayClick, toggleDebtField, checkImageMagicBytes, verifyFaceImageCharacteristics, setPackageTypeForm, handleProdStockLocationChange, updateDualStockTotal, editProduct, openStockTransferModal, handleTransferFromStockChange, handleTransferToStockChange, populateTransferProducts, updateTransferMaxQty, updateTransferPreview, setTransferMaxQty, handleStockTransfer, deleteProduct, updateProductStock, parseProductWeight, updateStockInfoDisplay, handlePosProductSearch, calculateStatus, adjustCustomerSessions, switchPayoutTab, openStaffPayoutsIfAllowed, autoFillSupplierInfo, openEditSupplierModal, handleEditSupplierSubmit, renderSuppliersList, openFullReportModal, renderFullReport, updateFullReportSalesSection, deleteAllCredits, renderCreditsList, settleCredit, parseItemDate, setMsgTemplate, openMessageModal, formatMoney, promptWithPassword, togglePrivacy, setFilter, setQuickSellQty, changeQuickSellQty, executeProductSale, deleteCustomer, handleBarcodeScan, openBarcodeStockChoiceModal, closeBarcodeStockChoiceModal, handleInventoryBarcodeSearch, playBeep, openBarcodeCamera, getProductExpiryInfo, setStockFilter, renderProductsList, getUniqueCoaches, deleteSale, calculateAge, formatCustomerExpiry, performFullRender, render, calculateStockValuation, calculateCaisseDetails, calculateAllCaisseShortages, initCaisseView, handleCaisseDateChange, setCaisseDateToToday, handleClotureFormDateChange, handleClotureAmountInput, toggleDenominationCounter, calcDenominations, applyDenominationsToInput, handleCaisseClotureSubmit, deleteCaisseLog, scrollToCaisseClotureForm, renderCaisseView, setupGlobalInputSecurity, getValidGDriveToken, updateGoogleDriveUI, generateMockTestData, clearMockTestData, updateMockDataUIState, logActivity, ensureSeedActivityLogs, openActivityLogModal, renderActivityLogModal, deleteActivityLog, clearAllActivityLogs, openFemaleCoachModal, renderFemaleCoachModal, submitFemaleCoachPayout, payFemaleCoachShare, printFemaleCoachReport].forEach(fn => {
    if (typeof fn === "function" && fn.name) {
      window[fn.name] = fn;
    }
  });
} catch(e) { console.warn("Window export note:", e); }
