import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCodSettlement, splitInclusiveGst, financialYearFor } from '../lib/accounting/calculations.ts';

test('extracts five percent GST from customer inclusive price', () => {
  assert.deepEqual(splitInclusiveGst(945, 5, true), { taxable: 900, cgst: 22.5, sgst: 22.5, igst: 0, total: 945 });
});

test('uses IGST for interstate sales', () => {
  assert.deepEqual(splitInclusiveGst(945, 5, false), { taxable: 900, cgst: 0, sgst: 0, igst: 45, total: 945 });
});

test('Indian financial year changes on April 1', () => {
  assert.equal(financialYearFor(new Date('2027-03-31T12:00:00+05:30')), '2026-27');
  assert.equal(financialYearFor(new Date('2027-04-01T12:00:00+05:30')), '2027-28');
});

test('calculates courier COD net bank credit', () => {
  assert.deepEqual(calculateCodSettlement({ codCollected: 5000, courierCharge: 500, codCharge: 400, rtoCharge: 500 }), { deductions: 1400, netCredit: 3600 });
});
