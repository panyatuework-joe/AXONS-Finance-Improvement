import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Dialog from '../components/Dialog';
import StatusBadge from '../components/StatusBadge';
import { buildGlWriteoffSchedule, formatWholeAmount, glWriteoffPerPeriodAmount } from '../utils';
import { CancelCircleIcon, ChevronBreadcrumbIcon, FileDocIcon } from '../icons';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GlWriteoffDetailPage({ entry, onBack, onDelete }) {
  const { t } = useApp();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

  const schedule = useMemo(
    () => buildGlWriteoffSchedule(entry.totalAmount, entry.installments, entry.startPeriod),
    [entry.totalAmount, entry.installments, entry.startPeriod],
  );

  // ยอดบัญชีเดบิต/เครดิตล็อกตามยอดตัดบัญชีต่อเดือน (งวดที่ 2 เป็นต้นไป) เสมอ ไม่อิงค่าที่บันทึกไว้ในบรรทัด
  const perPeriodAmount = glWriteoffPerPeriodAmount(entry.totalAmount, entry.installments);

  const paidAmount = useMemo(
    () => schedule.slice(0, entry.installmentsPaid).reduce((sum, row) => sum + row.amount, 0),
    [schedule, entry.installmentsPaid],
  );

  function handleConfirmDelete() {
    setDeleteConfirmOpen(false);
    setDeleteSuccessOpen(true);
  }

  function handleDeleteSuccessClose() {
    setDeleteSuccessOpen(false);
    onDelete();
    onBack();
  }

  function renderLineTable(lines) {
    return (
      <div className="glw-line-table-wrapper">
        <table className="glw-line-table">
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '180px' }} />
            <col style={{ width: '260px' }} />
            <col style={{ width: '200px' }} />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>{t('ฝ่าย (UL)')}</th>
              <th>{t('รหัสบัญชี')}</th>
              <th>{t('รหัส CV')}</th>
              <th className="glw-col-amount">{t('จำนวนเงิน')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id}>
                <td>{i + 1}</td>
                <td>{t(line.dept)}</td>
                <td>{t(line.accountCode)}</td>
                <td>{t(line.cvCode)}</td>
                <td className="glw-col-amount">{formatWholeAmount(perPeriodAmount)} THB</td>
              </tr>
            ))}
            <tr className="glw-total-row">
              <td colSpan={4} className="glw-total-label">
                {t('ยอดรวม')}
              </td>
              <td className="glw-col-amount glw-total-amount">{formatWholeAmount(perPeriodAmount)} THB</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="aft-page-header glwd-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={onBack}>
            {t('การตัดบัญชี GL')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">{t('รายละเอียดรายการตัดบัญชี')}</span>
        </div>
        <div className="view-title-row">
          <div className="glwd-title-line">
            <h1 className="aft-page-title">{t('รายละเอียดรายการตัดบัญชี')}</h1>
            <span className="glwd-title-code">| {entry.code}</span>
            <span className="glwd-status-chip">
              <StatusBadge value={entry.status} />
            </span>
          </div>
          <div className="view-header-actions">
            <button className="ft-btn-outline-danger" onClick={() => setDeleteConfirmOpen(true)}>
              <CancelCircleIcon color="#D92D20" />
              {t('ยกเลิกการตัดบัญชี')}
            </button>
          </div>
        </div>
      </div>

      <div className="aft-card glwd-view">
        <div className="aft-section-title">{t('ข้อมูลการตัดบัญชี')}</div>

        <div className="view-detail-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('บริษัท')}</span>
            <span className="view-detail-value">{t(entry.company)}</span>
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
            <span className="view-detail-label">{t('ประเภทเอกสารอ้างอิง')}</span>
            <span className="view-detail-value">{t(entry.docType)}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('เลขที่เอกสารอ้างอิง')}</span>
            <span className="view-detail-value">{entry.docNo}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('ประเภท')}</span>
            <span className="view-detail-value">{t(entry.category)}</span>
          </div>
          <div className="view-detail-field" style={{ gridColumn: '1 / -1' }}>
            <span className="view-detail-label">{t('รายละเอียด')}</span>
            <span className="view-detail-value">{t(entry.description)}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('ยอดเงินรวมทั้งสัญญา')}</span>
            <span className="view-detail-value">{formatMoney(entry.totalAmount)} THB</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('จำนวนงวด')}</span>
            <span className="view-detail-value">{entry.installments}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('เริ่มตัดบัญชีงวดแรก')}</span>
            <span className="view-detail-value">{entry.startPeriod}</span>
          </div>
        </div>

        <div className="aft-divider" />

        <div className="aft-section-title">{t('ไฟล์แนบ')}</div>
        {entry.files.length === 0 ? (
          <span className="glw-file-empty">{t('ไม่มีไฟล์แนบ')}</span>
        ) : (
          <>
            <div className="glwd-file-header">
              <span className="glwd-file-header-text">
                {t('ไฟล์เอกสารแนบ')} <span className="glwd-file-count">{entry.files.length}</span> {t('รายการ')}
              </span>
              <span className="glwd-file-header-divider" />
            </div>
            <div className="glwd-file-list">
              {entry.files.map((name, i) => (
                <div className="glwd-file-card" key={`${name}-${i}`}>
                  <FileDocIcon />
                  <span className="glwd-file-name">{name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="aft-divider" />

        <div className="glw-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('ข้อมูลบัญชีเดบิต')}
            </div>
            <div className="glw-section-subtitle">
              {t('ระบบคำนวณยอดเดบิตและเครดิตเริ่มต้นจากยอดรวมทั้งสัญญา ออกมาเป็นยอดตัดบัญชีต่อเดือน')}
            </div>
          </div>
        </div>
        {renderLineTable(entry.debitLines)}

        <div className="glw-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('ข้อมูลบัญชีเครดิต')}
            </div>
            <div className="glw-section-subtitle">
              {t('ระบบคำนวณยอดเดบิตและเครดิตเริ่มต้นจากยอดรวมทั้งสัญญา ออกมาเป็นยอดตัดบัญชีต่อเดือน')}
            </div>
          </div>
        </div>
        {renderLineTable(entry.creditLines)}

        <div className="aft-divider" />

        <div className="glw-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('รายละเอียดการตัดบัญชีรายงวด')}
            </div>
            <div className="glw-section-subtitle">{t('ระบบคำนวณยอดตัดบัญชีต่อเดือนอัตโนมัติ')}</div>
          </div>
        </div>

        <div className="glwd-summary-row">
          <div className="glwd-summary-card">
            <span className="glwd-summary-label">{t('ยอดเงินรวมทั้งสัญญา')}</span>
            <span className="glwd-summary-value">
              {formatMoney(entry.totalAmount)} <span className="glwd-summary-unit">THB</span>
            </span>
          </div>
          <div className="glwd-summary-card">
            <span className="glwd-summary-label">{t('ยอดตัดบัญชีไปแล้ว')}</span>
            <span className="glwd-summary-value">
              {formatMoney(paidAmount)} <span className="glwd-summary-unit">THB</span>
            </span>
          </div>
        </div>

        <div className="glw-line-table-wrapper">
          <table className="glw-line-table glw-schedule-table">
            <colgroup>
              <col style={{ width: '160px' }} />
              <col />
              <col style={{ width: '240px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t('งวดที่')}</th>
                <th>{t('เดือน')}</th>
                <th className="glw-col-amount">{t('จำนวนเงินต่องวด (THB)')}</th>
                <th>{t('สถานะ')}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.seq}>
                  <td>
                    {row.seq}/{schedule.length}
                  </td>
                  <td>{row.date}</td>
                  <td className="glw-col-amount">{formatMoney(row.amount)} THB</td>
                  <td>
                    {row.seq <= entry.installmentsPaid ? (
                      <span className="glwd-chip glwd-chip--ok">{t('จ่ายสำเร็จ')}</span>
                    ) : (
                      <span className="glwd-chip glwd-chip--neutral">{t('รอตัดจ่าย')}</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="glw-total-row">
                <td className="glw-total-label" colSpan={2}>
                  {t('ยอดรวม')}
                </td>
                <td className="glw-col-amount glw-total-amount">{formatMoney(entry.totalAmount)} THB</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={deleteConfirmOpen}
        variant="delete"
        title={t('คุณต้องการลบรายการตัดบัญชีนี้ใช่ไหม?')}
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
        title={t('ลบรายการตัดบัญชีสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleDeleteSuccessClose}
      />
    </>
  );
}
