// ============================================================================
// OMEGA GYM - High-Performance Multi-threaded Background Web Worker
// Handles heavy aggregations, statistical analytics, Big-O reductions,
// and off-main-thread processing to ensure 60fps UI responsiveness.
// ============================================================================

self.onmessage = function(e) {
  const { id, type, payload } = e.data || {};
  try {
    let result = null;
    switch (type) {
      case 'CALCULATE_METRICS':
        result = computeMetrics(payload);
        break;
      case 'GENERATE_MOCK_DATA':
        result = generateMockDataParallel(payload);
        break;
      case 'FILTER_CUSTOMERS':
        result = filterCustomersParallel(payload);
        break;
      default:
        throw new Error('Unknown worker task: ' + type);
    }
    self.postMessage({ id, success: true, result });
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message });
  }
};

/**
 * High-performance single-pass analytics engine
 * Reduces O(K * N) operations to O(N) by calculating all statistics in 1 loop
 */
function computeMetrics(data) {
  const {
    customers = [],
    quickSessions = [],
    packages = [],
    expenses = [],
    staffPayouts = [],
    credits = [],
    sales = [],
    caisseLogs = [],
    nowTimestamp = Date.now()
  } = data;

  const nowDate = new Date(nowTimestamp);
  const curYear = nowDate.getFullYear();
  const curMonth = nowDate.getMonth();
  const todayStr = nowDate.toDateString();
  const curMonthStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
  const MS_PER_DAY = 86400000;

  // 1. Pre-index packages into a fast O(1) Map
  const packageMap = new Map();
  const packageCounts = {};
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    if (pkg && pkg.id) {
      packageMap.set(pkg.id, pkg);
      packageCounts[pkg.id] = 0;
    }
  }

  // 2. Single-pass customer calculations & filter tab counts
  let subTotalIncome = 0;
  let todaySubIncome = 0;
  let monthlySubIncome = 0;
  let yearlySubIncome = 0;
  let totalDebt = 0;
  let activeCount = 0;
  let nearExpiryCount = 0;
  let expiredCount = 0;
  let frozenCount = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let sessionSubscribersCount = 0;

  // Daily subscription income cache for caisse O(1) lookups
  const subIncomeByDate = new Map();

  const custLen = customers.length;
  for (let i = 0; i < custLen; i++) {
    const c = customers[i];
    if (!c) continue;

    const isSession = c.subscriptionType === 'session' || (c.remainingSessions !== undefined && c.remainingSessions !== null && c.subscriptionType !== 'time');
    if (isSession) sessionSubscribersCount++;

    // Gender counts
    if (c.gender === 'female') {
      femaleCount++;
    } else {
      maleCount++;
    }

    // Package count tracking
    if (c.packageId && packageCounts[c.packageId] !== undefined) {
      packageCounts[c.packageId]++;
    }

    // Status calculation (Fast integer math, avoids Date instantiations)
    let status = 'active';
    if (c.status === 'frozen') {
      status = 'frozen';
      frozenCount++;
    } else if (isSession) {
      const rem = parseInt(c.remainingSessions) || 0;
      if (rem <= 0) {
        status = 'expired';
        expiredCount++;
      } else if (c.endDate) {
        const endMs = Date.parse(c.endDate);
        const diffDays = Math.ceil((endMs - nowTimestamp) / MS_PER_DAY);
        if (diffDays < 0) {
          status = 'expired';
          expiredCount++;
        } else if (diffDays <= 5 || rem <= 2) {
          status = 'near_expiry';
          nearExpiryCount++;
          activeCount++;
        } else {
          status = 'active';
          activeCount++;
        }
      } else if (rem <= 2) {
        status = 'near_expiry';
        nearExpiryCount++;
        activeCount++;
      } else {
        status = 'active';
        activeCount++;
      }
    } else if (!c.endDate) {
      status = 'active';
      activeCount++;
    } else {
      const endMs = Date.parse(c.endDate);
      const diffDays = Math.ceil((endMs - nowTimestamp) / MS_PER_DAY);
      if (diffDays < 0) {
        status = 'expired';
        expiredCount++;
      } else if (diffDays <= 5) {
        status = 'near_expiry';
        nearExpiryCount++;
        activeCount++;
      } else {
        status = 'active';
        activeCount++;
      }
    }

    // Financial calculations
    const pkg = packageMap.get(c.packageId);
    const price = (c.price !== undefined && c.price !== null && c.price !== '') ? Number(c.price) : (pkg ? Number(pkg.price || 0) : 0);
    let paidAmount = 0;
    if (c.paymentStatus === 'paid') {
      paidAmount = price;
    } else if (c.paymentStatus === 'credit') {
      const debt = parseInt(c.debtAmount) || 0;
      totalDebt += debt;
      paidAmount = Math.max(0, price - debt);
    }
    subTotalIncome += paidAmount;

    // Fast date checks
    if (c.startDate) {
      const sMs = Date.parse(c.startDate);
      if (!isNaN(sMs)) {
        const sDate = new Date(sMs);
        if (sDate.toDateString() === todayStr) todaySubIncome += paidAmount;
        if (sDate.getMonth() === curMonth && sDate.getFullYear() === curYear) monthlySubIncome += paidAmount;
        if (sDate.getFullYear() === curYear) yearlySubIncome += paidAmount;

        // Group by YYYY-MM-DD for caisse
        const dateKey = c.startDate.slice(0, 10);
        subIncomeByDate.set(dateKey, (subIncomeByDate.get(dateKey) || 0) + paidAmount);
      }
    }
  }

  // 3. Quick Sessions calculations
  let quickTotalIncome = 0;
  let totalQuickSessionClients = 0;
  let totalQuickSessionsCount = 0;
  const quickIncomeByDate = new Map();

  for (let i = 0; i < quickSessions.length; i++) {
    const qs = quickSessions[i];
    if (!qs) continue;
    const p = Number(qs.price || 0);
    const clients = Number(qs.clientCount || 1);
    const sessions = Number(qs.sessionCount || 1);
    quickTotalIncome += p;
    totalQuickSessionClients += clients;
    totalQuickSessionsCount += sessions;

    const qMs = qs.date ? Date.parse(qs.date) : (Number(qs.id) || nowTimestamp);
    if (!isNaN(qMs)) {
      const qDate = new Date(qMs);
      if (qDate.toDateString() === todayStr) todaySubIncome += p;
      if (qDate.getMonth() === curMonth && qDate.getFullYear() === curYear) monthlySubIncome += p;
      if (qDate.getFullYear() === curYear) yearlySubIncome += p;

      const dateKey = qs.date ? String(qs.date).slice(0, 10) : new Date(qMs).toISOString().slice(0, 10);
      quickIncomeByDate.set(dateKey, (quickIncomeByDate.get(dateKey) || 0) + p);
    }
  }

  // 4. Sales calculations (single pass for revenue, profit, today, monthly, and categories)
  let allTimeSales = 0;
  let todaySales = 0;
  let todaySalesCount = 0;
  let monthlySales = 0;
  let yearlySales = 0;
  let allTimeProductProfit = 0;
  let monthlyProductProfit = 0;

  let dosesSales = 0, dosesProfit = 0, dosesUnits = 0;
  let boxesSales = 0, boxesProfit = 0, boxesUnits = 0;
  let frigoSales = 0, frigoProfit = 0, frigoUnits = 0;
  const salesIncomeByDate = new Map();

  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    if (!s) continue;
    const sTotal = Number(s.total) || 0;
    const sProfit = Number(s.profit) || 0;
    const sQty = Number(s.qty) || 1;
    allTimeSales += sTotal;
    allTimeProductProfit += sProfit;

    if (s.date) {
      const dateKey = String(s.date).slice(0, 10);
      salesIncomeByDate.set(dateKey, (salesIncomeByDate.get(dateKey) || 0) + sTotal);

      const sMs = Date.parse(s.date);
      if (!isNaN(sMs)) {
        const sDate = new Date(sMs);
        if (sDate.toDateString() === todayStr) {
          todaySales += sTotal;
          todaySalesCount++;
        }
        if (sDate.getMonth() === curMonth && sDate.getFullYear() === curYear) {
          monthlySales += sTotal;
          monthlyProductProfit += sProfit;

          // Category breakdown
          const cat = s.category || 'other';
          if (cat === 'doses') {
            dosesSales += sTotal;
            dosesProfit += sProfit;
            dosesUnits += sQty;
          } else if (cat === 'boxes') {
            boxesSales += sTotal;
            boxesProfit += sProfit;
            boxesUnits += sQty;
          } else if (cat === 'frigo') {
            frigoSales += sTotal;
            frigoProfit += sProfit;
            frigoUnits += sQty;
          }
        }
        if (sDate.getFullYear() === curYear) {
          yearlySales += sTotal;
        }
      }
    }
  }

  // 5. Expenses (Single pass)
  let totalExpenses = 0;
  let monthlyExpenses = 0;
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    if (!e) continue;
    const amt = parseFloat(String(e.amount || 0).replace(/,/g, '')) || 0;
    totalExpenses += amt;
    const dStr = e.date || '';
    if (typeof dStr === 'string' && dStr.startsWith(curMonthStr)) {
      monthlyExpenses += amt;
    } else if (e.date) {
      const eMs = Date.parse(e.date);
      if (!isNaN(eMs)) {
        const d = new Date(eMs);
        if (d.getMonth() === curMonth && d.getFullYear() === curYear) monthlyExpenses += amt;
      }
    }
  }

  // 6. Staff Payouts (Single pass)
  let totalStaffPayouts = 0;
  let monthlyStaffPayouts = 0;
  for (let i = 0; i < staffPayouts.length; i++) {
    const p = staffPayouts[i];
    if (!p) continue;
    const amt = parseFloat(String(p.amount || 0).replace(/,/g, '')) || 0;
    totalStaffPayouts += amt;
    const dStr = p.date || p.createdAt || '';
    if (typeof dStr === 'string' && dStr.startsWith(curMonthStr)) {
      monthlyStaffPayouts += amt;
    } else {
      const pMs = Date.parse(dStr);
      if (!isNaN(pMs)) {
        const d = new Date(pMs);
        if (d.getMonth() === curMonth && d.getFullYear() === curYear) monthlyStaffPayouts += amt;
      }
    }
  }

  // 7. Credits
  let totalExternalCredits = 0;
  for (let i = 0; i < credits.length; i++) {
    totalExternalCredits += Number(credits[i]?.amount || 0);
  }

  // 8. Financial aggregates
  const totalRevenue = subTotalIncome + quickTotalIncome + allTimeSales;
  const totalProductCost = allTimeSales - allTimeProductProfit;
  const totalOverallCosts = totalExpenses + totalStaffPayouts + totalProductCost;
  const totalOverallNetProfit = totalRevenue - totalOverallCosts;
  const monthlyCost = monthlyExpenses + monthlyStaffPayouts + (monthlySales - monthlyProductProfit);
  const monthlyNetProfitValue = (monthlySubIncome + monthlySales) - monthlyCost;

  // 9. Caisse Shortages O(Logs) using pre-calculated daily maps!
  let currentMonthManque = 0;
  let currentMonthExcedent = 0;
  let currentYearManque = 0;
  let currentYearExcedent = 0;
  let allTimeManque = 0;
  let allTimeExcedent = 0;

  for (let i = 0; i < caisseLogs.length; i++) {
    const log = caisseLogs[i];
    if (!log || !log.date) continue;
    const dateKey = String(log.date).slice(0, 10);
    const expected = (subIncomeByDate.get(dateKey) || 0) +
                     (quickIncomeByDate.get(dateKey) || 0) +
                     (salesIncomeByDate.get(dateKey) || 0);
    const actual = Number(log.actualAmount || 0);
    const diff = actual - expected;

    const logMs = Date.parse(log.date);
    if (!isNaN(logMs)) {
      const d = new Date(logMs);
      const isCurMonth = (d.getMonth() === curMonth && d.getFullYear() === curYear);
      const isCurYear = (d.getFullYear() === curYear);
      if (diff < 0) {
        const shortage = Math.abs(diff);
        allTimeManque += shortage;
        if (isCurYear) currentYearManque += shortage;
        if (isCurMonth) currentMonthManque += shortage;
      } else if (diff > 0) {
        allTimeExcedent += diff;
        if (isCurYear) currentYearExcedent += diff;
        if (isCurMonth) currentMonthExcedent += diff;
      }
    }
  }

  return {
    totalRevenue,
    monthlyNetProfitValue,
    totalYearlyIncome: yearlySubIncome + yearlySales,
    totalExpenses: totalExpenses + totalStaffPayouts,
    totalOverallNetProfit,
    allTimeProductProfit,
    totalDebt: totalDebt + totalExternalCredits,
    activeCount,
    nearExpiryCount,
    expiredCount,
    frozenCount,
    maleCount,
    femaleCount,
    sessionSubscribersCount: totalQuickSessionClients + sessionSubscribersCount,
    todaySubIncome,
    monthlySubIncome,
    yearlySubIncome,
    todaySales,
    todaySalesCount,
    monthlySales,
    yearlySales,
    categoryStats: {
      dosesSales, dosesProfit, dosesUnits,
      boxesSales, boxesProfit, boxesUnits,
      frigoSales, frigoProfit, frigoUnits
    },
    caisseShortages: {
      currentMonthManque,
      currentMonthExcedent,
      currentYearManque,
      currentYearExcedent,
      allTimeManque,
      allTimeExcedent
    },
    packageCounts
  };
}

