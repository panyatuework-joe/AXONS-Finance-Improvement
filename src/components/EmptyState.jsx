import { useApp } from '../context/AppContext';
import emptyStateIllustrationSrc from '../assets/empty-state.svg';

export default function EmptyState({
  title = 'ไม่พบผลการค้นหา!',
  message = 'อาจมีคำที่สะกดผิดพลาด กรุณาตรวจสอบและลองใหม่อีกครั้ง',
}) {
  const { t } = useApp();
  return (
    <div className="empty-state">
      <img className="empty-state-illustration" src={emptyStateIllustrationSrc} alt="" />
      <div className="empty-state-title">{t(title)}</div>
      <div className="empty-state-message">{t(message)}</div>
    </div>
  );
}
