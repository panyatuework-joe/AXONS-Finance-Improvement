import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Dialog from '../components/Dialog';
import StatusBadge from '../components/StatusBadge';
import { buildGlWriteoffSchedule, formatWholeAmount, glWriteoffPerPeriodAmount } from '../utils';
import {
  CancelCircleIcon,
  ChevronBreadcrumbIcon,
  CopyDuplicateIcon,
  DownloadSmallIcon,
  ErrorCircleSolidIcon,
  FileDocIcon,
  PauseCircleIcon,
  PreviewFileIcon,
  ResumeIcon,
  WarningCircleSolidIcon,
} from '../icons';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GlWriteoffDetailPage({ entry, onBack, onStatusChange, onDuplicate }) {
  const { t } = useApp();
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pauseSuccessOpen, setPauseSuccessOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

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

  function handleConfirmPause() {
    setPauseConfirmOpen(false);
    onStatusChange({ ...entry, status: 'หยุดชั่วคราว', statusReason: pauseReason });
    setPauseSuccessOpen(true);
  }

  function handlePauseSuccessClose() {
    setPauseSuccessOpen(false);
    setPauseReason('');
  }

  function handleConfirmCancel() {
    setCancelConfirmOpen(false);
    onStatusChange({ ...entry, status: 'ยกเลิก', statusReason: cancelReason });
    setCancelSuccessOpen(true);
  }

  function handleCancelSuccessClose() {
    setCancelSuccessOpen(false);
    setCancelReason('');
  }

  function handleResume() {
    onStatusChange({ ...entry, status: 'ระหว่างดำเนินการ', statusReason: '' });
  }

  function handleDuplicate() {
    onDuplicate(entry);
  }

  const accountRows = useMemo(
    () => [
      ...entry.debitLines.map((line) => ({ ...line, side: 'debit' })),
      ...entry.creditLines.map((line) => ({ ...line, side: 'credit' })),
    ],
    [entry.debitLines, entry.creditLines],
  );
  const debitTotal = perPeriodAmount * entry.debitLines.length;
  const creditTotal = perPeriodAmount * entry.creditLines.length;

  return (
    <>
      <div className="aft-page-header glwd-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={onBack}>
            {t('จัดการรายการตัดบัญชี')}
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
            {entry.status === 'ยกเลิก' && (
              <button className="ft-btn-outline" onClick={handleDuplicate}>
                <CopyDuplicateIcon />
                {t('คัดลอกรายการตัดบัญชี')}
              </button>
            )}
            {entry.status === 'หยุดชั่วคราว' && (
              <>
                <button className="ft-btn-outline" onClick={handleDuplicate}>
                  <CopyDuplicateIcon />
                  {t('คัดลอกรายการตัดบัญชี')}
                </button>
                <button className="ft-btn-primary" onClick={handleResume}>
                  <ResumeIcon />
                  {t('ดำเนินการตัดบัญชีต่อ')}
                </button>
              </>
            )}
            {entry.status !== 'ยกเลิก' && entry.status !== 'หยุดชั่วคราว' && (
              <>
                <button className="ft-btn-outline" onClick={() => setPauseConfirmOpen(true)}>
                  <PauseCircleIcon />
                  {t('หยุดการตัดบัญชีชั่วคราว')}
                </button>
                <button className="ft-btn-outline-danger" onClick={() => setCancelConfirmOpen(true)}>
                  <CancelCircleIcon color="#D92D20" />
                  {t('ยกเลิกการตัดบัญชี')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {entry.status === 'ยกเลิก' && (
        <div className="glwd-status-banner glwd-status-banner--cancelled">
          <ErrorCircleSolidIcon />
          <div className="glwd-status-banner-text">
            <span className="glwd-status-banner-title">{t('รายการตัดบัญชีนี้ถูกยกเลิกแล้ว')}</span>
            {entry.statusReason && (
              <span className="glwd-status-banner-message">
                {t('เหตุผลการยกเลิก')}: {entry.statusReason}
              </span>
            )}
          </div>
        </div>
      )}

      {entry.status === 'หยุดชั่วคราว' && (
        <div className="glwd-status-banner glwd-status-banner--paused">
          <WarningCircleSolidIcon />
          <div className="glwd-status-banner-text">
            <span className="glwd-status-banner-title">{t('รายการตัดบัญชีนี้ถูกหยุดชั่วคราว')}</span>
            {entry.statusReason && (
              <span className="glwd-status-banner-message">
                {t('เหตุผลการหยุด')}: {entry.statusReason}
              </span>
            )}
          </div>
        </div>
      )}

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
                  <div className="glwd-file-info">
                    <span className="glwd-file-name">{name}</span>
                    <span className="glwd-file-size">1.2 MB</span>
                  </div>
                  <div className="glwd-file-actions">
                    <button type="button" className="glwd-file-action-btn glwd-file-action-btn--outline" title={t('ดูตัวอย่าง')}>
                      <PreviewFileIcon />
                    </button>
                    <button type="button" className="glwd-file-action-btn glwd-file-action-btn--filled" title={t('ดาวน์โหลด')}>
                      <DownloadSmallIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="aft-divider" />

        <div className="glw-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('ข้อมูลบัญชี')}
            </div>
            <div className="glw-section-subtitle">
              {t('ระบบคำนวณยอดเดบิตและเครดิตเริ่มต้นจากยอดรวมทั้งสัญญา ออกมาเป็นยอดตัดบัญชีต่อเดือน')}
            </div>
          </div>
        </div>
        <div className="glw-line-table-wrapper">
          <table className="glw-line-table">
            <colgroup>
              <col style={{ width: '220px' }} />
              <col style={{ width: '220px' }} />
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t('ฝ่าย (UL)')}</th>
                <th>{t('รหัสบัญชี')}</th>
                <th>{t('รหัส CV')}</th>
                <th className="glw-col-amount">{t('เดบิต (THB)')}</th>
                <th className="glw-col-amount">{t('เครดิต (THB)')}</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map((line) => (
                <tr key={line.id}>
                  <td>{t(line.dept)}</td>
                  <td>{t(line.accountCode)}</td>
                  <td>{t(line.cvCode)}</td>
                  <td className="glw-col-amount">{line.side === 'debit' ? formatWholeAmount(perPeriodAmount) : ''}</td>
                  <td className="glw-col-amount">{line.side === 'credit' ? formatWholeAmount(perPeriodAmount) : ''}</td>
                </tr>
              ))}
              <tr className="glw-total-row">
                <td colSpan={3} className="glw-total-label">
                  {t('ยอดรวม')}
                </td>
                <td className="glw-col-amount glw-total-amount">{formatWholeAmount(debitTotal)}</td>
                <td className="glw-col-amount glw-total-amount">{formatWholeAmount(creditTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="aft-divider" />

        <div className="glw-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('รายละเอียดการตัดบัญชีรายงวด')}
            </div>
            <div className="glw-section-subtitle">
              {t('ระบบคำนวณยอดตัดบัญชีอัตโนมัติ')}{' '}
              <span className="glw-subtitle-highlight">
                {entry.installments} {t('งวด')}
              </span>{' '}
              {t('หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}
            </div>
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
              <col style={{ width: '100px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t('งวดที่')}</th>
                <th>{t('วันที่ตัดบัญชี')}</th>
                <th className="glw-col-amount">{t('จำนวนเงินต่องวด (THB)')}</th>
                <th>{t('เลขที่เอกสารนำจ่าย')}</th>
                <th>{t('ชื่อผู้ดำเนินการ')}</th>
                <th>{t('วันที่ดำเนินการ')}</th>
                <th>{t('หมายเหตุ')}</th>
                <th>{t('สถานะ')}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => {
                const isPaid = row.seq <= entry.installmentsPaid;
                return (
                  <tr key={row.seq}>
                    <td>
                      {row.seq}/{schedule.length}
                    </td>
                    <td>{row.date}</td>
                    <td className="glw-col-amount">{formatMoney(row.amount)} THB</td>
                    <td>{isPaid ? `JV${String(row.seq).padStart(7, '0')}` : '-'}</td>
                    <td>{isPaid ? t('อัตโนมัติ') : '-'}</td>
                    <td>{isPaid ? row.date : '-'}</td>
                    <td>-</td>
                    <td>
                      {isPaid ? (
                        <span className="glwd-chip glwd-chip--ok">{t('จ่ายสำเร็จ')}</span>
                      ) : (
                        <span className="glwd-chip glwd-chip--neutral">{t('รอตัดจ่าย')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="glw-total-row">
                <td className="glw-total-label" colSpan={2}>
                  {t('ยอดรวม')}
                </td>
                <td className="glw-col-amount glw-total-amount">{formatMoney(entry.totalAmount)} THB</td>
                <td colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={pauseConfirmOpen}
        variant="pause"
        title={
          <>
            {t('คุณต้องการหยุดการตัดบัญชีชั่วคราว')}
            <br />
            {t('ใช่ไหม?')}
          </>
        }
        message={t('หากหยุดการตัดบัญชีชั่วคราว ระบบจะพักการตัดบัญชีรายการนี้ไว้ก่อน')}
        onClose={() => setPauseConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setPauseConfirmOpen(false) },
          { label: t('หยุดชั่วคราว'), variant: 'primary', onClick: handleConfirmPause },
        ]}
      >
        <div className="dialog-reason">
          <label className="dialog-reason-label">{t('เหตุผล')}</label>
          <textarea
            className="dialog-reason-input"
            placeholder={t('กรุณากรอก')}
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
          />
        </div>
      </Dialog>

      <Dialog
        open={pauseSuccessOpen}
        variant="success"
        title={t('หยุดการตัดบัญชีชั่วคราวสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handlePauseSuccessClose}
      />

      <Dialog
        open={cancelConfirmOpen}
        variant="cancel-danger"
        title={t('คุณต้องการยกเลิกการตัดบัญชีใช่ไหม?')}
        message={t('หากยกเลิกการตัดบัญชีนี้ ระบบจะไม่ตัดบัญชีรายการนี้อีก')}
        onClose={() => setCancelConfirmOpen(false)}
        actions={[
          { label: t('ย้อนกลับ'), variant: 'outline', onClick: () => setCancelConfirmOpen(false) },
          { label: t('ยกเลิก'), variant: 'danger', onClick: handleConfirmCancel },
        ]}
      >
        <div className="dialog-reason">
          <label className="dialog-reason-label">{t('เหตุผล')}</label>
          <textarea
            className="dialog-reason-input"
            placeholder={t('กรุณากรอก')}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Dialog>

      <Dialog
        open={cancelSuccessOpen}
        variant="success"
        title={t('ยกเลิกการตัดบัญชีสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleCancelSuccessClose}
      />
    </>
  );
}
