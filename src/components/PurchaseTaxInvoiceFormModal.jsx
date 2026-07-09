import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PT_DOC_TYPE_OPTIONS } from '../data';
import { calcTaxAmount, isDuplicatePurchaseTaxInvoice, todayIso, formatThaiDate } from '../utils';
import Combobox from './Combobox';
import { CloseIcon } from '../icons';

function sanitizeNumericInput(raw) {
  let cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Add/edit modal for a single purchase tax invoice row.
 * - Add mode: `refDoc` is the GL/AP document just picked in SelectReferenceDocModal; `period` is the
 *   accounting period (from the page's filter selection) the new row will be recorded under — it must
 *   be passed in explicitly since `refDoc` (an unposted-tax-invoice GL/AP document) has no period of its own.
 * - Edit mode: `entry` is the existing row (its own refDocType/refDocNo/vendorName/period carry over).
 */
export default function PurchaseTaxInvoiceFormModal({ mode, refDoc, entry, period, existing, onClose, onSubmit }) {
  const { t } = useApp();
  const source = mode === 'add' ? refDoc : entry;
  const effectivePeriod = mode === 'add' ? period : entry.period;

  const [invoiceDate, setInvoiceDate] = useState(entry?.invoiceDate ?? '');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState(entry?.vendorInvoiceNo ?? '');
  const [description, setDescription] = useState(entry?.description ?? source.description ?? '');
  const [docType, setDocType] = useState(entry?.docType ?? PT_DOC_TYPE_OPTIONS[0]);
  const [taxRate, setTaxRate] = useState(String(entry?.taxRate ?? 7));
  const [baseAmount, setBaseAmount] = useState(String(entry?.baseAmount ?? source.amount ?? source.baseAmount ?? 0));
  const [errors, setErrors] = useState({});

  const taxRateNum = parseFloat(taxRate) || 0;
  const baseAmountNum = parseFloat(baseAmount.replace(/,/g, '')) || 0;
  const taxAmount = calcTaxAmount(baseAmountNum, taxRateNum);

  function clearFieldError(key) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const e = {};
    if (!vendorInvoiceNo.trim()) {
      e.vendorInvoiceNo = t('กรุณากรอกเลขที่ใบกำกับภาษีผู้ขาย');
    }
    if (!invoiceDate) {
      e.invoiceDate = t('กรุณาระบุวันที่ใบกำกับภาษี');
    } else if (invoiceDate > todayIso()) {
      e.invoiceDate = t('วันที่ใบกำกับภาษีต้องไม่เกินวันที่ปัจจุบัน กรุณาเลือกวันที่ใหม่');
    }
    if (baseAmountNum <= 0) {
      e.baseAmount = t('กรุณากรอกมูลค่าสินค้าที่มากกว่า 0');
    }
    if (
      vendorInvoiceNo.trim() &&
      isDuplicatePurchaseTaxInvoice(
        existing,
        { vendorInvoiceNo, vendorName: source.vendorName, period: effectivePeriod },
        entry?.id,
      )
    ) {
      e.vendorInvoiceNo = t(
        'เลขที่ใบกำกับภาษีนี้ซ้ำกับรายการที่มีอยู่ กรุณาตรวจสอบเลขที่ใบกำกับภาษี เจ้าหนี้ และงวดภาษีอีกครั้ง',
      );
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSubmit({
      invoiceDate,
      vendorInvoiceNo: vendorInvoiceNo.trim(),
      description: description.trim(),
      docType,
      taxRate: taxRateNum,
      baseAmount: baseAmountNum,
      taxAmount,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t(mode === 'add' ? 'บันทึกภาษีซื้อ' : 'แก้ไขภาษีซื้อ')}</h3>
          <button className="modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="filter-modal-body">
          <div className="view-detail-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('เจ้าหนี้')}</span>
              <span className="view-detail-value">{t(source.vendorName)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('อ้างถึง')}</span>
              <span className="view-detail-value">{t(source.refDocType ?? source.refDocType)}</span>
            </div>
            <div className="view-detail-field">
              <span className="view-detail-label">{t('เลขที่เอกสารอ้างถึง')}</span>
              <span className="view-detail-value">{source.docNo ?? source.refDocNo}</span>
            </div>
          </div>

          <div className="aft-divider" />

          <div className="aft-form-row glw-form-row-3">
            <div className="aft-form-field">
              <label className="aft-form-label">
                {t('เลขที่ใบกำกับภาษีผู้ขาย')} <span className="aft-required">*</span>
              </label>
              <input
                type="text"
                className="modal-input"
                value={vendorInvoiceNo}
                placeholder={t('กรุณากรอก')}
                onChange={(e) => {
                  setVendorInvoiceNo(e.target.value);
                  clearFieldError('vendorInvoiceNo');
                }}
              />
              {errors.vendorInvoiceNo && <span className="field-error">{errors.vendorInvoiceNo}</span>}
            </div>
            <div className="aft-form-field">
              <label className="aft-form-label">
                {t('วันที่ใบกำกับภาษี')} <span className="aft-required">*</span>
              </label>
              <input
                type="date"
                className="modal-input"
                value={invoiceDate}
                max={todayIso()}
                onChange={(e) => {
                  setInvoiceDate(e.target.value);
                  clearFieldError('invoiceDate');
                }}
              />
              {invoiceDate && <span className="glw-file-hint">{formatThaiDate(invoiceDate)}</span>}
              {errors.invoiceDate && <span className="field-error">{errors.invoiceDate}</span>}
            </div>
            <div className="aft-form-field">
              <label className="aft-form-label">
                {t('ประเภทเอกสาร')} <span className="aft-required">*</span>
              </label>
              <Combobox
                value={docType}
                onChange={setDocType}
                options={PT_DOC_TYPE_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
              />
            </div>
          </div>

          <div className="aft-form-row">
            <div className="aft-form-field">
              <label className="aft-form-label">{t('รายการ')}</label>
              <input
                type="text"
                className="modal-input"
                value={description}
                maxLength={200}
                placeholder={t('กรุณากรอก')}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="aft-form-row glw-form-row-3">
            <div className="aft-form-field">
              <label className="aft-form-label">
                {t('มูลค่าสินค้า')} <span className="aft-required">*</span>
              </label>
              <div className={`aft-input-group${errors.baseAmount ? ' aft-input-group--error' : ''}`}>
                <input
                  type="text"
                  inputMode="decimal"
                  className="aft-input-amount"
                  style={{ textAlign: 'right' }}
                  value={baseAmount}
                  placeholder="0.00"
                  onChange={(e) => {
                    setBaseAmount(sanitizeNumericInput(e.target.value));
                    clearFieldError('baseAmount');
                  }}
                  onBlur={() => {
                    if (baseAmountNum > 0) setBaseAmount(formatMoney(baseAmountNum));
                  }}
                  onFocus={() => setBaseAmount(baseAmountNum > 0 ? String(baseAmountNum) : '')}
                />
                <span className="aft-input-unit">THB</span>
              </div>
              {errors.baseAmount && <span className="field-error">{errors.baseAmount}</span>}
            </div>
            <div className="aft-form-field">
              <label className="aft-form-label">
                {t('ภาษี')} (%) <span className="aft-required">*</span>
              </label>
              <div className="aft-input-group">
                <input
                  type="text"
                  inputMode="decimal"
                  className="aft-input-amount"
                  value={taxRate}
                  onChange={(e) => setTaxRate(sanitizeNumericInput(e.target.value))}
                />
                <span className="aft-input-unit">%</span>
              </div>
            </div>
            <div className="aft-form-field">
              <label className="aft-form-label">{t('เงินภาษี')}</label>
              <div className="aft-input-group">
                <input type="text" className="aft-input-amount" style={{ textAlign: 'right' }} value={formatMoney(taxAmount)} disabled />
                <span className="aft-input-unit">THB</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="ft-btn-outline" onClick={onClose}>
            {t('ยกเลิก')}
          </button>
          <button className="ft-btn-primary" onClick={handleSubmit}>
            {t(mode === 'add' ? 'บันทึก' : 'บันทึกการแก้ไข')}
          </button>
        </div>
      </div>
    </div>
  );
}
