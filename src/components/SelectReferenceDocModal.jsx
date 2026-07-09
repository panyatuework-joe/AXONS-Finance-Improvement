import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import EmptyState from './EmptyState';
import { CloseIcon, SearchIcon } from '../icons';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "เลือก" flow: pick a posted GL/AP document that has no purchase tax invoice recorded yet. */
export default function SelectReferenceDocModal({ availableDocs, onSelect, onClose }) {
  const { t } = useApp();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableDocs;
    return availableDocs.filter(
      (d) => d.docNo.toLowerCase().includes(q) || t(d.vendorName).toLowerCase().includes(q),
    );
  }, [availableDocs, search, t]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('เลือกเอกสารอ้างอิง')}</h3>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="ft-search-filter" style={{ margin: '0 24px 16px' }}>
          <div className="ft-search-input">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ค้นหาด้วย เลขที่เอกสารอ้างอิง หรือ เจ้าหนี้')}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="ft-table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="ft-table">
              <colgroup>
                <col style={{ width: '160px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '260px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '110px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{t('อ้างถึง')}</th>
                  <th>{t('เลขที่เอกสารอ้างถึง')}</th>
                  <th>{t('เจ้าหนี้')}</th>
                  <th>{t('รายการ')}</th>
                  <th>{t('มูลค่าสินค้า')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td>{t(doc.refDocType)}</td>
                    <td>{doc.docNo}</td>
                    <td>{t(doc.vendorName)}</td>
                    <td>{t(doc.description)}</td>
                    <td>{formatMoney(doc.amount)}</td>
                    <td>
                      <button className="ft-btn-primary" onClick={() => onSelect(doc)}>
                        {t('เลือก')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
