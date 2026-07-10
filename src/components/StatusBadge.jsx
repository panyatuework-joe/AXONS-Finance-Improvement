import { useApp } from '../context/AppContext';

const OK_VALUES = new Set(['ตรงกัน', 'ใช้งาน', 'เผยแพร่แล้ว', 'จ่ายครบแล้ว', 'ยืนยันแล้ว', 'ตัดบัญชีสำเร็จ']);
const WARN_VALUES = new Set(['รอตรวจสอบ', 'ฉบับร่าง', 'หยุดชั่วคราว', 'รอบันทึก']);
const BAD_VALUES = new Set(['ไม่ตรงกัน', 'ไม่ใช้งาน', 'ยกเลิก', 'ตัดบัญชีไม่สำเร็จ']);
const INFO_VALUES = new Set(['ระหว่างดำเนินการ', 'รอดำเนินการตัดบัญชี']);

export default function StatusBadge({ value }) {
  const { t } = useApp();
  let variant = 'neutral';
  if (OK_VALUES.has(value)) variant = 'ok';
  else if (WARN_VALUES.has(value)) variant = 'warn';
  else if (BAD_VALUES.has(value)) variant = 'bad';
  else if (INFO_VALUES.has(value)) variant = 'info';

  return <span className={`status-badge status-badge--${variant}`}>{t(value)}</span>;
}
