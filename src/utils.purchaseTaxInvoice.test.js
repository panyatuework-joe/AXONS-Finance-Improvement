import { describe, it, expect } from 'vitest';
import {
  calcTaxAmount,
  isDuplicatePurchaseTaxInvoice,
  nextPurchaseTaxInvoiceCode,
  buildPeriodCode,
  formatThaiDate,
  todayIso,
} from './utils';
import { THAI_MONTH_OPTIONS } from './data';

describe('calcTaxAmount', () => {
  it('computes เงินภาษี = มูลค่าสินค้า x ภาษี(%)', () => {
    expect(calcTaxAmount(1000, 7)).toBe(70);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcTaxAmount(27559254.37, 7)).toBeCloseTo(1929147.81, 2);
  });

  it('treats missing/invalid inputs as zero', () => {
    expect(calcTaxAmount(0, 7)).toBe(0);
    expect(calcTaxAmount(1000, 0)).toBe(0);
  });
});

describe('isDuplicatePurchaseTaxInvoice', () => {
  const existing = [
    { id: '1', vendorInvoiceNo: 'INV-001', vendorName: 'Vendor A', period: '6906', status: 'รอบันทึก' },
    { id: '2', vendorInvoiceNo: 'INV-002', vendorName: 'Vendor B', period: '6906', status: 'ยกเลิก' },
  ];

  it('flags เลขที่ใบกำกับภาษีผู้ขาย + เจ้าหนี้ + งวดภาษี ที่ซ้ำกัน', () => {
    const dup = isDuplicatePurchaseTaxInvoice(existing, {
      vendorInvoiceNo: 'INV-001',
      vendorName: 'Vendor A',
      period: '6906',
    });
    expect(dup).toBe(true);
  });

  it('does not flag when any of invoice no / vendor / period differs', () => {
    expect(
      isDuplicatePurchaseTaxInvoice(existing, { vendorInvoiceNo: 'INV-001', vendorName: 'Vendor A', period: '6907' }),
    ).toBe(false);
    expect(
      isDuplicatePurchaseTaxInvoice(existing, { vendorInvoiceNo: 'INV-001', vendorName: 'Vendor C', period: '6906' }),
    ).toBe(false);
  });

  it('excludes the row being edited from the duplicate check', () => {
    const dup = isDuplicatePurchaseTaxInvoice(
      existing,
      { vendorInvoiceNo: 'INV-001', vendorName: 'Vendor A', period: '6906' },
      '1',
    );
    expect(dup).toBe(false);
  });

  it('ignores cancelled (ยกเลิก) rows since the invoice number is freed up', () => {
    const dup = isDuplicatePurchaseTaxInvoice(existing, {
      vendorInvoiceNo: 'INV-002',
      vendorName: 'Vendor B',
      period: '6906',
    });
    expect(dup).toBe(false);
  });
});

describe('nextPurchaseTaxInvoiceCode', () => {
  it('starts at 0001 for a period with no existing entries', () => {
    expect(nextPurchaseTaxInvoiceCode([], '6906')).toBe('VT6906-0001');
  });

  it('increments the running sequence within the same period only', () => {
    const existing = [
      { code: 'VT6906-0001', period: '6906' },
      { code: 'VT6906-0002', period: '6906' },
      { code: 'VT6905-0007', period: '6905' },
    ];
    expect(nextPurchaseTaxInvoiceCode(existing, '6906')).toBe('VT6906-0003');
    expect(nextPurchaseTaxInvoiceCode(existing, '6905')).toBe('VT6905-0008');
    expect(nextPurchaseTaxInvoiceCode(existing, '6907')).toBe('VT6907-0001');
  });
});

describe('buildPeriodCode', () => {
  it('combines the last 2 digits of the BE year with the 2-digit month index', () => {
    expect(buildPeriodCode('มิถุนายน', '2569', THAI_MONTH_OPTIONS)).toBe('6906');
    expect(buildPeriodCode('มกราคม', '2570', THAI_MONTH_OPTIONS)).toBe('7001');
  });
});

describe('formatThaiDate', () => {
  it('formats an ISO date as วว/ดด/ปปปป in the Buddhist Era', () => {
    expect(formatThaiDate('2026-06-05')).toBe('05/06/2569');
  });

  it('returns an empty string for a missing date', () => {
    expect(formatThaiDate('')).toBe('');
  });
});

describe('todayIso', () => {
  it('returns a valid ISO date string usable as an <input type="date"> max bound', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
