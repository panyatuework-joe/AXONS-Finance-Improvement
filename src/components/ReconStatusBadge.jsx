import { useApp } from '../context/AppContext';
import { CheckCircleIcon, ErrorCircleIcon, SpinnerIcon } from '../icons';

export default function ReconStatusBadge({ status }) {
  const { t } = useApp();
  if (status === 'pass') {
    return (
      <span className="status-badge status-badge--ok">
        <CheckCircleIcon size={16} />
        {t('ผ่าน')}
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span className="status-badge status-badge--bad">
        <ErrorCircleIcon size={16} />
        {t('ไม่ผ่าน')}
      </span>
    );
  }
  return (
    <span className="status-badge status-badge--warn">
      <SpinnerIcon size={14} color="#B54708" />
      {t('กำลังตรวจ')}
    </span>
  );
}
