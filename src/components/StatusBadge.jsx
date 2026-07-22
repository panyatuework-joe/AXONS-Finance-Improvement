import { useApp } from '../context/AppContext';

const OK_VALUES = new Set(['ตรงกัน', 'ใช้งาน', 'เผยแพร่แล้ว', 'เสร็จสิ้น', 'ยืนยันแล้ว', 'สำเร็จ']);
const WARN_VALUES = new Set(['รอตรวจสอบ', 'ฉบับร่าง', 'รอบันทึก', 'ระหว่างดำเนินการ', 'รอดำเนินการ']);
const BAD_VALUES = new Set(['ไม่ตรงกัน', 'ไม่ใช้งาน', 'ยกเลิก', 'ไม่สำเร็จ']);

// `variant` lets a caller force a specific chip color when the same status text is
// shared across modules with different meanings (e.g. "ฉบับร่าง" is warn/yellow for
// Reports drafts but neutral/gray for Recurring Entry drafts) — it skips the value lookup.
export default function StatusBadge({ value, variant: variantOverride }) {
  const { t } = useApp();
  let variant = variantOverride ?? 'neutral';
  if (!variantOverride) {
    if (OK_VALUES.has(value)) variant = 'ok';
    else if (WARN_VALUES.has(value)) variant = 'warn';
    else if (BAD_VALUES.has(value)) variant = 'bad';
  }

  return <span className={`status-badge status-badge--${variant}`}>{t(value)}</span>;
}
