import { AxonsLogo } from '../icons';
import { useApp } from '../context/AppContext';

export default function LoggedOutPage({ onRelogin }) {
  const { t } = useApp();
  return (
    <div className="logged-out-page">
      <div className="logged-out-card">
        <AxonsLogo />
        <h2>{t('ออกจากระบบเรียบร้อยแล้ว')}</h2>
        <p>{t('ขอบคุณที่ใช้บริการ AXONS Finance')}</p>
        <button className="ft-btn-primary" style={{ justifyContent: 'center', width: '100%' }} onClick={onRelogin}>
          {t('เข้าสู่ระบบอีกครั้ง')}
        </button>
      </div>
    </div>
  );
}
