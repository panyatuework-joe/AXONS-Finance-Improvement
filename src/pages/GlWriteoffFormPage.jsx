import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GL_WRITEOFF_COMPANY,
  DEPT_OPTIONS,
  DOC_TYPE_OPTIONS,
  DOC_NO_OPTIONS,
  WRITEOFF_CATEGORY_OPTIONS,
  UL_DEPT_OPTIONS,
  GL_ACCOUNT_CODE_OPTIONS,
  CV_OPTIONS,
  START_PERIOD_OPTIONS,
} from '../data';
import { useApp } from '../context/AppContext';
import Combobox from '../components/Combobox';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import { buildGlWriteoffSchedule, formatWholeAmount, glWriteoffPerPeriodAmount } from '../utils';
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
} from '../icons';

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_UPLOAD_EXTENSIONS = ['pdf', 'xlsx', 'png', 'jpg', 'jpeg'];
const UPLOAD_FAIL_RATE = 0.1;
const UPLOAD_SETTLE_MS = 3000;

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
function newLine(accountCode) {
  lineIdCounter += 1;
  return { id: `glw-line-${Date.now()}-${lineIdCounter}`, dept: '', accountCode, cvCode: '', amount: 0 };
}

let uploadIdCounter = 0;
function nextUploadId() {
  uploadIdCounter += 1;
  return `glw-upload-${Date.now()}-${uploadIdCounter}`;
}

