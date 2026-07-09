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
import { ChevronBreadcrumbIcon, CloseIcon, PlusIcon } from '../icons';

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

let lineIdCounter = 0;
function newLine(accountCode) {
  lineIdCounter += 1;
  return { id: `glw-line-${Date.now()}-${lineIdCounter}`, dept: '', accountCode, cvCode: '', amount: 0 };
}

export default function GlWriteoffFormPage({ existing, onCancel, onSave }) {
  const { t } = useApp();
  const fileInputRef = useRef(null);

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

  const formValid = accountInfoValid && linesValid(debitLines) && linesValid(creditLines);

  function markDirty() {
    setDirty(true);
  }

  function handleFilesSelected(list) {
    if (!list || list.length === 0) return;
    setFiles((prev) => [...prev, ...Array.from(list).map((f) => f.name)]);
    markDirty();
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      files,
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
            <col style={{ width: '220px' }} />
            <col style={{ width: '180px' }} />
            <col />
            <col style={{ width: '160px' }} />
            <col style={{ width: '160px' }} />
          </colgroup>
          <thead>
            <tr>
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
            {rows.map((line) => (
              <tr key={line.id}>
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
                    `${formatWholeAmount(line.amount)} THB`
                  ) : (
                    <span className="glw-amount-disabled">0.00 THB</span>
                  )}
                </td>
                <td className="glw-col-amount">
                  {line.side === 'credit' ? (
                    `${formatWholeAmount(line.amount)} THB`
                  ) : (
                    <span className="glw-amount-disabled">0.00 THB</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="glw-total-row">
              <td colSpan={3} className="glw-total-label">
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

  return (
    <>
      <div className="aft-page-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={handleBreadcrumbClick}>
            {t('การตัดบัญชี GL')}
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
          <div>
            {files.map((name, i) => (
              <span className="glw-file-chip" key={`${name}-${i}`}>
                {name}
                <button
                  type="button"
                  title={t('ลบ')}
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <CloseIcon size={14} />
                </button>
              </span>
            ))}
          </div>
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
                <PlusIcon color="#074E9F" />
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
                  {t('ระบบคำนวณยอดตัดบัญชีอัตโนมัติ')} {installmentsNum} {t('งวด หากคำนวณค่างวดแล้วพบว่ามีเศษทศนิยม ระบบจะปัดเศษไปรวมในงวดที่ 1')}
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
          <button className="aft-btn-add" onClick={() => setConfirmSubmitOpen(true)} disabled={!formValid}>
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
