import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { buildRecurringSchedule, recurringPerPeriodAmount } from '../utils';
import {
  CancelCircleIcon,
  ChevronBreadcrumbIcon,
  CloseIcon,
  CopyDuplicateIcon,
  DeleteIcon,
  DownloadSmallIcon,
  EditIcon,
  ErrorCircleSolidIcon,
  FileDocIcon,
  HistoryOutlineIcon,
  PreviewFileIcon,
} from '../icons';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatEditDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export default function RecurringDetailPage({
  entry,
  onBack,
  backLabel = 'จัดการรายการบัญชีประจำ',
  onStatusChange,
  onDuplicate,
  onEdit,
  onDelete,
}) {
  const { t } = useApp();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDescription, setEditDescription] = useState(entry.description);
  const [saveEditConfirmOpen, setSaveEditConfirmOpen] = useState(false);
  const [cancelEditConfirmOpen, setCancelEditConfirmOpen] = useState(false);
  const [saveEditSuccessOpen, setSaveEditSuccessOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [retryConfirmOpen, setRetryConfirmOpen] = useState(false);
  const [retrySuccessOpen, setRetrySuccessOpen] = useState(false);

  const schedule = useMemo(
    () => buildRecurringSchedule(entry.totalAmount, entry.installments, entry.startPeriod),
    [entry.totalAmount, entry.installments, entry.startPeriod],
  );

  // ยอดบัญชีเดบิต/เครดิตล็อกตามยอดตัดบัญชีต่อเดือน (งวดที่ 2 เป็นต้นไป) เสมอ ไม่อิงค่าที่บันทึกไว้ในบรรทัด
  const perPeriodAmount = recurringPerPeriodAmount(entry.totalAmount, entry.installments);

  const paidAmount = useMemo(
    () => schedule.slice(0, entry.installmentsPaid).reduce((sum, row) => sum + row.amount, 0),
    [schedule, entry.installmentsPaid],
  );

  // บันทึกประวัติการดำเนินการอย่างง่าย ที่คำนวณได้จากข้อมูลของรายการเอง (ไม่ได้เก็บ audit log จริงในระบบ)
  const historyRows = useMemo(() => {
    const rows = [
      { date: entry.createdAt, action: t('สร้างรายการบัญชีประจำ'), actionBy: entry.createdBy, reason: '' },
    ];
    for (let i = 0; i < entry.installmentsPaid; i++) {
      rows.push({
        date: schedule[i]?.date ?? '',
        action: `${t('ดำเนินการ')} ${t('งวดที่')} ${i + 1}/${entry.installments}`,
        actionBy: t('ดำเนินการโดยระบบ'),
        reason: '',
      });
    }
    if (entry.editedAt) {
      rows.push({
        date: entry.editedAt,
        action: t('แก้ไขรายละเอียดบัญชีประจำ'),
        actionBy: entry.createdBy,
        reason: '',
      });
    }
    if (entry.status === 'ยกเลิก') {
      rows.push({
        date: entry.createdAt,
        action: t('ยกเลิกรายการบัญชีประจำ'),
        actionBy: entry.createdBy,
        reason: entry.statusReason,
      });
    }
    return rows;
  }, [entry, schedule, t]);

  // เฉพาะ "ฉบับร่าง" เท่านั้นที่กรอกข้อมูลไม่ครบได้ สถานะอื่น (ระหว่างดำเนินการ/เสร็จสิ้น/ยกเลิก)
  // ต้องมี "ข้อมูลบัญชี" และ "รายละเอียดบัญชีประจำรายงวด" ครบเสมอ จึงไม่ต้องตรวจสอบความครบถ้วนอีก
  const accountInfoValid =
    entry.status !== 'ฉบับร่าง' ||
    (!!entry.dept &&
      !!entry.docType &&
      !!entry.docNo &&
      !!entry.category &&
      !!entry.description &&
      entry.totalAmount > 0 &&
      !!entry.paymentFrequency &&
      entry.installments > 0 &&
      !!entry.startPeriod);

  function handleConfirmDelete() {
    setDeleteConfirmOpen(false);
    onDelete(entry);
  }

  function handleStartEdit() {
    setEditDescription(`${entry.description} (แก้ไข ${formatEditDate(new Date())})`);
    setEditMode(true);
  }

  function handleConfirmCancelEdit() {
    setCancelEditConfirmOpen(false);
    setEditDescription(entry.description);
    setEditMode(false);
  }

  function handleConfirmSaveEdit() {
    setSaveEditConfirmOpen(false);
    onStatusChange({ ...entry, description: editDescription, editedAt: formatEditDate(new Date()) });
    setEditMode(false);
    setSaveEditSuccessOpen(true);
  }

  function handleConfirmCancel() {
    setCancelConfirmOpen(false);
    onStatusChange({ ...entry, status: 'ยกเลิก', statusReason: cancelReason });
    setCancelSuccessOpen(true);
  }

  function handleConfirmRetry() {
    setRetryConfirmOpen(false);
    onStatusChange({
      ...entry,
      failedInstallment: null,
      installmentsPaid: Math.min(entry.installments, entry.installmentsPaid + 1),
    });
    setRetrySuccessOpen(true);
  }

  function handleCancelSuccessClose() {
    setCancelSuccessOpen(false);
    setCancelReason('');
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
      <div className="aft-page-header recd-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={onBack}>
            {t(backLabel)}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">
            {t(editMode ? 'แก้ไขรายการบัญชีประจำ' : 'รายละเอียดรายการบัญชีประจำ')}
          </span>
        </div>
        <div className="view-title-row">
          <div className="recd-title-line">
            <h1 className="aft-page-title">{t(editMode ? 'แก้ไขรายการบัญชีประจำ' : 'รายละเอียดรายการบัญชีประจำ')}</h1>
            <span className="recd-title-code">| {entry.code}</span>
            <span className="recd-status-chip">
              <StatusBadge value={entry.status} variant={entry.status === 'ฉบับร่าง' ? 'neutral-strong' : undefined} />
            </span>
          </div>
          {!editMode && (
          <div className="view-header-actions">
            {entry.status === 'ฉบับร่าง' && (
              <>
                <button className="ft-btn-outline" onClick={() => onEdit(entry)}>
                  <EditIcon color="var(--color-primary-default)" />
                  {t('แก้ไข')}
                </button>
                <button className="ft-btn-outline-danger" onClick={() => setDeleteConfirmOpen(true)}>
                  <DeleteIcon color="var(--color-error-default)" size={20} />
                  {t('ลบ')}
                </button>
              </>
            )}
            {entry.status === 'ยกเลิก' && (
              <button className="ft-btn-outline" onClick={handleDuplicate}>
                <CopyDuplicateIcon />
                {t('คัดลอกรายการบัญชีประจำ')}
              </button>
            )}
            {entry.status === 'เสร็จสิ้น' && (
              <button className="ft-btn-outline" onClick={() => setHistoryOpen(true)}>
                <HistoryOutlineIcon color="var(--color-primary-default)" />
                {t('ประวัติ')}
              </button>
            )}
            {entry.status === 'ระหว่างดำเนินการ' && (
              <>
                <button className="ft-btn-outline" onClick={() => setHistoryOpen(true)}>
                  <HistoryOutlineIcon color="var(--color-primary-default)" />
                  {t('ประวัติ')}
                </button>
                <button
                  className="ft-btn-outline"
                  onClick={() => (entry.installmentsPaid === 0 ? onEdit(entry) : handleStartEdit())}
                >
                  <EditIcon color="var(--color-primary-default)" />
                  {t('แก้ไข')}
                </button>
                <button className="ft-btn-outline-danger" onClick={() => setCancelConfirmOpen(true)}>
                  <CancelCircleIcon color="var(--color-error-default)" />
                  {t('ยกเลิก')}
                </button>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      {entry.status === 'ยกเลิก' && (
        <div className="recd-status-banner recd-status-banner--cancelled">
          <ErrorCircleSolidIcon />
          <div className="recd-status-banner-text">
            <span className="recd-status-banner-title">{t('รายการตัดบัญชีนี้ถูกยกเลิกแล้ว')}</span>
            {entry.statusReason && (
              <span className="recd-status-banner-message">
                {t('เหตุผลการยกเลิก')}: {entry.statusReason}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="aft-card recd-view">
        <div className="aft-section-title">{t('ข้อมูลบัญชีประจำ')}</div>

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
            <span className="view-detail-label">
              {t('รายละเอียด')} {editMode && <span className="aft-required">*</span>}
            </span>
            {editMode ? (
              <>
                <textarea
                  className="modal-input"
                  rows={3}
                  value={editDescription}
                  maxLength={100}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <span className="rec-char-count">{editDescription.length}/100</span>
              </>
            ) : (
              <span className="view-detail-value">{t(entry.description)}</span>
            )}
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('ยอดเงินรวมทั้งสัญญา')}</span>
            <span className="view-detail-value">
              {entry.totalAmount > 0 ? `${formatMoney(entry.totalAmount)} THB` : '-'}
            </span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('ความถี่งวด')}</span>
            <span className="view-detail-value">{entry.paymentFrequency ? t(entry.paymentFrequency) : '-'}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('จำนวนงวด')}</span>
            <span className="view-detail-value">{entry.installments > 0 ? entry.installments : '-'}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('เริ่มตัดบัญชีงวดแรก')}</span>
            <span className="view-detail-value">{entry.startPeriod || '-'}</span>
          </div>
        </div>

        <div className="aft-divider" />

        <div className="aft-section-title">{t('ไฟล์แนบ')}</div>
        {entry.files.length === 0 ? (
          <span className="rec-file-empty">{t('ไม่มีไฟล์แนบ')}</span>
        ) : (
          <>
            <div className="recd-file-header">
              <span className="recd-file-header-text">
                {t('ไฟล์เอกสารแนบ')} <span className="recd-file-count">{entry.files.length}</span> {t('รายการ')}
              </span>
              <span className="recd-file-header-divider" />
            </div>
            <div className="recd-file-list">
              {entry.files.map((name, i) => (
                <div className="recd-file-card" key={`${name}-${i}`}>
                  <FileDocIcon />
                  <div className="recd-file-info">
                    <span className="recd-file-name">{name}</span>
                    <span className="recd-file-size">1.2 MB</span>
                  </div>
                  <div className="recd-file-actions">
                    <button type="button" className="recd-file-action-btn recd-file-action-btn--outline" title={t('ดูตัวอย่าง')}>
                      <PreviewFileIcon />
                    </button>
                    <button type="button" className="recd-file-action-btn recd-file-action-btn--filled" title={t('ดาวน์โหลด')}>
                      <DownloadSmallIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="aft-divider" />

        {!accountInfoValid ? (
          <>
            <div className="aft-section-title">{t('ข้อมูลบัญชี')}</div>
            <EmptyState title={t('ไม่มีข้อมูล')} message={t('กรุณากรอกข้อมูลบัญชีประจำให้ครบถ้วนก่อน')} />
          </>
        ) : (
          <>
        <div className="rec-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('ข้อมูลบัญชี')}
            </div>
            <div className="rec-section-subtitle">
              {t('ระบบคำนวณยอดเดบิตและเครดิตเริ่มต้นจากยอดรวมทั้งสัญญา ออกมาเป็นยอดบัญชีประจำต่อเดือน')}
            </div>
          </div>
        </div>
        <div className="rec-line-table-wrapper">
          <table className="rec-line-table rec-account-table" style={{ minWidth: '1146px' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '182px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '226px' }} />
              <col style={{ width: '182px' }} />
              <col style={{ width: '178px' }} />
              <col style={{ width: '178px' }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>{t('ฝ่าย (UL)')}</th>
                <th>{t('เดบิต/เครดิต')}</th>
                <th>{t('รหัสบัญชี')}</th>
                <th>{t('รหัส CV')}</th>
                <th className="rec-col-amount rec-col-sticky-2">{t('เดบิต (THB)')}</th>
                <th className="rec-col-amount rec-col-sticky-1">{t('เครดิต (THB)')}</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map((line, i) => (
                <tr key={line.id}>
                  <td>{i + 1}</td>
                  <td>{t(line.dept)}</td>
                  <td>{t(line.accountCode)}</td>
                  <td>{t(line.glAccountCode)}</td>
                  <td>{t(line.cvCode)}</td>
                  <td className="rec-col-amount rec-col-sticky-2">{line.side === 'debit' ? formatMoney(perPeriodAmount) : ''}</td>
                  <td className="rec-col-amount rec-col-sticky-1">{line.side === 'credit' ? formatMoney(perPeriodAmount) : ''}</td>
                </tr>
              ))}
              <tr className="rec-total-row">
                <td colSpan={5} className="rec-total-label">
                  {t('ยอดรวม')}
                </td>
                <td className="rec-col-amount rec-total-amount rec-col-sticky-2">{formatMoney(debitTotal)}</td>
                <td className="rec-col-amount rec-total-amount rec-col-sticky-1">{formatMoney(creditTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="aft-divider" />

        <div className="rec-section-header">
          <div>
            <div className="aft-section-title" style={{ marginBottom: 0 }}>
              {t('รายละเอียดบัญชีประจำรายงวด')}
            </div>
            <div className="rec-section-subtitle">
              {t('ระบบคำนวณยอดตัดบัญชีอัตโนมัติ')}{' '}
              <span className="rec-subtitle-highlight">
                {entry.installments} {t('งวด')}
              </span>{' '}
              {t('หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}
            </div>
          </div>
        </div>

        <div className="recd-summary-row">
          <div className="recd-summary-card">
            <span className="recd-summary-label">{t('ยอดเงินรวมทั้งสัญญา')}</span>
            <span className="recd-summary-value">
              {formatMoney(entry.totalAmount)} <span className="recd-summary-unit">THB</span>
            </span>
          </div>
          <div className="recd-summary-card">
            <span className="recd-summary-label">{t('ยอดดำเนินการไปแล้ว')}</span>
            <span className="recd-summary-value">
              {formatMoney(paidAmount)} <span className="recd-summary-unit">THB</span>
            </span>
          </div>
          <div className="recd-summary-card">
            <span className="recd-summary-label">{t('ยอดดำเนินการคงเหลือ')}</span>
            <span className="recd-summary-value">
              {formatMoney(entry.totalAmount - paidAmount)} <span className="recd-summary-unit">THB</span>
            </span>
          </div>
        </div>

        <div className="rec-line-table-wrapper">
          <table className="rec-line-table rec-schedule-table" style={{ minWidth: '1170px' }}>
            <colgroup>
              <col style={{ width: '100px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '120px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{t('งวดที่')}</th>
                <th>{t('วันที่ดำเนินการ')}</th>
                <th className="rec-col-amount">{t('จำนวนเงินต่องวด (THB)')}</th>
                <th>{t('เลขที่เอกสารใบโอนบัญชี')}</th>
                <th>{t('ชื่อผู้ดำเนินการ')}</th>
                <th>{t('วันที่ดำเนินการ')}</th>
                <th>{t('หมายเหตุ')}</th>
                <th className="rec-col-sticky-1">{t('สถานะ')}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => {
                const isPaid = row.seq <= entry.installmentsPaid;
                const isFailed = row.seq === entry.failedInstallment;
                const isAttempted = isPaid || isFailed;
                return (
                  <tr key={row.seq}>
                    <td>
                      {row.seq}/{schedule.length}
                    </td>
                    <td>{row.date}</td>
                    <td className="rec-col-amount">{formatMoney(row.amount)}</td>
                    <td>{isAttempted ? `JV${String(row.seq).padStart(7, '0')}` : '-'}</td>
                    <td>{isAttempted ? t('ดำเนินการโดยระบบ') : '-'}</td>
                    <td>{isAttempted ? row.date : '-'}</td>
                    <td>-</td>
                    <td className="rec-col-sticky-1">
                      {isPaid ? (
                        <span className="recd-chip recd-chip--ok">{t('สำเร็จ')}</span>
                      ) : isFailed ? (
                        <span className="recd-chip recd-chip--bad">{t('ไม่สำเร็จ')}</span>
                      ) : entry.status === 'ยกเลิก' ? (
                        <span className="recd-chip recd-chip--spare">{t('ยกเลิก')}</span>
                      ) : (
                        <span className="recd-chip recd-chip--neutral">{t('รอดำเนินการ')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="rec-total-row">
                <td className="rec-total-label" colSpan={2}>
                  {t('ยอดรวม')}
                </td>
                <td className="rec-col-amount rec-total-amount">{formatMoney(entry.totalAmount)}</td>
                <td colSpan={4}></td>
                <td className="rec-col-sticky-1"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {entry.failedInstallment && (
          <div className="aft-actions">
            <button className="aft-btn-add" onClick={() => setRetryConfirmOpen(true)}>
              {t('ดำเนินการตัดบัญชีอีกครั้ง')}
            </button>
          </div>
        )}
          </>
        )}

        {editMode && (
          <div className="aft-actions">
            <button className="ft-btn-outline" onClick={() => setCancelEditConfirmOpen(true)}>
              {t('ยกเลิก')}
            </button>
            <button className="aft-btn-add" onClick={() => setSaveEditConfirmOpen(true)}>
              {t('บันทึก')}
            </button>
          </div>
        )}
      </div>

      <Dialog
        open={saveEditConfirmOpen}
        variant="save"
        title={t('คุณต้องการบันทึกการแก้ไขรายการบัญชีประจำใช่ไหม?')}
        message={t('กรุณาตรวจสอบข้อมูลรายการบัญชีประจำให้ถูกต้องก่อนบันทึก')}
        onClose={() => setSaveEditConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setSaveEditConfirmOpen(false) },
          { label: t('บันทึก'), variant: 'primary', onClick: handleConfirmSaveEdit },
        ]}
      />

      <Dialog
        open={cancelEditConfirmOpen}
        variant="cancel"
        title={t('คุณต้องการยกเลิกการแก้ไขรายการบัญชีประจำใช่ไหม?')}
        message={t('หากยกเลิกการแก้ไขรายการบัญชีประจำ ข้อมูลที่กรอกจะไม่ถูกบันทึกในระบบ')}
        onClose={() => setCancelEditConfirmOpen(false)}
        actions={[
          { label: t('ย้อนกลับ'), variant: 'outline', onClick: () => setCancelEditConfirmOpen(false) },
          { label: t('ยกเลิกการแก้ไข'), variant: 'primary', onClick: handleConfirmCancelEdit },
        ]}
      />

      <Dialog
        open={saveEditSuccessOpen}
        variant="success"
        title={t('แก้ไขรายการบัญชีประจำสำเร็จ!')}
        autoCloseMs={3000}
        onClose={() => setSaveEditSuccessOpen(false)}
      />

      <Dialog
        open={cancelConfirmOpen}
        variant="cancel-danger"
        title={t('คุณต้องการยกเลิกรายการบัญชีประจำนี้ใช่ไหม?')}
        message={t('หากยกเลิกรายการบัญชีประจำนี้ ระบบจะไม่ตัดบัญชีรายการนี้อีก')}
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
        title={t('ยกเลิกรายการบัญชีประจำสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleCancelSuccessClose}
      />

      <Dialog
        open={deleteConfirmOpen}
        variant="delete"
        title={t('คุณต้องการลบฉบับร่างนี้ใช่ไหม?')}
        message={t('หากลบแล้ว จะไม่สามารถเรียกคืนได้อีก')}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setDeleteConfirmOpen(false) },
          { label: t('ลบ'), variant: 'danger', onClick: handleConfirmDelete },
        ]}
      />

      <Dialog
        open={retryConfirmOpen}
        variant="import"
        title={t('คุณต้องการดำเนินการตัดบัญชีอีกครั้งใช่ไหม?')}
        message={t('กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการตัดบัญชี')}
        onClose={() => setRetryConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setRetryConfirmOpen(false) },
          { label: t('ดำเนินการ'), variant: 'primary', onClick: handleConfirmRetry },
        ]}
      />

      <Dialog
        open={retrySuccessOpen}
        variant="success"
        title={t('ดำเนินการรายการบัญชีประจำสำเร็จ!')}
        message={t('สามารถตรวจสอบสถานะของรายการตัดบัญชีได้ในหน้าประวัติการตัดบัญชีทั้งหมด')}
        onClose={() => setRetrySuccessOpen(false)}
        actions={[{ label: t('กลับสู่หน้าหลัก'), variant: 'primary', onClick: () => setRetrySuccessOpen(false) }]}
      />

      {historyOpen && (
        <div className="modal-backdrop" onClick={() => setHistoryOpen(false)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('ประวัติการดำเนินการ')}</h3>
              <button className="modal-close" onClick={() => setHistoryOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="ft-table-wrapper">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>{t('วันที่')}</th>
                    <th>{t('การดำเนินการ')}</th>
                    <th>{t('นำเข้าโดย')}</th>
                    <th>{t('เหตุผล')}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.date}</td>
                      <td>{row.action}</td>
                      <td>{row.actionBy}</td>
                      <td>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="ft-btn-primary" onClick={() => setHistoryOpen(false)}>
                {t('ปิดหน้าต่างนี้')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
