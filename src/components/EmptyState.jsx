import { useApp } from '../context/AppContext';

const EmptySearchIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#F5FAFE" />
    <circle cx="52" cy="52" r="22" stroke="#074E9F" strokeWidth="4" />
    <line x1="68" y1="68" x2="84" y2="84" stroke="#074E9F" strokeWidth="5" strokeLinecap="round" />
    <path d="M44 52H60M52 44V60" stroke="#A6B0BF" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default function EmptyState({
  title = 'ไม่พบผลการค้นหา!',
  message = 'อาจมีคำที่สะกดผิดพลาด กรุณาตรวจสอบและลองใหม่อีกครั้ง',
}) {
  const { t } = useApp();
  return (
    <div className="empty-state">
      <EmptySearchIllustration />
      <div className="empty-state-title">{t(title)}</div>
      <div className="empty-state-message">{t(message)}</div>
    </div>
  );
}
