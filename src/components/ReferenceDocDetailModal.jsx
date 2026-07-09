import { useApp } from '../context/AppContext';
import { formatThaiDate } from '../utils';
import { CloseIcon } from '../icons';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Read-only view of the source GL/AP document behind a purchase tax invoice row (ดูรายละเอียดเอกสารอ้างอิงต้นทาง). */
export default function ReferenceDocDetailModal({ entry, onClose }) {
  const { t } = useApp();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('รายละเอียดเอกสารอ้างอิงต้นทาง')}</h3>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="filter-modal-body">
          <div className="view-detail-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('อ้างถึง')}</span>
              <span className="view-detail-value">{t(entry.refDocType)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('เลขที่เอกสารอ้างถึง')}</span>
              <span className="view-detail-value">{entry.refDocNo}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('เจ้าหนี้')}</span>
              <span className="view-detail-value">{t(entry.vendorName)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('หน่วยงานหลัก')}</span>
              <span className="view-detail-value">{t(entry.dept)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('หน่วยงานย่อย')}</span>
              <span className="view-detail-value">{t(entry.subDept)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('วันที่ใบกำกับภาษี')}</span>
              <span className="view-detail-value">{formatThaiDate(entry.invoiceDate)}</span>
            </div>
            <div className="view-detail-field" style={{ gridColumn: '1 / -1' }}>
              <span className="view-detail-label">{t('รายการ')}</span>
              <span className="view-detail-value">{t(entry.description)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('มูลค่าสินค้า')}</span>
              <span className="view-detail-value">{formatMoney(entry.baseAmount)} THB</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('ภาษี')} (%)</span>
              <span className="view-detail-value">{entry.taxRate}%</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('เงินภาษี')}</span>
              <span className="view-detail-value">{formatMoney(entry.taxAmount)} THB</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="ft-btn-primary" onClick={onClose}>
            {t('ปิด')}
          </button>
        </div>
      </div>
    </div>
  );
}
