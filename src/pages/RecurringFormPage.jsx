import { useEffect, useMemo, useRef, useState } from 'react';
import {
  RECURRING_COMPANY,
  DEPT_OPTIONS,
  DOC_TYPE_OPTIONS,
  DOC_NO_OPTIONS,
  WRITEOFF_CATEGORY_OPTIONS,
  UL_DEPT_OPTIONS,
  GL_ACCOUNT_CODE_OPTIONS,
  ACCOUNT_OPTIONS,
  CV_OPTIONS,
  START_PERIOD_OPTIONS,
} from '../data';
import { useApp } from '../context/AppContext';
import Combobox from '../components/Combobox';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { buildRecurringSchedule, recurringPerPeriodAmount } from '../utils';
import {
  ChevronBreadcrumbIcon,
  CheckCircleSolidIcon,
  CloseIcon,
  DeleteIcon,
  ErrorCircleSolidIcon,
  FileDocIcon,
  PlusIcon,
  PreviewFileIcon,
  RetryIcon,
  ViewIcon,
} from '../icons';

const PAYMENT_FREQUENCY_OPTIONS = ['รายเดือน', 'รายไตรมาส', 'รายปี'];
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_UPLOAD_EXTENSIONS = ['pdf', 'xlsx', 'png', 'jpg', 'jpeg'];
const UPLOAD_FAIL_RATE = 0.1;
const UPLOAD_SETTLE_MS = 3000;
const ACCOUNT_LINES_PAGE_SIZE = 10;
const MIN_ACCOUNT_LINES = 2;

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitizeNumericInput(raw) {
  let cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

let lineIdCounter = 0;
function newLine({ accountCode = '', locked = null } = {}) {
  lineIdCounter += 1;
  return {
    id: `rec-line-${Date.now()}-${lineIdCounter}`,
    dept: '',
    accountCode,
    glAccountCode: '',
    cvCode: '',
    debitAmount: 0,
    creditAmount: 0,
    locked,
  };
}

let uploadIdCounter = 0;
function nextUploadId() {
  uploadIdCounter += 1;
  return `rec-upload-${Date.now()}-${uploadIdCounter}`;
}

// เมื่อแก้ไขฉบับร่าง แปลง debitLines/creditLines ของ entry กลับเป็นแถวรวม (lines) —
// แถวแรกของแต่ละฝั่งถือว่าเป็นแถวที่ระบบล็อกยอดให้ ส่วนที่เหลือเป็นแถวที่ผู้ใช้เพิ่มเอง
function linesFromEntry(entry) {
  const debit = entry?.debitLines ?? [];
  const credit = entry?.creditLines ?? [];
  if (debit.length === 0 && credit.length === 0) {
    return [
      newLine({ accountCode: GL_ACCOUNT_CODE_OPTIONS[0], locked: 'debit' }),
      newLine({ accountCode: GL_ACCOUNT_CODE_OPTIONS[1], locked: 'credit' }),
    ];
  }
  const rows = [];
  debit.forEach((l, i) => {
    lineIdCounter += 1;
    rows.push({
      id: l.id ?? `rec-line-${Date.now()}-${lineIdCounter}`,
      dept: l.dept,
      accountCode: l.accountCode,
      glAccountCode: l.glAccountCode ?? '',
      cvCode: l.cvCode,
      debitAmount: l.amount,
      creditAmount: 0,
      locked: i === 0 ? 'debit' : null,
    });
  });
  credit.forEach((l, i) => {
    lineIdCounter += 1;
    rows.push({
      id: l.id ?? `rec-line-${Date.now()}-${lineIdCounter}`,
      dept: l.dept,
      accountCode: l.accountCode,
      glAccountCode: l.glAccountCode ?? '',
      cvCode: l.cvCode,
      debitAmount: 0,
      creditAmount: l.amount,
      locked: i === 0 ? 'credit' : null,
    });
  });
  return rows;
}

export default function RecurringFormPage({
  existing,
  initial,
  duplicateFrom,
  onCancel,
  onSave,
  onSaveDraft,
  onViewSource,
}) {
  const { t, tv } = useApp();
  const fileInputRef = useRef(null);
  const uploadTimersRef = useRef({});

  // แก้ไขรายการที่มีอยู่ (initial) ใช้ข้อมูลของ initial เสมอ ส่วนคัดลอกรายการ (duplicateFrom)
  // ใช้เป็นค่าเริ่มต้นให้ฟอร์มสร้างใหม่เท่านั้น ไม่ผูก id/code ของรายการต้นฉบับ
  const seed = initial ?? duplicateFrom;
  const isEditingInProgress = !!initial && initial.status !== 'ฉบับร่าง';

  const [dept, setDept] = useState(seed?.dept ?? '');
  const [docType, setDocType] = useState(seed?.docType ?? '');
  const [docNo, setDocNo] = useState(seed?.docNo ?? '');
  const [category, setCategory] = useState(seed?.category ?? WRITEOFF_CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState(seed?.description ?? '');
  const [totalAmount, setTotalAmount] = useState(seed?.totalAmount > 0 ? formatMoney(seed.totalAmount) : '');
  const [installments, setInstallments] = useState(seed?.installments > 0 ? String(seed.installments) : '');
  const [startPeriod, setStartPeriod] = useState(seed?.startPeriod ?? '');
  const [paymentFrequency, setPaymentFrequency] = useState(seed?.paymentFrequency ?? PAYMENT_FREQUENCY_OPTIONS[0]);
  const [files, setFiles] = useState(
    () => initial?.files?.map((name) => ({
      id: nextUploadId(),
      name,
      sizeLabel: '1.2 MB',
      status: 'success',
      progress: 100,
      settled: true,
    })) ?? [],
  );
  const [lines, setLines] = useState(() => linesFromEntry(seed));
  const [dirty, setDirty] = useState(false);
  const [linesPage, setLinesPage] = useState(1);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmSaveDraftOpen, setConfirmSaveDraftOpen] = useState(false);
  const [saveDraftSuccessOpen, setSaveDraftSuccessOpen] = useState(false);

  const subDept = dept ? '00 - สำนักงานใหญ่' : '';

  const totalNum = parseFloat(totalAmount.replace(/,/g, '')) || 0;
  const installmentsNum = parseInt(installments, 10) || 0;

  const schedule = useMemo(
    () => buildRecurringSchedule(totalNum, installmentsNum, startPeriod),
    [totalNum, installmentsNum, startPeriod],
  );

  const perPeriodAmount = recurringPerPeriodAmount(totalNum, installmentsNum);

  // แถวที่ระบบสร้างอัตโนมัติ (locked) ล็อกยอดตามยอดตัดบัญชีต่อเดือน (งวดที่ 2 เป็นต้นไป) เสมอ
  // ส่วนแถวที่ผู้ใช้กดเพิ่มเองกรอกยอดเดบิต/เครดิตได้อิสระ
  useEffect(() => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.locked === 'debit') return { ...l, debitAmount: perPeriodAmount };
        if (l.locked === 'credit') return { ...l, creditAmount: perPeriodAmount };
        return l;
      }),
    );
  }, [perPeriodAmount]);

  const debitTotal = lines.reduce((sum, l) => sum + l.debitAmount, 0);
  const creditTotal = lines.reduce((sum, l) => sum + l.creditAmount, 0);
  const totalsMatch = debitTotal === creditTotal;

  const linesValid =
    lines.length > 0 &&
    lines.every(
      (l) => l.dept && l.accountCode && l.glAccountCode && l.cvCode && (l.debitAmount > 0 || l.creditAmount > 0),
    );

  const linesTotalPages = Math.max(1, Math.ceil(lines.length / ACCOUNT_LINES_PAGE_SIZE));
  const linesPageClamped = Math.min(linesPage, linesTotalPages);
  const pageLines = lines.slice(
    (linesPageClamped - 1) * ACCOUNT_LINES_PAGE_SIZE,
    linesPageClamped * ACCOUNT_LINES_PAGE_SIZE,
  );

  // ต้องกรอก "ข้อมูลการตัดบัญชี" ให้ครบก่อน ถึงจะแสดง "ข้อมูลบัญชี" และ "รายละเอียดการตัดบัญชีรายงวด"
  const accountInfoValid =
    !!dept &&
    !!docType &&
    !!docNo &&
    !!category &&
    description.trim().length > 0 &&
    totalNum > 0 &&
    !!paymentFrequency &&
    installmentsNum > 0 &&
    !!startPeriod;

  const hasUploadingFiles = files.some((f) => f.status === 'uploading');
  const formValid = accountInfoValid && linesValid && totalsMatch;

  useEffect(() => {
    return () => {
      Object.values(uploadTimersRef.current).forEach((t) => {
        clearInterval(t.interval);
        clearTimeout(t.timeout);
      });
    };
  }, []);

  function markDirty() {
    setDirty(true);
  }

  function clearUploadTimers(id) {
    const timers = uploadTimersRef.current[id];
    if (!timers) return;
    clearInterval(timers.interval);
    clearTimeout(timers.timeout);
    delete uploadTimersRef.current[id];
  }

  function runUpload(id) {
    const durationMs = 1200 + Math.random() * 800;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
      const secondsLeft = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress, secondsLeft } : f)));
      if (progress >= 100) {
        clearInterval(interval);
        const failed = Math.random() < UPLOAD_FAIL_RATE;
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: failed ? 'error' : 'success' } : f)));
        if (failed) {
          clearUploadTimers(id);
        } else {
          const timeout = setTimeout(() => {
            setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, settled: true } : f)));
            clearUploadTimers(id);
          }, UPLOAD_SETTLE_MS);
          uploadTimersRef.current[id] = { ...uploadTimersRef.current[id], timeout };
        }
      }
    }, 100);
    uploadTimersRef.current[id] = { interval };
  }

  function handleFilesSelected(list) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list).map((file) => {
      const id = nextUploadId();
      const sizeLabel = formatFileSize(file.size);
      const ext = fileExtension(file.name);
      if (!ACCEPTED_UPLOAD_EXTENSIONS.includes(ext)) {
        return { id, name: file.name, sizeLabel, status: 'error-format', progress: 100 };
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return { id, name: file.name, sizeLabel, status: 'error-size', progress: 100 };
      }
      return { id, name: file.name, sizeLabel, status: 'uploading', progress: 0, secondsLeft: 2 };
    });
    setFiles((prev) => [...prev, ...incoming]);
    incoming.forEach((f) => {
      if (f.status === 'uploading') runUpload(f.id);
    });
    markDirty();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cancelUpload(id) {
    clearUploadTimers(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function retryUpload(id) {
    clearUploadTimers(id);
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 0, secondsLeft: 2 } : f)));
    runUpload(id);
  }

  function removeFile(id) {
    clearUploadTimers(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function updateLine(id, patch) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    markDirty();
  }

  function addLine() {
    setLines((prev) => {
      const next = [...prev, newLine({})];
      setLinesPage(Math.ceil(next.length / ACCOUNT_LINES_PAGE_SIZE));
      return next;
    });
    markDirty();
  }

  function removeLine(id) {
    setLines((prev) => prev.filter((l) => l.id !== id));
    markDirty();
  }

  function buildEntry(status) {
    const maxCode = existing.reduce((max, e) => {
      const n = parseInt(e.code.split('-').pop() ?? '0', 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return {
      id: initial?.id ?? `rec-${Date.now()}`,
      code: initial?.code ?? `RCE-26062526-${String(maxCode + 1).padStart(4, '0')}`,
      company: RECURRING_COMPANY,
      dept,
      subDept,
      docType,
      docNo,
      category,
      description: description.trim(),
      totalAmount: totalNum,
      paymentFrequency,
      installments: installmentsNum,
      installmentsPaid: initial?.installmentsPaid ?? 0,
      startPeriod,
      startDate: startPeriod ? `25/${startPeriod}` : '',
      createdBy: initial?.createdBy ?? 'สิริศักดิ์ หงษ์พัตรา',
      createdAt: initial?.createdAt ?? new Date().toLocaleDateString('en-GB'),
      status,
      debitLines: lines
        .filter((l) => l.debitAmount > 0)
        .map((l) => ({
          id: l.id,
          dept: l.dept,
          accountCode: l.accountCode,
          glAccountCode: l.glAccountCode,
          cvCode: l.cvCode,
          amount: l.debitAmount,
        })),
      creditLines: lines
        .filter((l) => l.creditAmount > 0)
        .map((l) => ({
          id: l.id,
          dept: l.dept,
          accountCode: l.accountCode,
          glAccountCode: l.glAccountCode,
          cvCode: l.cvCode,
          amount: l.creditAmount,
        })),
      files: files.filter((f) => f.status === 'success').map((f) => f.name),
    };
  }

  function handleConfirmSubmit() {
    setConfirmSubmitOpen(false);
    onSave(buildEntry('ระหว่างดำเนินการ'));
    setSuccessOpen(true);
  }

  function handleConfirmSaveDraft() {
    setConfirmSaveDraftOpen(false);
    onSaveDraft(buildEntry('ฉบับร่าง'));
    setSaveDraftSuccessOpen(true);
  }

  function handleSaveDraftSuccessClose() {
    setSaveDraftSuccessOpen(false);
    onCancel();
  }

  function handleSuccessClose() {
    setSuccessOpen(false);
    onCancel();
  }

  function handleBreadcrumbClick() {
    if (dirty) setLeaveWarningOpen(true);
    else onCancel();
  }

  function renderAccountAmountInput(line, field, updateOnChange, error) {
    return (
      <div className={`aft-input-group${error ? ' aft-input-group--error' : ''}`}>
        <input
          type="text"
          inputMode="decimal"
          className="aft-input-amount"
          style={{ textAlign: 'right' }}
          value={line[field] || ''}
          placeholder="0.00"
          onChange={(e) => updateOnChange(parseFloat(sanitizeNumericInput(e.target.value)) || 0)}
        />
        <span className="aft-input-unit">THB</span>
      </div>
    );
  }

  function renderAccountTable() {
    return (
      <>
        <div className="rec-line-table-wrapper">
          <table className="rec-line-table rec-account-table" style={{ minWidth: '1272px' }}>
          <colgroup>
            <col style={{ width: '56px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '56px' }} />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>
                {t('ฝ่าย (UL)')} <span className="aft-required">*</span>
              </th>
              <th>
                {t('เดบิต/เครดิต')} <span className="aft-required">*</span>
              </th>
              <th>
                {t('รหัสบัญชี')} <span className="aft-required">*</span>
              </th>
              <th>
                {t('รหัส CV')} <span className="aft-required">*</span>
              </th>
              <th className="rec-col-amount rec-form-sticky-3">
                {t('เดบิต (THB)')} <span className="aft-required">*</span>
              </th>
              <th className="rec-col-amount rec-form-sticky-2">
                {t('เครดิต (THB)')} <span className="aft-required">*</span>
              </th>
              <th className="rec-form-sticky-1"></th>
            </tr>
          </thead>
          <tbody>
            {pageLines.map((line, i) => (
              <tr key={line.id}>
                <td>{(linesPageClamped - 1) * ACCOUNT_LINES_PAGE_SIZE + i + 1}</td>
                <td>
                  <Combobox
                    value={line.dept}
                    onChange={(v) => updateLine(line.id, { dept: v })}
                    options={UL_DEPT_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
                    placeholder={t('กรุณาเลือก')}
                  />
                </td>
                <td>
                  <Combobox
                    value={line.accountCode}
                    onChange={(v) => {
                      const patch = { accountCode: v };
                      if (v === GL_ACCOUNT_CODE_OPTIONS[0]) patch.creditAmount = 0;
                      else if (v === GL_ACCOUNT_CODE_OPTIONS[1]) patch.debitAmount = 0;
                      updateLine(line.id, patch);
                    }}
                    options={GL_ACCOUNT_CODE_OPTIONS.map((a) => ({ value: a, label: t(a) }))}
                    placeholder={t('กรุณาเลือก')}
                  />
                </td>
                <td>
                  <Combobox
                    value={line.glAccountCode}
                    onChange={(v) => updateLine(line.id, { glAccountCode: v })}
                    options={ACCOUNT_OPTIONS.map((a) => ({ value: a, label: t(a) }))}
                    placeholder={t('กรุณาเลือก')}
                    searchable
                  />
                </td>
                <td>
                  <Combobox
                    value={line.cvCode}
                    onChange={(v) => updateLine(line.id, { cvCode: v })}
                    options={CV_OPTIONS.map((c) => ({ value: c, label: t(c) }))}
                    placeholder={t('กรุณาเลือก')}
                    searchable
                  />
                </td>
                <td className="rec-col-amount rec-form-sticky-3">
                  {line.locked === 'debit' ? (
                    <span className={`rec-account-amount-box${!totalsMatch ? ' rec-account-amount-box--error' : ''}`}>
                      {formatMoney(line.debitAmount)} THB
                    </span>
                  ) : line.locked === 'credit' || line.accountCode === GL_ACCOUNT_CODE_OPTIONS[1] ? (
                    <span className="rec-account-amount-box rec-account-amount-box--disabled">0.00 THB</span>
                  ) : (
                    renderAccountAmountInput(
                      line,
                      'debitAmount',
                      (v) => updateLine(line.id, { debitAmount: v }),
                      !totalsMatch,
                    )
                  )}
                </td>
                <td className="rec-col-amount rec-form-sticky-2">
                  {line.locked === 'credit' ? (
                    <span className={`rec-account-amount-box${!totalsMatch ? ' rec-account-amount-box--error' : ''}`}>
                      {formatMoney(line.creditAmount)} THB
                    </span>
                  ) : line.locked === 'debit' || line.accountCode === GL_ACCOUNT_CODE_OPTIONS[0] ? (
                    <span className="rec-account-amount-box rec-account-amount-box--disabled">0.00 THB</span>
                  ) : (
                    renderAccountAmountInput(
                      line,
                      'creditAmount',
                      (v) => updateLine(line.id, { creditAmount: v }),
                      !totalsMatch,
                    )
                  )}
                </td>
                <td className="rec-form-sticky-1">
                  <button
                    type="button"
                    className="ft-action-btn"
                    title={t('ลบ')}
                    disabled={lines.length <= MIN_ACCOUNT_LINES}
                    onClick={() => removeLine(line.id)}
                  >
                    <DeleteIcon color="var(--color-text-lighter)" size={24} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="rec-total-row">
              <td colSpan={4} className="rec-total-label">
                {t('ยอดรวม')}
              </td>
              <td className="rec-col-amount rec-total-amount rec-form-sticky-3">{formatMoney(debitTotal)} THB</td>
              <td className="rec-col-amount rec-total-amount rec-form-sticky-2">{formatMoney(creditTotal)} THB</td>
              <td className="rec-form-sticky-1"></td>
            </tr>
          </tbody>
          </table>
        </div>
        {lines.length > ACCOUNT_LINES_PAGE_SIZE && (
          <Pagination
            page={linesPageClamped}
            totalPages={linesTotalPages}
            totalItems={lines.length}
            pageSize={ACCOUNT_LINES_PAGE_SIZE}
            onPageChange={setLinesPage}
          />
        )}
      </>
    );
  }

  function renderUploadCard(file) {
    if (file.status === 'success' && file.settled) {
      return (
        <div className="recd-file-card" key={file.id}>
          <FileDocIcon />
          <div className="recd-file-info">
            <span className="recd-file-name">{file.name}</span>
            <span className="recd-file-size">{file.sizeLabel}</span>
          </div>
          <div className="recd-file-actions">
            <button
              type="button"
              className="recd-file-action-btn recd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="var(--color-error-default)" size={16} />
            </button>
            <button type="button" className="recd-file-action-btn recd-file-action-btn--outline" title={t('ดูตัวอย่าง')}>
              <PreviewFileIcon />
            </button>
          </div>
        </div>
      );
    }

    const isUploading = file.status === 'uploading';
    const isSuccess = file.status === 'success';
    const isFormatError = file.status === 'error-format';
    const isSizeError = file.status === 'error-size';
    const isGenericError = file.status === 'error';
    const isError = isFormatError || isSizeError || isGenericError;

    return (
      <div className="rec-upload-card" key={file.id}>
        <FileDocIcon color={isSuccess ? 'var(--color-primary-default)' : 'var(--color-primary-container)'} />
        <div className="rec-upload-info">
          <div className="rec-upload-name-row">
            <span className="rec-upload-name">{file.name}</span>
            {isSuccess && <CheckCircleSolidIcon />}
            {isError && <ErrorCircleSolidIcon />}
          </div>
          <div className={`rec-upload-track${isError ? ' rec-upload-track--error' : ''}`}>
            <div
              className={`rec-upload-fill${isSuccess ? ' rec-upload-fill--success' : isError ? ' rec-upload-fill--error' : ''}`}
              style={{ width: `${file.progress}%` }}
            />
          </div>
          <div className="rec-upload-status-row">
            <span className="rec-upload-status-time">
              {isUploading && tv('{n} วินาที', { n: file.secondsLeft })}
              {isSizeError && file.sizeLabel}
            </span>
            <span
              className={`rec-upload-status-text rec-upload-status-text--${
                isUploading ? 'uploading' : isSuccess ? 'success' : 'error'
              }`}
            >
              {isUploading && t('กำลังอัปโหลด…')}
              {isSuccess && t('สำเร็จ')}
              {isGenericError && t('อัปโหลดไม่สำเร็จ')}
              {isSizeError && t('ขนาดไฟล์เกินกำหนด')}
              {isFormatError && t('รูปแบบไฟล์ไม่ถูกต้อง')}
            </span>
          </div>
        </div>
        <div className="recd-file-actions">
          {isUploading && (
            <button
              type="button"
              className="recd-file-action-btn recd-file-action-btn--danger"
              title={t('ยกเลิก')}
              onClick={() => cancelUpload(file.id)}
            >
              <CloseIcon size={16} color="var(--color-error-default)" />
            </button>
          )}
          {isSuccess && (
            <button
              type="button"
              className="recd-file-action-btn recd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="var(--color-error-default)" size={16} />
            </button>
          )}
          {isGenericError && (
            <button
              type="button"
              className="recd-file-action-btn recd-file-action-btn--neutral"
              title={t('ลองใหม่')}
              onClick={() => retryUpload(file.id)}
            >
              <RetryIcon />
            </button>
          )}
          {(isSizeError || isFormatError) && (
            <button
              type="button"
              className="recd-file-action-btn recd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="var(--color-error-default)" size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="aft-page-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={handleBreadcrumbClick}>
            {t('จัดการรายการบัญชีประจำ')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">
            {t(isEditingInProgress ? 'แก้ไขรายการบัญชีประจำ' : initial ? 'แก้ไขฉบับร่าง' : 'สร้างรายการบัญชีประจำ')}
          </span>
        </div>
        <h1 className="aft-page-title">
          {t(isEditingInProgress ? 'แก้ไขรายการบัญชีประจำ' : initial ? 'แก้ไขฉบับร่าง' : 'สร้างรายการบัญชีประจำ')}
        </h1>
      </div>

      <div className="aft-card">
        <div className="aft-section-title">{t('ข้อมูลบัญชีประจำ')}</div>

        <div className="aft-form-row rec-form-row-3">
          <div className="aft-form-field">
            <label className="aft-form-label">{t('บริษัท')}</label>
            <div className="aft-input-group">
              <input
                type="text"
                className="aft-input-amount"
                style={{ textAlign: 'left' }}
                value={t(RECURRING_COMPANY)}
                disabled
              />
            </div>
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('หน่วยงานหลัก')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={dept}
              onChange={(v) => {
                setDept(v);
                markDirty();
              }}
              options={DEPT_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
              placeholder={t('กรุณาเลือก')}
              searchable
            />
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('หน่วยงานย่อย')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={subDept}
              onChange={() => {}}
              options={subDept ? [{ value: subDept, label: t(subDept) }] : []}
              placeholder={t('กรุณาเลือก')}
              disabled={!dept}
            />
          </div>
        </div>

        <div className="aft-form-row rec-form-row-3">
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('ประเภทเอกสารอ้างอิง')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={docType}
              onChange={(v) => {
                setDocType(v);
                markDirty();
              }}
              options={DOC_TYPE_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
              placeholder={t('กรุณาเลือก')}
            />
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('เลขที่เอกสารอ้างอิง')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={docNo}
              onChange={(v) => {
                setDocNo(v);
                markDirty();
              }}
              options={DOC_NO_OPTIONS.map((d) => ({ value: d, label: d }))}
              placeholder={t('กรุณาเลือก')}
              disabled={!docType}
              searchable
            />
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('ประเภท')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={category}
              onChange={(v) => {
                setCategory(v);
                markDirty();
              }}
              options={WRITEOFF_CATEGORY_OPTIONS.map((c) => ({ value: c, label: t(c) }))}
            />
          </div>
        </div>

        <div className="aft-form-row">
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('รายละเอียด')} <span className="aft-required">*</span>
            </label>
            <textarea
              className="modal-input"
              rows={3}
              value={description}
              maxLength={100}
              placeholder={t('กรุณากรอก')}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
            />
            <span className="rec-char-count">{description.length}/100</span>
          </div>
        </div>

        <div className="aft-form-row rec-form-row-3">
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('ยอดเงินรวมทั้งสัญญา')} <span className="aft-required">*</span>
            </label>
            <div className="aft-input-group">
              <input
                type="text"
                inputMode="decimal"
                className="aft-input-amount"
                style={{ textAlign: 'right' }}
                value={totalAmount}
                placeholder="0.00"
                onChange={(e) => {
                  setTotalAmount(sanitizeNumericInput(e.target.value));
                  markDirty();
                }}
                onBlur={() => {
                  if (totalNum > 0) setTotalAmount(formatMoney(totalNum));
                }}
                onFocus={() => setTotalAmount(totalNum > 0 ? String(totalNum) : '')}
              />
              <span className="aft-input-unit">THB</span>
            </div>
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('ลักษณะการจ่าย')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={paymentFrequency}
              onChange={(v) => {
                setPaymentFrequency(v);
                markDirty();
              }}
              options={PAYMENT_FREQUENCY_OPTIONS.map((f) => ({ value: f, label: t(f) }))}
              placeholder={t('กรุณาเลือก')}
            />
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('จำนวนงวด')} <span className="aft-required">*</span>
            </label>
            <div className="aft-input-group">
              <input
                type="text"
                inputMode="numeric"
                className="aft-input-amount"
                style={{ textAlign: 'left' }}
                value={installments}
                placeholder={t('กรุณากรอก')}
                onChange={(e) => {
                  setInstallments(e.target.value.replace(/[^0-9]/g, ''));
                  markDirty();
                }}
              />
              <span className="aft-input-unit">{t('งวด')}</span>
            </div>
          </div>
          <div className="aft-form-field">
            <label className="aft-form-label">
              {t('เริ่มตัดบัญชีงวดแรก')} <span className="aft-required">*</span>
            </label>
            <Combobox
              value={startPeriod}
              onChange={(v) => {
                setStartPeriod(v);
                markDirty();
              }}
              options={START_PERIOD_OPTIONS.map((p) => ({ value: p, label: p }))}
              placeholder={t('กรุณาเลือก')}
            />
          </div>
        </div>

        <div className="rec-hint">{t('หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}</div>

        {duplicateFrom && (
          <>
            <div className="aft-divider" />
            <div className="aft-section-title">{t('ข้อมูลเอกสารอ้างอิง')}</div>
            <div className="aft-form-row">
              <div className="aft-form-field">
                <label className="aft-form-label">{t('รหัสรายการต้นฉบับ')}</label>
                <button
                  type="button"
                  className="aft-breadcrumb-link rec-source-ref-link"
                  onClick={() => onViewSource?.(duplicateFrom.id)}
                >
                  {duplicateFrom.code}
                  <ViewIcon />
                </button>
              </div>
            </div>
          </>
        )}

        <div className="aft-divider" />

        <div className="aft-section-title">{t('ไฟล์แนบ')}</div>
        <div className="rec-file-row">
          <button className="rec-file-btn" onClick={() => fileInputRef.current?.click()}>
            {t('เลือกไฟล์')}
          </button>
          {files.length === 0 && <span className="rec-file-empty">{t('ยังไม่ได้เลือกไฟล์')}</span>}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>
        <div className="rec-file-hint">PDF, XLSX, PNG, JPG (MAX. 25MB)</div>
        {files.length > 0 && (
          <>
            <div className="recd-file-header">
              <span className="recd-file-header-text">
                {t('ไฟล์เอกสารแนบ')} <span className="recd-file-count">{files.length}</span> {t('รายการ')}
              </span>
              <span className="recd-file-header-divider" />
            </div>
            <div className="recd-file-list">{files.map((f) => renderUploadCard(f))}</div>
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
              <button type="button" className="ft-btn-outline rec-add-line-btn" onClick={addLine}>
                <PlusIcon color="var(--color-primary-default)" />
                {t('เพิ่ม')}
              </button>
            </div>
            {renderAccountTable()}

            <div className="rec-section-header">
              <div>
                <div className="aft-section-title" style={{ marginBottom: 0 }}>
                  {t('รายละเอียดบัญชีประจำรายงวด')}
                </div>
                <div className="rec-section-subtitle">
                  {t('ระบบคำนวณยอดตัดบัญชีอัตโนมัติ')}{' '}
                  <span className="rec-subtitle-highlight">
                    {installmentsNum} {t('งวด')}
                  </span>{' '}
                  {t('หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}
                </div>
              </div>
            </div>

            <div className="rec-line-table-wrapper">
              <table className="rec-line-table rec-schedule-table" style={{ minWidth: '640px' }}>
                <colgroup>
                  <col style={{ width: '160px' }} />
                  <col />
                  <col style={{ width: '240px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('งวดที่')}</th>
                    <th>{t('เดือน')}</th>
                    <th className="rec-col-amount">{t('จำนวนเงินต่องวด (THB)')}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.seq}>
                      <td>
                        {row.seq}/{schedule.length}
                      </td>
                      <td>{row.date}</td>
                      <td className="rec-col-amount">
                        {row.seq === 1 && row.amount !== perPeriodAmount && (
                          <div className="rec-schedule-diff-note">
                            {tv('ยอดส่วนต่าง {diff} THB จะถูกนำไปบันทึกใน {dept}', {
                              diff: (row.amount - perPeriodAmount).toFixed(2),
                              dept: dept ? t(dept) : '-',
                            })}
                          </div>
                        )}
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="rec-total-row">
                    <td className="rec-total-label" colSpan={2}>
                      {t('ยอดรวม')}
                    </td>
                    <td className="rec-col-amount rec-total-amount">{formatMoney(totalNum)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="aft-actions">
          <button className="ft-btn-outline" onClick={() => setConfirmCancelOpen(true)}>
            {t('ยกเลิก')}
          </button>
          {!isEditingInProgress && (
            <button className="ft-btn-outline" onClick={() => setConfirmSaveDraftOpen(true)}>
              {t('บันทึกร่าง')}
            </button>
          )}
          <button
            className="aft-btn-add"
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={!formValid || hasUploadingFiles}
          >
            {t(isEditingInProgress ? 'บันทึก' : 'สร้าง')}
          </button>
        </div>
      </div>

      <Dialog
        open={confirmCancelOpen}
        variant="cancel"
        title={t('คุณต้องการยกเลิกการสร้างรายการตัดบัญชีใช่ไหม?')}
        message={t('หากยกเลิกการสร้างรายการตัดบัญชี ข้อมูลที่กรอกจะไม่ถูกบันทึกในระบบ')}
        onClose={() => setConfirmCancelOpen(false)}
        actions={[
          { label: t('ย้อนกลับ'), variant: 'outline', onClick: () => setConfirmCancelOpen(false) },
          {
            label: t('ยกเลิกการสร้าง'),
            variant: 'primary',
            onClick: () => {
              setConfirmCancelOpen(false);
              onCancel();
            },
          },
        ]}
      />

      <Dialog
        open={leaveWarningOpen}
        variant="warning"
        title={t('คุณต้องการออกจากหน้านี้ใช่ไหม?')}
        message={t('หากออกจากหน้านี้ ข้อมูลที่กรอกจะไม่ถูกบันทึกในระบบ')}
        onClose={() => setLeaveWarningOpen(false)}
        actions={[
          {
            label: t('ออกจากหน้านี้'),
            variant: 'outline',
            onClick: () => {
              setLeaveWarningOpen(false);
              onCancel();
            },
          },
          { label: t('อยู่หน้านี้ต่อ'), variant: 'primary', onClick: () => setLeaveWarningOpen(false) },
        ]}
      />

      <Dialog
        open={confirmSubmitOpen}
        variant="add"
        title={t(
          isEditingInProgress
            ? 'คุณต้องการบันทึกการแก้ไขรายการบัญชีประจำใช่ไหม?'
            : 'คุณต้องการสร้างรายการตัดบัญชีใช่ไหม?',
        )}
        message={t(
          isEditingInProgress
            ? 'กรุณาตรวจสอบข้อมูลรายการบัญชีประจำให้ถูกต้องก่อนบันทึก'
            : 'กรุณาตรวจสอบความถูกต้องก่อนสร้างรายการตัดบัญชี',
        )}
        onClose={() => setConfirmSubmitOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setConfirmSubmitOpen(false) },
          { label: t(isEditingInProgress ? 'บันทึก' : 'สร้าง'), variant: 'primary', onClick: handleConfirmSubmit },
        ]}
      />

      <Dialog
        open={successOpen}
        variant="success"
        title={t(isEditingInProgress ? 'แก้ไขรายการบัญชีประจำสำเร็จ!' : 'สร้างรายการตัดบัญชีสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleSuccessClose}
      />

      <Dialog
        open={confirmSaveDraftOpen}
        variant="save"
        title={t('คุณต้องการบันทึกร่างรายการบัญชีประจำใช่ไหม?')}
        message={t('ระบบจะบันทึกข้อมูลที่กรอกไว้เป็นร่าง และคุณสามารถแก้ไขได้ภายหลัง')}
        onClose={() => setConfirmSaveDraftOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setConfirmSaveDraftOpen(false) },
          { label: t('บันทึกร่าง'), variant: 'primary', onClick: handleConfirmSaveDraft },
        ]}
      />

      <Dialog
        open={saveDraftSuccessOpen}
        variant="success"
        title={t('บันทึกร่างรายการบัญชีประจำสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleSaveDraftSuccessClose}
      />
    </>
  );
}
