import { useState } from 'react';
import { YEAR_OPTIONS, DEPT_OPTIONS, ACCOUNT_OPTIONS, THAI_MONTH_OPTIONS } from '../data';
import { useApp } from '../context/AppContext';
import Combobox from '../components/Combobox';
import Dialog from '../components/Dialog';
import { ChevronBreadcrumbIcon } from '../icons';

export default function FinancialTargetFormPage({ mode, initial, existing, onCancel, onSave }) {
  const { t } = useApp();
  const [year, setYear] = useState(initial?.year ?? '2026');
  const [dept, setDept] = useState(initial?.dept ?? '');
  const [accountCode, setAccountCode] = useState(initial?.accountCode ?? '');
  const [amounts, setAmounts] = useState(
    initial?.monthlyAmounts?.map((n) => n.toFixed(2)) ?? Array(12).fill('0.00'),
  );
  const [errors, setErrors] = useState({});
  const [amountErrors, setAmountErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [focusedAmountIndex, setFocusedAmountIndex] = useState(null);

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const subDept = dept ? '00 - สำนักงาน' : '';

  const total = amounts.reduce((sum, v) => sum + (parseFloat(v.replace(/,/g, '')) || 0), 0);
  const formatTotal = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function markDirty() {
    setDirty(true);
  }

  function clearFieldError(key) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function sanitizeNumericInput(raw) {
    let cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    }
    return cleaned;
  }

  function handleAmountChange(index, value) {
    const next = [...amounts];
    next[index] = sanitizeNumericInput(value);
    setAmounts(next);
    markDirty();
    setAmountErrors((prev) => {
      if (!(index in prev)) return prev;
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  }

  function handleAmountFocus(index) {
    setFocusedAmountIndex(index);
    const n = parseFloat(amounts[index].replace(/,/g, '')) || 0;
    if (n === 0) {
      const next = [...amounts];
      next[index] = '';
      setAmounts(next);
    }
  }

  function handleAmountBlur(index) {
    const n = parseFloat(amounts[index]) || 0;
    const next = [...amounts];
    next[index] = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setAmounts(next);
  }

  function validateFields() {
    const e = {};
    if (mode === 'add') {
      if (!year) e.year = t('กรุณาเลือกปีงบการเงิน');
      if (!dept) e.dept = t('กรุณาเลือกหน่วยงานหลัก');
      if (!accountCode) e.accountCode = t('กรุณาเลือกกลุ่มบัญชี');
    }

    const amtErrors = {};
    amounts.forEach((a, i) => {
      const n = parseFloat(a.replace(/,/g, ''));
      if (a.trim() === '' || isNaN(n) || n < 0) {
        amtErrors[i] = t('กรุณากรอกตัวเลขที่มากกว่าหรือเท่ากับ 0');
      }
    });

    setErrors(e);
    setAmountErrors(amtErrors);
    return Object.keys(e).length === 0 && Object.keys(amtErrors).length === 0;
  }

  function isDuplicate() {
    return existing.some(
      (r) => r.id !== initial?.id && r.year === year && r.dept === dept && r.accountCode === accountCode,
    );
  }

  function buildFinancialTarget() {
    return {
      id: initial?.id ?? `ft-${Date.now()}`,
      year,
      dept,
      subDept,
      accountCode,
      monthlyAmounts: amounts.map((a) => parseFloat(a.replace(/,/g, '')) || 0),
    };
  }

  function handleSubmitClick() {
    if (!validateFields()) return;
    if (mode === 'add' && isDuplicate()) {
      setDuplicateOpen(true);
      return;
    }
    setConfirmSubmitOpen(true);
  }

  function handleConfirmSubmit() {
    setConfirmSubmitOpen(false);
    onSave(buildFinancialTarget());
    setSuccessOpen(true);
  }

  function handleSuccessClose() {
    setSuccessOpen(false);
    onCancel();
  }

  function handleCancelClick() {
    setConfirmCancelOpen(true);
  }

  function handleConfirmCancel() {
    setConfirmCancelOpen(false);
    onCancel();
  }

  function handleBreadcrumbClick() {
    if (dirty) {
      setLeaveWarningOpen(true);
    } else {
      onCancel();
    }
  }

  function handleConfirmLeave() {
    setLeaveWarningOpen(false);
    onCancel();
  }

  const titleText = t(mode === 'add' ? 'เพิ่มเป้าหมายงบการเงิน' : 'แก้ไขเป้าหมายงบการเงิน');

  const submitDialogVariant = mode === 'add' ? 'add' : 'save';
  const submitDialogTitle = t(
    mode === 'add' ? 'คุณต้องการเพิ่มเป้าหมายงบการเงินใช่ไหม?' : 'คุณต้องการบันทึกการแก้ไขเป้าหมายงบการเงินใช่ไหม?',
  );
  const submitDialogMessage = t(
    mode === 'add' ? 'กรุณาตรวจสอบความถูกต้องก่อนเพิ่มเป้าหมายงบการเงิน' : 'กรุณาตรวจสอบข้อมูลเป้าหมายงบการเงินให้ถูกต้องก่อนบันทึก',
  );
  const submitConfirmLabel = t(mode === 'add' ? 'เพิ่ม' : 'บันทึก');

  const cancelDialogTitle = t(
    mode === 'add' ? 'คุณต้องการยกเลิกการเพิ่มเป้าหมายงบการเงินใช่ไหม?' : 'คุณต้องการยกเลิกการแก้ไขเป้าหมายงบการเงินใช่ไหม?',
  );
  const cancelDialogMessage = t(
    mode === 'add'
      ? 'หากยกเลิกการเพิ่มเป้าหมายงบการเงิน ข้อมูลที่กรอกจะไม่ถูกบันทึกในระบบ'
      : 'หากยกเลิกการแก้ไขเป้าหมายงบการเงิน ข้อมูลที่กรอกจะไม่ถูกบันทึกในระบบ',
  );
  const cancelConfirmLabel = t(mode === 'add' ? 'ยกเลิกการเพิ่ม' : 'ยกเลิกการแก้ไข');

  const successTitle = t(mode === 'add' ? 'เพิ่มเป้าหมายงบการเงินสำเร็จ!' : 'บันทึกเป้าหมายงบการเงินสำเร็จ!');
  const duplicateTitle = t(mode === 'add' ? 'ไม่สามารถเพิ่มข้อมูลได้' : 'ไม่สามารถบันทึกข้อมูลได้');

  return (
    <>
      <div className="aft-page-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={handleBreadcrumbClick}>
            {t('เป้าหมายงบการเงิน')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">{titleText}</span>
        </div>
        <h1 className="aft-page-title">{titleText}</h1>
      </div>

      <div className="aft-card">
        <div className="aft-section-title">{t('รายละเอียด')}</div>

        {mode === 'add' ? (
          <>
            <div className="aft-form-row">
              <div className="aft-form-field">
                <label className="aft-form-label">
                  {t('ปีงบการเงิน')} <span className="aft-required">*</span>
                </label>
                <Combobox
                  value={year}
                  onChange={(v) => {
                    setYear(v);
                    clearFieldError('year');
                    markDirty();
                  }}
                  options={YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
                  error={!!errors.year}
                />
                {errors.year && <span className="field-error">{errors.year}</span>}
              </div>
              <div className="aft-form-field">
                <label className="aft-form-label">
                  {t('หน่วยงานหลัก')} <span className="aft-required">*</span>
                </label>
                <Combobox
                  value={dept}
                  onChange={(v) => {
                    setDept(v);
                    clearFieldError('dept');
                    markDirty();
                  }}
                  options={DEPT_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
                  placeholder={t('กรุณาเลือก')}
                  searchable
                  error={!!errors.dept}
                />
                {errors.dept && <span className="field-error">{errors.dept}</span>}
              </div>
            </div>

            <div className="aft-form-row">
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
              <div className="aft-form-field">
                <label className="aft-form-label">
                  {t('กลุ่มบัญชี')} <span className="aft-required">*</span>
                </label>
                <Combobox
                  value={accountCode}
                  onChange={(v) => {
                    setAccountCode(v);
                    clearFieldError('accountCode');
                    markDirty();
                  }}
                  options={ACCOUNT_OPTIONS.map((a) => ({ value: a, label: t(a) }))}
                  placeholder={t('กรุณาเลือก')}
                  searchable
                  error={!!errors.accountCode}
                />
                {errors.accountCode && <span className="field-error">{errors.accountCode}</span>}
              </div>
            </div>
          </>
        ) : (
          <div className="view-detail-grid">
            <div className="view-detail-field">
              <span className="view-detail-label">{t('ปีงบการเงิน')}</span>
              <span className="view-detail-value">{year}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('หน่วยงานหลัก')}</span>
              <span className="view-detail-value">{t(dept)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('หน่วยงานย่อย')}</span>
              <span className="view-detail-value">{t(subDept)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('กลุ่มบัญชี')}</span>
              <span className="view-detail-value">{t(accountCode)}</span>
            </div>
          </div>
        )}

        <div className="aft-divider" />

        <div className="aft-monthly-title">{t('เป้าหมายงบการเงินรายเดือน')}</div>

        <div className="aft-monthly-table-wrapper">
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
              {THAI_MONTH_OPTIONS.map((month, i) => {
                const isZero = (parseFloat(amounts[i].replace(/,/g, '')) || 0) === 0;
                return (
                  <tr key={month}>
                    <td>{t(month)}</td>
                    <td>
                      <div className={`aft-input-group${amountErrors[i] ? ' aft-input-group--error' : ''}`}>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`aft-input-amount${isZero && focusedAmountIndex !== i ? ' aft-input-amount--zero' : ''}`}
                          value={amounts[i]}
                          onChange={(e) => handleAmountChange(i, e.target.value)}
                          onFocus={(e) => {
                            handleAmountFocus(i);
                            e.target.select();
                          }}
                          onBlur={() => {
                            setFocusedAmountIndex(null);
                            handleAmountBlur(i);
                          }}
                        />
                        <span className="aft-input-unit">THB</span>
                      </div>
                      {amountErrors[i] && <div className="field-error field-error-row">{amountErrors[i]}</div>}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="view-total-label">Total</td>
                <td className="aft-total-row">
                  <span className="aft-total-amount">{formatTotal(total)} THB</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="aft-actions">
          <button className="ft-btn-outline" onClick={handleCancelClick}>
            {t('ยกเลิก')}
          </button>
          <button className="aft-btn-add" onClick={handleSubmitClick} disabled={mode === 'edit' && !dirty}>
            {t(mode === 'add' ? 'เพิ่ม' : 'บันทึก')}
          </button>
        </div>
      </div>

      <Dialog
        open={confirmCancelOpen}
        variant="cancel"
        title={cancelDialogTitle}
        message={cancelDialogMessage}
        onClose={() => setConfirmCancelOpen(false)}
        actions={[
          { label: t('ย้อนกลับ'), variant: 'outline', onClick: () => setConfirmCancelOpen(false) },
          { label: cancelConfirmLabel, variant: 'primary', onClick: handleConfirmCancel },
        ]}
      />

      <Dialog
        open={leaveWarningOpen}
        variant="warning"
        title={t('คุณต้องการออกจากหน้านี้ใช่ไหม?')}
        message={t('หากออกจากหน้านี้ ข้อมูลที่กรอกจะไม่ถูกบันทึกในระบบ')}
        onClose={() => setLeaveWarningOpen(false)}
        actions={[
          { label: t('ออกจากหน้านี้'), variant: 'outline', onClick: handleConfirmLeave },
          { label: t('อยู่หน้านี้ต่อ'), variant: 'primary', onClick: () => setLeaveWarningOpen(false) },
        ]}
      />

      <Dialog
        open={confirmSubmitOpen}
        variant={submitDialogVariant}
        title={submitDialogTitle}
        message={submitDialogMessage}
        onClose={() => setConfirmSubmitOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setConfirmSubmitOpen(false) },
          { label: submitConfirmLabel, variant: 'primary', onClick: handleConfirmSubmit },
        ]}
      />

      <Dialog
        open={duplicateOpen}
        variant="error"
        title={duplicateTitle}
        message={t('เป้าหมายงบการเงินนี้มีอยู่แล้ว')}
        onClose={() => setDuplicateOpen(false)}
        actions={[{ label: t('ยอมรับ'), variant: 'primary', onClick: () => setDuplicateOpen(false) }]}
      />

      <Dialog open={successOpen} variant="success" title={successTitle} autoCloseMs={3000} onClose={handleSuccessClose} />
    </>
  );
}
