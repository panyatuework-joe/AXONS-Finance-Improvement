export function formatThaiTimestamp(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${mm}`;
}

export function formatDateTime(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hh}:${mm}`;
}

export function formatDateCompact(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}${month}${day}`;
}

const THAI_BE_MONTHS_PER_YEAR = 12;

// แต่ละงวด (ยกเว้นงวดที่ 1) ต้องเป็นจำนวนเต็มบาทไม่มีทศนิยม โดยหายอดเฉลี่ยต่องวด (ปัดทศนิยม 2 ตำแหน่ง)
// ก่อน แล้วตัดเศษทศนิยมของงวด 2-N ทิ้ง เศษที่ถูกตัดจากทุกงวด (รวมงวดที่ 1 เอง) จะถูกทบไปรวมที่งวดที่ 1 ทั้งหมด
export function buildGlWriteoffSchedule(totalAmount, installments, startPeriod) {
  if (totalAmount <= 0 || installments <= 0 || !startPeriod) return [];
  const average = Math.round((totalAmount / installments) * 100) / 100;
  const per = Math.floor(average);
  const fraction = Math.round((average - per) * 100) / 100;
  const first = Math.round((per + fraction * installments) * 100) / 100;
  const [startMonth, startYear] = startPeriod.split('/').map((v) => parseInt(v, 10));
  return Array.from({ length: installments }, (_, i) => {
    const monthIndex = startMonth - 1 + i;
    const month = (monthIndex % THAI_BE_MONTHS_PER_YEAR) + 1;
    const year = startYear + Math.floor(monthIndex / THAI_BE_MONTHS_PER_YEAR);
    return {
      seq: i + 1,
      date: `25/${String(month).padStart(2, '0')}/${year}`,
      amount: i === 0 ? first : per,
    };
  });
}

// ยอดตัดบัญชีต่อเดือน (งวดที่ 2 เป็นต้นไป) ใช้เป็นยอดบัญชีเดบิต/เครดิตของรายการ ต้องเป็นจำนวนเต็มบาท
export function glWriteoffPerPeriodAmount(totalAmount, installments) {
  if (totalAmount <= 0 || installments <= 0) return 0;
  const average = Math.round((totalAmount / installments) * 100) / 100;
  return Math.floor(average);
}

export function nextGlWriteoffCode(existing) {
  const maxCode = existing.reduce((max, e) => {
    const n = parseInt(e.code.split('-').pop() ?? '0', 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `RCE-26062526-${String(maxCode + 1).padStart(4, '0')}`;
}

// ===== Purchase Tax Invoice (บันทึกภาษีซื้อ) =====

/** Formats an ISO date (YYYY-MM-DD) as AXIO Writing System's วว/ดด/ปปปป (Buddhist year). */
export function formatThaiDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${Number(y) + 543}`;
}

/** Today's date as an ISO string (YYYY-MM-DD), for "invoice date must not be in the future" checks. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Builds the 4-digit accounting period code (BE year, 2 digits + period number, 2 digits)
 * used in the Running No., e.g. เดือน "มิถุนายน" ปี "2569" -> "6906".
 * ASSUMPTION: period number == calendar month number. The requirements doc notes the legacy
 * screen's example doesn't match this (period "02" shown for June) — needs BA confirmation.
 */
export function buildPeriodCode(month, year, monthOptions) {
  const monthIndex = monthOptions.indexOf(month);
  if (monthIndex === -1 || !year) return '';
  const yy = year.slice(-2);
  const pp = String(monthIndex + 1).padStart(2, '0');
  return `${yy}${pp}`;
}

/**
 * Running No. generator: VT<accounting period, BE YY+period MM>-<seq 4 digits>.
 * ASSUMPTION (flagged as an open question for BA): the sequence resets per accounting
 * period, and "period" here is treated as the calendar month/year selected on the entry
 * (see the Running No. open question in the requirements doc) — this must be confirmed.
 */
export function nextPurchaseTaxInvoiceCode(existing, period) {
  const maxSeq = existing
    .filter((e) => e.period === period)
    .reduce((max, e) => {
      const n = parseInt(e.code.split('-').pop() ?? '0', 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
  return `VT${period}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** เงินภาษี = มูลค่าสินค้า x ภาษี(%), rounded to 2 decimal places. */
export function calcTaxAmount(baseAmount, taxRate) {
  const amount = (Number(baseAmount) || 0) * (Number(taxRate) || 0) / 100;
  return Math.round(amount * 100) / 100;
}

/**
 * เลขที่ใบกำกับภาษีผู้ขาย + เจ้าหนี้ + งวดภาษี ห้ามซ้ำ (business rule from the requirements doc).
 * `excludeId` lets an edit-in-place check exclude the row being edited.
 */
export function isDuplicatePurchaseTaxInvoice(existing, { vendorInvoiceNo, vendorName, period }, excludeId) {
  return existing.some(
    (e) =>
      e.id !== excludeId &&
      e.status !== 'ยกเลิก' &&
      e.vendorInvoiceNo.trim() === vendorInvoiceNo.trim() &&
      e.vendorName === vendorName &&
      e.period === period,
  );
}

/** Splits raw CSV text into rows of trimmed cell strings, handling quoted fields (with embedded commas/newlines) and "" escapes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const content = text.replace(/^﻿/, '');

  function endField() {
    row.push(field);
    field = '';
  }
  function endRow() {
    endField();
    rows.push(row);
    row = [];
  }

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch === '\r') {
      // consume, handled with the following \n (or bare \r as a line end)
      if (content[i + 1] !== '\n') endRow();
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