/**
 * Generates mock test data in worker thread without freezing main UI
 */
function generateMockDataParallel({ customersCount = 200, creditsCount = 100, defaultPackage, pkg2 }) {
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
  const newCustomers = new Array(customersCount);

  for (let i = 0; i < customersCount; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3 + Math.floor(i / 7)) % lastNames.length];
    const fullName = `${fn} ${ln} #${i + 1}`;
    const phone = `05${String(50000000 + ((i * 12347) % 49000000)).padStart(8, '0')}`;
    const isExpired = (i % 5 === 0);
    const daysAgo = (i % 28) + 1;
    const startMs = now - (isExpired ? (daysAgo + 35) : daysAgo) * 86400000;
    const startDate = new Date(startMs);
    const pkg = (i % 4 === 0) ? (pkg2 || defaultPackage) : defaultPackage;
    const duration = parseInt(pkg?.durationDays || 30);
    const endDate = new Date(startMs + duration * 86400000);
    const isCreditPayment = (i % 7 === 0);
    const debtAmount = isCreditPayment ? ((i % 4 + 1) * 500) : 0;
    const weight = 60 + (i % 38);
    const birthYear = 1988 + (i % 18);
    const dob = `${birthYear}-0${(i % 9) + 1}-15`;

    newCustomers[i] = {
      id: `mock_cust_${i + 1}`,
      name: fullName,
      phone: phone,
      gender: (i % 10 === 9) ? 'female' : 'male',
      dob: dob,
      age: new Date().getFullYear() - birthYear,
      weight: weight,
      packageId: pkg?.id || 'pkg_1',
      price: pkg?.price || 3000,
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
      isMock: true,
      _searchKey: `${fullName} ${phone}`.toLowerCase()
    };
  }

  const creditAmounts = [500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 3500, 4500, 6000, 7500, 9000];
  const newCredits = new Array(creditsCount);

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

    newCredits[i] = {
      id: `mock_cred_${i + 1}`,
      name: fullName,
      nickname: nickname,
      phone: phone,
      desc: desc,
      amount: amount,
      date: date.toISOString(),
      isMock: true,
      _searchKey: `${fullName} ${nickname} ${phone} ${desc}`.toLowerCase()
    };
  }

  return { newCustomers, newCredits };
}

