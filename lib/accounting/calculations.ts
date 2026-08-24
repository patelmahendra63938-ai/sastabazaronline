export type TaxSplit = { taxable: number; cgst: number; sgst: number; igst: number; total: number };

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function splitInclusiveGst(total: number, rate: number, intraState: boolean): TaxSplit {
  const inclusive = money(Math.max(0, Number(total) || 0));
  const safeRate = Math.max(0, Number(rate) || 0);
  const base = money(inclusive / (1 + safeRate / 100));
  const tax = money(inclusive - base);
  const cgst = intraState ? money(tax / 2) : 0;
  const sgst = intraState ? money(tax - cgst) : 0;
  return { taxable: base, cgst, sgst, igst: intraState ? 0 : tax, total: inclusive };
}

export function financialYearFor(date: Date) {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export function calculateCodSettlement(input: {
  codCollected: number;
  courierCharge: number;
  codCharge: number;
  rtoCharge: number;
  otherDeduction?: number;
}) {
  const deductions = money(input.courierCharge + input.codCharge + input.rtoCharge + (input.otherDeduction || 0));
  return { deductions, netCredit: money(input.codCollected - deductions) };
}
