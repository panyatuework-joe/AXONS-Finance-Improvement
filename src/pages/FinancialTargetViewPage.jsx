import { useState } from 'react';
import { THAI_MONTH_OPTIONS } from '../data';
import { useApp } from '../context/AppContext';
import Dialog from '../components/Dialog';
import { ChevronBreadcrumbIcon, EditIcon, DeleteIcon } from '../icons';

export default function FinancialTargetViewPage({ target, onBack, onEdit, onDelete }) {
  const { t } = useApp();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

  const total = target.monthlyAmounts.reduce((sum, n) => sum + n, 0);
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleConfirmDelete() {
    setDeleteConfirmOpen(false);
    setDeleteSuccessOpen(true);
  }

  function handleDeleteSuccessClose() {
    setDeleteSuccessOpen(false);
    onDelete();
    onBack();
  }

  return (
    <>
      <div className="aft-page-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={onBack}>
            {t('เป้าหมายงบการเงิน')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">{t('รายละเอียดเป้าหมายงบการเงิน')}</span>
        </div>
        <div className="view-title-row">
          <h1 className="aft-page-title">{t('รายละเอียดเป้าหมายงบการเงิน')}</h1>
          <div className="view-header-actions">
            <button className="ft-btn-outline" onClick={onEdit}>
              <EditIcon color="var(--color-primary-default)" />
              {t('แก้ไข')}
            </button>
            <button className="ft-btn-outline-danger" onClick={() => setDeleteConfirmOpen(true)}>
              <DeleteIcon color="var(--color-error-default)" />
              {t('ลบ')}
            </button>
          </div>
        </div>
      </div>

      <div className="aft-card">
        <div className="aft-section-title">{t('รายละเอียด')}</div>

        <div className="view-detail-grid">
          <div className="view-detail-field">
            <span className="view-detail-label">{t('ปีงบการเงิน')}</span>
            <span className="view-detail-value">{target.year}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('หน่วยงานหลัก')}</span>
            <span className="view-detail-value">{t(target.dept)}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('หน่วยงานย่อย')}</span>
            <span className="view-detail-value">{t(target.subDept)}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('กลุ่มบัญชี')}</span>
            <span className="view-detail-value">{t(target.accountCode)}</span>
          </div>
        </div>

        <div className="aft-divider" />

        <div className="aft-monthly-title">{t('เป้าหมายงบการเงินรายเดือน')}</div>

        <table className="aft-monthly-table">
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>{t('เดือน')}</th>
              <th>{t('จำนวนเงินเป้าหมาย')}</th>
            </tr>
          </thead>
          <tbody>
            {THAI_MONTH_OPTIONS.map((month, i) => (
              <tr key={month}>
                <td>{t(month)}</td>
                <td className="view-amount-cell">{fmt(target.monthlyAmounts[i] ?? 0)} THB</td>
              </tr>
            ))}
            <tr>
              <td className="view-total-label">Total</td>
              <td className="view-amount-cell">
                <strong>{fmt(total)} THB</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Dialog
        open={deleteConfirmOpen}
        variant="delete"
        title={t('คุณต้องการลบเป้าหมายงบการเงินนี้ใช่ไหม?')}
        message={t('หากลบแล้ว จะไม่สามารถเรียกคืนได้อีก')}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setDeleteConfirmOpen(false) },
          { label: t('ลบ'), variant: 'danger', onClick: handleConfirmDelete },
        ]}
      />

      <Dialog
        open={deleteSuccessOpen}
        variant="success"
        title={t('ลบเป้าหมายงบการเงินสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleDeleteSuccessClose}
      />
    </>
  );
}
