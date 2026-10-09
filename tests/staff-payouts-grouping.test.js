import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeStaffName,
    payoutStaffName,
    groupStaffPayouts,
    encodeGroupKey,
    decodeGroupKey
} from '../src/staff-payouts-grouping.js';

test('normalizeStaffName ignores case and extra spaces', () => {
    assert.equal(normalizeStaffName('  Ahmed   Ali '), 'ahmed ali');
    assert.equal(normalizeStaffName('ahmed ali'), 'ahmed ali');
    assert.equal(normalizeStaffName(null), '');
    assert.equal(normalizeStaffName(undefined), '');
});

test('payoutStaffName falls back to staffName, then to a generic label', () => {
    assert.equal(payoutStaffName({ staffName: 'يوسف' }), 'يوسف');
    assert.equal(payoutStaffName({ name: '  ', staffName: '' }), 'عامل');
    assert.equal(payoutStaffName(null), 'عامل');
});

test('payouts with the same name, despite spacing and case, share one group', () => {
    const groups = groupStaffPayouts([
        { id: 'a', name: 'Ahmed Ali', amount: 30000, date: '2026-10-01' },
        { id: 'b', name: 'Youcef', amount: 20000, date: '2026-10-02' },
        { id: 'c', name: ' ahmed   ali ', amount: 5000, date: '2026-10-05' }
    ]);

    assert.equal(groups.length, 2);
    const ahmed = groups.find((g) => g.key === 'ahmed ali');
    assert.ok(ahmed, 'Ahmed group exists');
    assert.deepEqual(ahmed.payouts.map((p) => p.id), ['c', 'a']);
    assert.equal(ahmed.total, 35000);
    assert.equal(ahmed.name, 'ahmed ali', 'display name comes from the latest payout');
});

test('groups are ordered by their most recent payout', () => {
    const groups = groupStaffPayouts([
        { id: '1', name: 'Samir', amount: 100, date: '2026-10-01' },
        { id: '2', name: 'Karim', amount: 100, date: '2026-10-09' },
        { id: '3', name: 'Samir', amount: 100, date: '2026-10-03' }
    ]);

    assert.deepEqual(groups.map((g) => g.name), ['Karim', 'Samir']);
});

test('legacy records that only have staffName join the same group', () => {
    const groups = groupStaffPayouts([
        { id: 'x', staffName: 'Karim', amount: 1000, date: '2026-10-01' },
        { id: 'y', name: 'karim', amount: 2000, date: '2026-10-02' }
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].total, 3000);
    assert.equal(groups[0].payouts.length, 2);
});

test('payouts on the same day are ordered by creation time, newest first', () => {
    const groups = groupStaffPayouts([
        { id: 'm1', name: 'Samir', amount: 1, date: '2026-10-03', createdAt: '2026-10-03T08:00:00.000Z' },
        { id: 'm2', name: 'Samir', amount: 2, date: '2026-10-03', createdAt: '2026-10-03T18:00:00.000Z' }
    ]);

    assert.deepEqual(groups[0].payouts.map((p) => p.id), ['m2', 'm1']);
});

test('empty and invalid input gives no groups', () => {
    assert.deepEqual(groupStaffPayouts([]), []);
    assert.deepEqual(groupStaffPayouts(null), []);
    assert.deepEqual(groupStaffPayouts([null, undefined]), []);
});

test('records without a name are kept under the generic label', () => {
    const groups = groupStaffPayouts([{ id: 'z', amount: 500, date: '2026-10-01' }]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].name, 'عامل');
});

test('grouping does not reorder the input array', () => {
    const input = [
        { id: 'p1', name: 'A', amount: 1, date: '2026-10-01' },
        { id: 'p2', name: 'B', amount: 1, date: '2026-10-09' },
        { id: 'p3', name: 'A', amount: 1, date: '2026-10-05' }
    ];
    groupStaffPayouts(input);

    assert.deepEqual(input.map((p) => p.id), ['p1', 'p2', 'p3']);
});

test('encoded group keys are safe in HTML attributes and JS strings, and round-trip', () => {
    const names = ["O'Brien", 'أحمد "الكبير"', '<b>x</b>', 'a&b', 'حسن\\ علي'];
    for (const name of names) {
        const encoded = encodeGroupKey(name);
        assert.doesNotMatch(encoded, /['"<>&\\]/, `no unsafe characters in ${encoded}`);
        assert.equal(decodeGroupKey(encoded), name);
    }
});

test('decodeGroupKey returns malformed input unchanged instead of throwing', () => {
    assert.equal(decodeGroupKey('%E0%A4%A'), '%E0%A4%A');
});