/**
 * Filter customers in parallel
 */
function filterCustomersParallel({ customers = [], filter = 'all', searchQuery = '', nowTimestamp = Date.now() }) {
  const q = (searchQuery || '').trim().toLowerCase();
  const MS_PER_DAY = 86400000;
  const filtered = [];

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    if (!c) continue;

    if (q) {
      const searchKey = c._searchKey || `${c.name || ''} ${c.phone || ''}`.toLowerCase();
      if (!searchKey.includes(q)) continue;
    }

    const isSession = c.subscriptionType === 'session' || (c.remainingSessions !== undefined && c.remainingSessions !== null && c.subscriptionType !== 'time');

    if (filter === 'session') {
      if (!isSession) continue;
      filtered.push(c);
      continue;
    }
    if (filter === 'male') {
      if (c.gender === 'female') continue;
      filtered.push(c);
      continue;
    }
    if (filter === 'female') {
      if (c.gender !== 'female') continue;
      filtered.push(c);
      continue;
    }
    if (filter === 'frozen') {
      if (c.status !== 'frozen') continue;
      filtered.push(c);
      continue;
    }
    if (filter === 'credit') {
      if (c.paymentStatus !== 'credit') continue;
      filtered.push(c);
      continue;
    }

    // Status check
    let status = 'active';
    if (c.status === 'frozen') {
      status = 'frozen';
    } else if (isSession) {
      const rem = parseInt(c.remainingSessions) || 0;
      if (rem <= 0) {
        status = 'expired';
      } else if (c.endDate) {
        const endMs = Date.parse(c.endDate);
        const diffDays = Math.ceil((endMs - nowTimestamp) / MS_PER_DAY);
        if (diffDays < 0) status = 'expired';
        else if (diffDays <= 5 || rem <= 2) status = 'near_expiry';
      } else if (rem <= 2) {
        status = 'near_expiry';
      }
    } else if (c.endDate) {
      const endMs = Date.parse(c.endDate);
      const diffDays = Math.ceil((endMs - nowTimestamp) / MS_PER_DAY);
      if (diffDays < 0) status = 'expired';
      else if (diffDays <= 5) status = 'near_expiry';
    }

    if (filter === 'active' && status !== 'active' && status !== 'near_expiry') continue;
    if (filter === 'near_expiry' && status !== 'near_expiry') continue;
    if (filter === 'expired' && status !== 'expired') continue;

    filtered.push(c);
  }

  return filtered;
}