export default function GlWriteoffFormPage({ existing, onCancel, onSave }) {
  const { t, tv } = useApp();
  const fileInputRef = useRef(null);
  const uploadTimersRef = useRef({});

  const [dept, setDept] = useState('');
  const [docType, setDocType] = useState('');
  const [docNo, setDocNo] = useState('');
  const [category, setCategory] = useState(WRITEOFF_CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [files, setFiles] = useState([]);
  const [debitLines, setDebitLines] = useState([newLine(GL_ACCOUNT_CODE_OPTIONS[0])]);
  const [creditLines, setCreditLines] = useState([newLine(GL_ACCOUNT_CODE_OPTIONS[1])]);
  const [dirty, setDirty] = useState(false);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const subDept = dept ? '00 - สำนักงานใหญ่' : '';

  const totalNum = parseFloat(totalAmount.replace(/,/g, '')) || 0;
  const installmentsNum = parseInt(installments, 10) || 0;

  const schedule = useMemo(
    () => buildGlWriteoffSchedule(totalNum, installmentsNum, startPeriod),
    [totalNum, installmentsNum, startPeriod],
  );

  const perPeriodAmount = glWriteoffPerPeriodAmount(totalNum, installmentsNum);

  // ยอดบัญชีเดบิต/เครดิตล็อกตามยอดตัดบัญชีต่อเดือน (งวดที่ 2 เป็นต้นไป) เสมอ
  useEffect(() => {
    setDebitLines((prev) => prev.map((l) => ({ ...l, amount: perPeriodAmount })));
    setCreditLines((prev) => prev.map((l) => ({ ...l, amount: perPeriodAmount })));
  }, [perPeriodAmount]);

  const debitTotal = debitLines.reduce((sum, l) => sum + l.amount, 0);
  const creditTotal = creditLines.reduce((sum, l) => sum + l.amount, 0);

  const linesValid = (lines) =>
    lines.length > 0 && lines.every((l) => l.dept && l.accountCode && l.cvCode && l.amount > 0);

  // ต้องกรอก "ข้อมูลการตัดบัญชี" ให้ครบก่อน ถึงจะแสดง "ข้อมูลบัญชี" และ "รายละเอียดการตัดบัญชีรายงวด"
  const accountInfoValid =
    !!dept &&
    !!docType &&
    !!docNo &&
    !!category &&
    description.trim().length > 0 &&
    totalNum > 0 &&
    installmentsNum > 0 &&
    !!startPeriod;

  const hasUploadingFiles = files.some((f) => f.status === 'uploading');
  const formValid = accountInfoValid && linesValid(debitLines) && linesValid(creditLines);

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

  function updateLine(kind, id, patch) {
    const update = (lines) => lines.map((l) => (l.id === id ? { ...l, ...patch } : l));
    if (kind === 'debit') setDebitLines(update);
    else setCreditLines(update);
    markDirty();
  }

  function addLinePair() {
    setDebitLines((prev) => [...prev, { ...newLine(GL_ACCOUNT_CODE_OPTIONS[0]), amount: perPeriodAmount }]);
    setCreditLines((prev) => [...prev, { ...newLine(GL_ACCOUNT_CODE_OPTIONS[1]), amount: perPeriodAmount }]);
    markDirty();
  }

  function buildEntry() {
    const maxCode = existing.reduce((max, e) => {
      const n = parseInt(e.code.split('-').pop() ?? '0', 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return {
      id: `glw-${Date.now()}`,
      code: `RCE-26062526-${String(maxCode + 1).padStart(4, '0')}`,
      company: GL_WRITEOFF_COMPANY,
      dept,
      subDept,
      docType,
      docNo,
      category,
      description: description.trim(),
      totalAmount: totalNum,
      installments: installmentsNum,
      installmentsPaid: 0,
      startPeriod,
      startDate: `25/${startPeriod}`,
      createdBy: 'สิริศักดิ์ หงษ์พัตรา',
      createdAt: new Date().toLocaleDateString('en-GB'),
      status: 'ระหว่างดำเนินการ',
      debitLines,
      creditLines,
      files: files.filter((f) => f.status === 'success').map((f) => f.name),
    };
  }

  function handleConfirmSubmit() {
    setConfirmSubmitOpen(false);
    onSave(buildEntry());
    setSuccessOpen(true);
  }

  function handleSuccessClose() {
    setSuccessOpen(false);
    onCancel();
  }

  function handleBreadcrumbClick() {
    if (dirty) setLeaveWarningOpen(true);
    else onCancel();
  }

  function renderAccountTable() {
    const rows = [
      ...debitLines.map((l) => ({ ...l, side: 'debit' })),
      ...creditLines.map((l) => ({ ...l, side: 'credit' })),
    ];
    return (
      <div className="glw-line-table-wrapper">
        <table className="glw-line-table">
          <colgroup>
            <col style={{ width: '56px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '180px' }} />
            <col />
            <col style={{ width: '160px' }} />
            <col style={{ width: '160px' }} />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th>
                {t('ฝ่าย (UL)')} <span className="aft-required">*</span>
              </th>
              <th>
                {t('รหัสบัญชี')} <span className="aft-required">*</span>
              </th>
              <th>
                {t('รหัส CV')} <span className="aft-required">*</span>
              </th>
              <th className="glw-col-amount">{t('เดบิต (THB)')}</th>
              <th className="glw-col-amount">{t('เครดิต (THB)')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line, i) => (
              <tr key={line.id}>
                <td>{i + 1}</td>
                <td>
                  <Combobox
                    value={line.dept}
                    onChange={(v) => updateLine(line.side, line.id, { dept: v })}
                    options={UL_DEPT_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
                    placeholder={t('กรุณาเลือก')}
                  />
                </td>
                <td>
                  <Combobox
                    value={line.accountCode}
                    onChange={(v) => updateLine(line.side, line.id, { accountCode: v })}
                    options={GL_ACCOUNT_CODE_OPTIONS.map((a) => ({ value: a, label: t(a) }))}
                    placeholder={t('กรุณาเลือก')}
                  />
                </td>
                <td>
                  <Combobox
                    value={line.cvCode}
                    onChange={(v) => updateLine(line.side, line.id, { cvCode: v })}
                    options={CV_OPTIONS.map((c) => ({ value: c, label: t(c) }))}
                    placeholder={t('กรุณาเลือก')}
                    searchable
                  />
                </td>
                <td className="glw-col-amount">
                  {line.side === 'debit' ? (
                    <span className="glw-account-amount-box">{formatWholeAmount(line.amount)} THB</span>
                  ) : (
                    <span className="glw-account-amount-box glw-account-amount-box--disabled">0.00 THB</span>
                  )}
                </td>
                <td className="glw-col-amount">
                  {line.side === 'credit' ? (
                    <span className="glw-account-amount-box">{formatWholeAmount(line.amount)} THB</span>
                  ) : (
                    <span className="glw-account-amount-box glw-account-amount-box--disabled">0.00 THB</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="glw-total-row">
              <td colSpan={4} className="glw-total-label">
                {t('ยอดรวม')}
              </td>
              <td className="glw-col-amount glw-total-amount">{formatWholeAmount(debitTotal)} THB</td>
              <td className="glw-col-amount glw-total-amount">{formatWholeAmount(creditTotal)} THB</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  function renderUploadCard(file) {
    if (file.status === 'success' && file.settled) {
      return (
        <div className="glwd-file-card" key={file.id}>
          <FileDocIcon />
          <div className="glwd-file-info">
            <span className="glwd-file-name">{file.name}</span>
            <span className="glwd-file-size">{file.sizeLabel}</span>
          </div>
          <div className="glwd-file-actions">
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="var(--color-error-default)" size={16} />
            </button>
            <button type="button" className="glwd-file-action-btn glwd-file-action-btn--outline" title={t('ดูตัวอย่าง')}>
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
      <div className="glw-upload-card" key={file.id}>
        <FileDocIcon color={isSuccess ? 'var(--color-primary-default)' : 'var(--color-primary-container)'} />
        <div className="glw-upload-info">
          <div className="glw-upload-name-row">
            <span className="glw-upload-name">{file.name}</span>
            {isSuccess && <CheckCircleSolidIcon />}
            {isError && <ErrorCircleSolidIcon />}
          </div>
          <div className={`glw-upload-track${isError ? ' glw-upload-track--error' : ''}`}>
            <div
              className={`glw-upload-fill${isSuccess ? ' glw-upload-fill--success' : isError ? ' glw-upload-fill--error' : ''}`}
              style={{ width: `${file.progress}%` }}
            />
          </div>
          <div className="glw-upload-status-row">
            <span className="glw-upload-status-time">
              {isUploading && tv('{n} วินาที', { n: file.secondsLeft })}
              {isSizeError && file.sizeLabel}
            </span>
            <span
              className={`glw-upload-status-text glw-upload-status-text--${
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
        <div className="glwd-file-actions">
          {isUploading && (
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
              title={t('ยกเลิก')}
              onClick={() => cancelUpload(file.id)}
            >
              <CloseIcon size={16} color="var(--color-error-default)" />
            </button>
          )}
          {isSuccess && (
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
              title={t('ลบ')}
              onClick={() => removeFile(file.id)}
            >
              <DeleteIcon color="var(--color-error-default)" size={16} />
            </button>
          )}
          {isGenericError && (
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--neutral"
              title={t('ลองใหม่')}
              onClick={() => retryUpload(file.id)}
            >
              <RetryIcon />
            </button>
          )}
          {(isSizeError || isFormatError) && (
            <button
              type="button"
              className="glwd-file-action-btn glwd-file-action-btn--danger"
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
            {t('จัดการรายการตัดบัญชี')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">{t('สร้างรายการตัดบัญชี')}</span>
        </div>
        <h1 className="aft-page-title">{t('สร้างรายการตัดบัญชี')}</h1>
      </div>

      <div className="aft-card">
        <div className="aft-section-title">{t('ข้อมูลการตัดบัญชี')}</div>

        <div className="aft-form-row glw-form-row-3">
          <div className="aft-form-field">
            <label className="aft-form-label">{t('บริษัท')}</label>
            <div className="aft-input-group">
              <input
                type="text"
                className="aft-input-amount"
                style={{ textAlign: 'left' }}
                value={t(GL_WRITEOFF_COMPANY)}
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

        <div className="aft-form-row glw-form-row-3">
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
            <input
              type="text"
              className="modal-input"
              value={description}
              maxLength={100}
              placeholder={t('กรุณากรอก')}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
            />
            <span className="glw-char-count">{description.length}/100</span>
          </div>
        </div>

        <div className="aft-form-row glw-form-row-3">
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

        <div className="glw-hint">{t('หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}</div>

        <div className="aft-divider" />

        <div className="aft-section-title">{t('ไฟล์แนบ')}</div>
        <div className="glw-file-row">
          <button className="glw-file-btn" onClick={() => fileInputRef.current?.click()}>
            {t('เลือกไฟล์')}
          </button>
          {files.length === 0 && <span className="glw-file-empty">{t('ยังไม่ได้เลือกไฟล์')}</span>}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>
        <div className="glw-file-hint">PDF, XLSX, PNG, JPG (MAX. 25MB)</div>
        {files.length > 0 && (
          <>
            <div className="glwd-file-header">
              <span className="glwd-file-header-text">
                {t('ไฟล์เอกสารแนบ')} <span className="glwd-file-count">{files.length}</span> {t('รายการ')}
              </span>
              <span className="glwd-file-header-divider" />
            </div>
            <div className="glwd-file-list">{files.map((f) => renderUploadCard(f))}</div>
          </>
        )}

        <div className="aft-divider" />

        {!accountInfoValid ? (
          <>
            <div className="aft-section-title">{t('ข้อมูลบัญชี')}</div>
            <EmptyState title="ไม่มีข้อมูล" message="กรุณากรอกข้อมูลการตัดบัญชีให้ครบถ้วนก่อน" />
          </>
        ) : (
          <>
            <div className="glw-section-header">
              <div>
                <div className="aft-section-title" style={{ marginBottom: 0 }}>
                  {t('ข้อมูลบัญชี')}
                </div>
                <div className="glw-section-subtitle">
                  {t('ระบบคำนวณยอดเดบิตและเครดิตเริ่มต้นจากยอดรวมทั้งสัญญา ออกมาเป็นยอดตัดบัญชีต่อเดือน')}
                </div>
              </div>
              <button type="button" className="ft-btn-outline glw-add-line-btn" onClick={addLinePair}>
                <PlusIcon color="var(--color-primary-default)" />
                {t('เพิ่ม')}
              </button>
            </div>
            {renderAccountTable()}

            <div className="glw-section-header">
              <div>
                <div className="aft-section-title" style={{ marginBottom: 0 }}>
                  {t('รายละเอียดการตัดบัญชีรายงวด')}
                </div>
                <div className="glw-section-subtitle">
                  {t('ระบบคำนวณยอดตัดบัญชีอัตโนมัติ')}{' '}
                  <span className="glw-subtitle-highlight">
                    {installmentsNum} {t('งวด')}
                  </span>{' '}
                  {t('หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}
                </div>
              </div>
            </div>

            <div className="glw-line-table-wrapper">
              <table className="glw-line-table glw-schedule-table">
                <colgroup>
                  <col style={{ width: '160px' }} />
                  <col />
                  <col style={{ width: '240px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('งวดที่')}</th>
                    <th>{t('เดือน')}</th>
                    <th className="glw-col-amount">{t('จำนวนเงินต่องวด (THB)')}</th>
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
                    </tr>
                  ))}
                  <tr className="glw-total-row">
                    <td className="glw-total-label" colSpan={2}>
                      {t('ยอดรวม')}
                    </td>
                    <td className="glw-col-amount glw-total-amount">{formatMoney(totalNum)}</td>
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
          <button
            className="aft-btn-add"
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={!formValid || hasUploadingFiles}
          >
            {t('สร้าง')}
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
        title={t('คุณต้องการสร้างรายการตัดบัญชีใช่ไหม?')}
        message={t('กรุณาตรวจสอบความถูกต้องก่อนสร้างรายการตัดบัญชี')}
        onClose={() => setConfirmSubmitOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setConfirmSubmitOpen(false) },
          { label: t('สร้าง'), variant: 'primary', onClick: handleConfirmSubmit },
        ]}
      />

      <Dialog
        open={successOpen}
        variant="success"
        title={t('สร้างรายการตัดบัญชีสำเร็จ!')}
        autoCloseMs={3000}
        onClose={handleSuccessClose}
      />
    </>
  );
}
