import { MODULE_CONFIGS } from '../data';
import { useApp } from '../context/AppContext';

export default function HomePage({
  financialTargetsCount,
  reconciliationCount,
  accountGroupsCount,
  crudData,
  onNavigateModule,
}) {
  const { t } = useApp();
  const remainingModuleKeys = Object.keys(MODULE_CONFIGS).filter((key) => key !== 'reports');

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('หน้าแรก')}</h1>
      </div>

      <div className="dash-welcome">
        <h2>{t('สวัสดี, สิริศักดิ์ หงษ์พัตรา')}</h2>
        <p>{t('ภาพรวมข้อมูลในระบบ AXONS Finance')}</p>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <span className="dash-card-title">{t('ตรวจสอบบัญชีกระทบยอด')}</span>
          <span className="dash-card-value">{reconciliationCount}</span>
          <button className="dash-card-link" onClick={() => onNavigateModule('reconciliation')}>
            {t('ดูทั้งหมด')}
          </button>
        </div>
        <div className="dash-card">
          <span className="dash-card-title">{t(MODULE_CONFIGS.reports.title)}</span>
          <span className="dash-card-value">{crudData.reports.length}</span>
          <button className="dash-card-link" onClick={() => onNavigateModule('reports')}>
            {t('ดูทั้งหมด')}
          </button>
        </div>
        <div className="dash-card">
          <span className="dash-card-title">{t('กลุ่มบัญชี')}</span>
          <span className="dash-card-value">{accountGroupsCount}</span>
          <button className="dash-card-link" onClick={() => onNavigateModule('account-group')}>
            {t('ดูทั้งหมด')}
          </button>
        </div>
        {remainingModuleKeys.map((key) => (
          <div className="dash-card" key={key}>
            <span className="dash-card-title">{t(MODULE_CONFIGS[key].title)}</span>
            <span className="dash-card-value">{crudData[key].length}</span>
            <button className="dash-card-link" onClick={() => onNavigateModule(key)}>
              {t('ดูทั้งหมด')}
            </button>
          </div>
        ))}
        <div className="dash-card">
          <span className="dash-card-title">{t('เป้าหมายงบการเงิน')}</span>
          <span className="dash-card-value">{financialTargetsCount}</span>
          <button className="dash-card-link" onClick={() => onNavigateModule('financial-target')}>
            {t('ดูทั้งหมด')}
          </button>
        </div>
      </div>
    </>
  );
}
