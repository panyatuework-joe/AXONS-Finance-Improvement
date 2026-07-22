import { useApp } from '../context/AppContext';
import emptyStateIllustrationSrc from '../assets/empty-state.svg';
import { PlusIcon } from '../icons';

export default function EmptyState({
  title = 'ไม่พบผลการค้นหา!',
  message = 'อาจมีคำที่สะกดผิดพลาด กรุณาตรวจสอบและลองใหม่อีกครั้ง',
  actionLabel,
  onAction,
}) {
  const { t } = useApp();
  return (
    <div className="empty-state">
      <img className="empty-state-illustration" src={emptyStateIllustrationSrc} alt="" />
      <div className="empty-state-title">{t(title)}</div>
      {message && <div className="empty-state-message">{t(message)}</div>}
      {actionLabel && onAction && (
        <button className="ft-btn-primary empty-state-action" onClick={onAction}>
          <PlusIcon />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
