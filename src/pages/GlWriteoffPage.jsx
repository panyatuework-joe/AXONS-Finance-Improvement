import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';

export default function GlWriteoffPage({ title }) {
  const { t } = useApp();
  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t(title)}</h1>
      </div>

      <div className="ft-content-card">
        <EmptyState
          title="อยู่ระหว่างการพัฒนา"
          message="หน้านี้จะพร้อมใช้งานเร็ว ๆ นี้"
        />
      </div>
    </>
  );
}
