import { useApp } from '../context/AppContext';

const OK_VALUES = new Set(['ตรงกัน', 'ใช้งาน', 'เผยแพร่แล้ว', 'เสร็จสิ้น', 'ยืนยันแล้ว', 'ตัดบัญชีสำเร็จ']);
const WARN_VALUES = new Set(['รอตรวจสอบ', 'ฉบับร่าง', 'รอบันทึก', 'ระหว่างดำเนินการ']);
const BAD_VALUES = new Set(['ไม่ตรงกัน', 'ไม่ใช้งาน', 'ยกเลิก', 'ตัดบัญชีไม่สำเร็จ']);
const INFO_VALUES = new Set(['รอดำเนินการตัดบัญชี']);
const SPARE_VALUES = new Set(['หยุดชั่วคราว']);
const NEUTRAL_STRONG_VALUES = new Set(['แบบร่าง']);

export default function StatusBadge({ value }) {
  const { t } = useApp();
  let variant = 'neutral';
  if (OK_VALUES.has(value)) variant = 'ok';
  else if (WARN_VALUES.has(value)) variant = 'warn';
  else if (BAD_VALUES.has(value)) variant = 'bad';
  else if (INFO_VALUES.has(value)) variant = 'info';
  else if (SPARE_VALUES.has(value)) variant = 'spare';
  else if (NEUTRAL_STRONG_VALUES.has(value)) variant = 'neutral-strong';

  return <span className={`status-badge status-badge--${variant}`}>{t(value)}</span>;
}
