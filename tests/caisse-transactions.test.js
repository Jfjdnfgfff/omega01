import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaisseMovements } from '../src/caisse-transactions.js';
import { isCaisseClosing } from '../src/caisse-credit.js';

const dateKey = input => {
    if (!input) return '';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

test('caisse includes same-day receipts and actual cash payments from every financial section', () => {
    const today = '2026-09-29';
    const state = {
        customers: [
            { id: 'paid-member', name: 'Paid member', startDate: `${today}T09:00:00`, price: 1000, paymentStatus: 'paid' },
            { id: 'credit-member', name: 'Credit member', startDate: `${today}T10:00:00`, price: 1000, paymentStatus: 'credit', debtAmount: 300 },
            { id: 'old-member', name: 'Renewed member', subscriptionCycleId: 'renew-2', startDate: '2026-09-28T10:00:00', price: 900, paymentStatus: 'paid' }
        ],
        caisseLogs: [
            { id: 'cash-sub', type: 'cash_movement', source: 'subscription', sourceId: 'renew-2', direction: 'in', amount: 500, date: `${today}T11:00:00`, title: 'Renewal' },
            { id: 'repay', type: 'credit_payment', creditId: 'credit-1', creditName: 'Credit payment', amount: 50, date: `${today}T12:00:00` },
            { id: 'closing', type: 'closing', date: today, actualAmount: 2465 }
        ],
        quickSessions: [{ id: 'session-1', date: `${today}T13:00:00`, price: 200, clientCount: 1, sessionCount: 1 }],
        sales: [{ id: 'sale-1', date: `${today}T14:00:00`, prodName: 'Protein', total: 300, qty: 1 }],
        expenses: [{ id: 'expense-1', date: `${today}T15:00:00`, desc: 'Cleaning', amount: 80 }],
        staffPayouts: [{ id: 'payout-1', date: today, name: 'Coach', amount: 120 }],
        supplierTransactions: [
            { id: 'supplier-purchase', type: 'purchase', supplierName: 'Supplier', items: 'Goods', paidAmount: 60, remainingDebt: 140, date: today },
            { id: 'supplier-payment', type: 'payment', supplierName: 'Supplier', paidAmount: 25, date: `${today}T16:00:00` }
        ]
    };

    const result = buildCaisseMovements(state, today, dateKey);
    assert.equal(result.subIncome, 2200);
    assert.equal(result.quickIncome, 200);
    assert.equal(result.salesIncome, 300);
    assert.equal(result.creditIncome, 50);
    assert.equal(result.totalIncome, 2750);
    assert.equal(result.expenses, 80);
    assert.equal(result.staffPayouts, 120);
    assert.equal(result.supplierPayments, 85);
    assert.equal(result.totalExpenses, 285);
    assert.equal(result.netCash, 2465);
    assert.equal(result.transactions.length, 10);
    assert.equal(result.transactions.some(transaction => transaction.sourceId === 'renew-2' && transaction.date.startsWith(today)), true);
    assert.equal(result.transactions.filter(transaction => transaction.source === 'supplier').length, 2);

    // A movement record must not be mistaken for a daily closing/jard entry.
    assert.equal(isCaisseClosing(state.caisseLogs[0]), false);
    assert.equal(isCaisseClosing(state.caisseLogs[2]), true);
});

test('transactions outside the selected day and unpaid credit balances do not change the till', () => {
    const today = '2026-09-29';
    const result = buildCaisseMovements({
        customers: [
            { id: 'yesterday', startDate: '2026-09-28T09:00:00', price: 800, paymentStatus: 'paid' },
            { id: 'unpaid', startDate: `${today}T09:00:00`, price: 800, paymentStatus: 'credit', debtAmount: 800 }
        ],
        sales: [{ id: 'sale-tomorrow', date: '2026-09-30T10:00:00', total: 500 }],
        expenses: [{ id: 'expense-yesterday', date: '2026-09-28', amount: 50 }],
        credits: [{ id: 'credit-not-paid', date: `${today}T12:00:00`, amount: 400 }]
    }, today, dateKey);

    assert.deepEqual(result.transactions, []);
    assert.equal(result.totalIncome, 0);
    assert.equal(result.totalExpenses, 0);
    assert.equal(result.netCash, 0);
});

test('legacy supplier cards are counted when no detailed supplier transaction history exists', () => {
    const result = buildCaisseMovements({
        suppliers: [{ id: 'legacy-supplier', name: 'Legacy supplier', paid: 75, debt: 125, date: '2026-09-29' }]
    }, '2026-09-29', dateKey);

    assert.equal(result.totalExpenses, 75);
    assert.equal(result.supplierPayments, 75);
    assert.equal(result.transactions[0].direction, 'out');
});

test('product sales on credit reduce no cash until repayment is recorded', () => {
    const today = '2026-09-29';
    const state = {
        sales: [
            { id: 'credit-sale', date: `${today}T10:00:00`, prodName: 'Protein', total: 2500, cashPaid: 0, paymentStatus: 'credit' },
            { id: 'cash-sale', date: `${today}T11:00:00`, prodName: 'Shaker', total: 600, cashPaid: 600, paymentStatus: 'paid' }
        ],
        credits: [
            { id: 'cr_sale_credit-sale', source: 'product_sale', saleId: 'credit-sale', amount: 2500, date: `${today}T10:00:00`, status: 'open' }
        ],
        caisseLogs: []
    };

    const beforeRepayment = buildCaisseMovements(state, today, dateKey);
    assert.equal(beforeRepayment.salesIncome, 600);
    assert.equal(beforeRepayment.creditIncome, 0);
    assert.equal(beforeRepayment.totalIncome, 600);
    assert.equal(beforeRepayment.transactions.some(transaction => transaction.sourceId === 'credit-sale'), false);

    state.caisseLogs.push({
        id: 'credit_payment_cr_sale_credit-sale', type: 'credit_payment',
        creditId: 'cr_sale_credit-sale', creditName: 'Customer', amount: 2500,
        date: `${today}T16:00:00`
    });
    const afterRepayment = buildCaisseMovements(state, today, dateKey);
    assert.equal(afterRepayment.salesIncome, 600);
    assert.equal(afterRepayment.creditIncome, 2500);
    assert.equal(afterRepayment.totalIncome, 3100);
    assert.equal(afterRepayment.transactions.some(transaction => transaction.source === 'creditPayment' && transaction.amount === 2500), true);
});

test('expenses and payouts paid from the general fund do not touch the daily till', () => {
    const dateKey = value => String(value || '').slice(0, 10);
    const today = '2026-09-29';
    const result = buildCaisseMovements({
        sales: [{ id: 's1', total: 10000, date: today }],
        expenses: [
            { id: 'e1', amount: 500, date: today, fundSource: 'daily' },
            { id: 'e2', amount: 4000, date: today, fundSource: 'general' }
        ],
        staffPayouts: [
            { id: 'p1', amount: 1000, date: today },
            { id: 'p2', amount: 9000, date: today, fundSource: 'general' }
        ]
    }, today, dateKey);
    assert.equal(result.expenses, 500);
    assert.equal(result.staffPayouts, 1000);
    assert.equal(result.netCash, 8500);
});
