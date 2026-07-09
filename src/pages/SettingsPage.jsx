import { useApp } from '../context/AppContext';
import { translateVars } from '../i18n';

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`toggle-switch${checked ? ' toggle-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export default function SettingsPage() {
  const { language, setLanguage, notificationsEnabled, setNotificationsEnabled, pushToast, t } = useApp();

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('การตั้งค่า')}</h1>
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t('ภาษา')}</div>
            <div className="settings-row-desc">{t('เลือกภาษาที่แสดงในแถบเมนูบน (TH / EN)')}</div>
          </div>
          <button
            className="ft-btn-outline"
            onClick={() => {
              const next = language === 'TH' ? 'EN' : 'TH';
              setLanguage(next);
              pushToast(translateVars('เปลี่ยนภาษาเป็น {value}', { value: next }, next), 'success');
            }}
          >
            {language === 'TH' ? 'TH' : 'EN'}
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t('การแจ้งเตือน')}</div>
            <div className="settings-row-desc">{t('แสดงข้อความแจ้งเตือนเมื่อเพิ่ม/แก้ไข/ลบข้อมูลสำเร็จ')}</div>
          </div>
          <ToggleSwitch checked={notificationsEnabled} onChange={setNotificationsEnabled} />
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">{t('ผู้ใช้งาน')}</div>
            <div className="settings-row-desc">{t('สิริศักดิ์ หงษ์พัตรา · AXONS')}</div>
          </div>
        </div>
      </div>
    </>
  );
}
