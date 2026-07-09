import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Select from '../components/Select';
import Combobox from '../components/Combobox';
import Dialog from '../components/Dialog';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import SelectReferenceDocModal from '../components/SelectReferenceDocModal';
import PurchaseTaxInvoiceFormModal from '../components/PurchaseTaxInvoiceFormModal';
import ReferenceDocDetailModal from '../components/ReferenceDocDetailModal';
import { THAI_MONTH_OPTIONS, BUDDHIST_YEAR_OPTIONS, DEPT_OPTIONS, PT_DOC_TYPE_OPTIONS, PT_STATUS_OPTIONS } from '../data';
import { buildPeriodCode, nextPurchaseTaxInvoiceCode, formatThaiDate } from '../utils';
import { PlusIcon, SearchIcon, EditIcon, ViewIcon, CheckCircleIcon, CancelCircleIcon, DownloadIcon } from '../icons';

const PAGE_SIZE = 10;

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY_FILTERS = {
  month: '',
  year: '',
  dept: '',
  docType: '',
  status: '',
  docNoFrom: '',
  docNoTo: '',
};

export default function PurchaseTaxInvoicePage({ data, refDocs, onChange }) {
  const { pushToast, t, tv } = useApp();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [formModal, setFormModal] = useState(null); // { mode: 'add' | 'edit', refDoc?, entry? }
  const [detailEntry, setDetailEntry] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSuccessOpen, setConfirmSuccessOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);

  const selected = data.find((e) => e.id === selectedId) ?? null;

  // เอกสารอ้างอิงที่ยังไม่ถูกบันทึกภาษีซื้อ (ไม่นับรายการที่ถูกยกเลิกไปแล้ว จึงกลับมาเลือกใหม่ได้)
  const availableRefDocs = useMemo(() => {
    const usedDocNos = new Set(data.filter((e) => e.status !== 'ยกเลิก').map((e) => e.refDocNo));
    return refDocs.filter((d) => !usedDocNos.has(d.docNo));
  }, [data, refDocs]);

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (appliedFilters.month && row.month !== appliedFilters.month) return false;
      if (appliedFilters.year && row.year !== appliedFilters.year) return false;
      if (appliedFilters.dept && row.dept !== appliedFilters.dept) return false;
      if (appliedFilters.docType && row.docType !== appliedFilters.docType) return false;
      if (appliedFilters.status && row.status !== appliedFilters.status) return false;
      if (appliedFilters.docNoFrom && row.refDocNo < appliedFilters.docNoFrom) return false;
      if (appliedFilters.docNoTo && row.refDocNo > appliedFilters.docNoTo) return false;
      return true;
    });
  }, [data, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const subDeptForFilter = draftFilters.dept ? '00 - สำนักงานใหญ่' : '';

  // งวดบัญชีของรายการใหม่ อิงจากตัวกรองเดือน/ปีที่เลือกอยู่ (ดีฟอลต์เป็นเดือน/ปีปัจจุบันของชุดข้อมูลตัวอย่างถ้ายังไม่ได้เลือก)
  const activeMonth = draftFilters.month || 'มิถุนายน';
  const activeYear = draftFilters.year || '2569';
  const activePeriod = buildPeriodCode(activeMonth, activeYear, THAI_MONTH_OPTIONS);

  function handleSearch() {
    setAppliedFilters(draftFilters);
    setPage(1);
    setSelectedId(null);
  }

  function handleSelectDoc(doc) {
    setSelectModalOpen(false);
    setFormModal({ mode: 'add', refDoc: doc });
  }

  function handleAddSave(fields) {
    const refDoc = formModal.refDoc;
    const entry = {
      id: `pti-${Date.now()}`,
      code: nextPurchaseTaxInvoiceCode(data, activePeriod),
      period: activePeriod,
      month: activeMonth,
      year: activeYear,
      dept: refDoc.dept,
      subDept: refDoc.subDept,
      vendorName: refDoc.vendorName,
      refDocType: refDoc.refDocType,
      refDocNo: refDoc.docNo,
      status: 'รอบันทึก',
      cancelReason: '',
      createdBy: 'สิริศักดิ์ หงษ์พัตรา',
      createdAt: new Date().toLocaleDateString('en-GB'),
      ...fields,
    };
    onChange([entry, ...data]);
    setFormModal(null);
    setSaveSuccessOpen(true);
  }

  function handleEditSave(fields) {
    const entry = formModal.entry;
    onChange(data.map((row) => (row.id === entry.id ? { ...row, ...fields } : row)));
    setFormModal(null);
    setSaveSuccessOpen(true);
  }

  function handleConfirmRow() {
    setConfirmOpen(false);
    onChange(data.map((row) => (row.id === selected.id ? { ...row, status: 'ยืนยันแล้ว' } : row)));
    setConfirmSuccessOpen(true);
  }

  function handleCancelRow() {
    setCancelModalOpen(false);
    onChange(
      data.map((row) => (row.id === selected.id ? { ...row, status: 'ยกเลิก', cancelReason: cancelReason.trim() } : row)),
    );
    setCancelReason('');
    setCancelSuccessOpen(true);
  }

  function handleDownload() {
    // TODO: swap for a real Excel/PDF export (e.g. via a report-generation endpoint) — CSV mirrors the
    // export convention already used by GlWriteoffListPage/FinancialTargetPage in this codebase.
    const header = [
      t('ลำดับใบกำกับภาษี'), t('วันที่ใบกำกับภาษี'), t('เลขที่ใบกำกับภาษีผู้ขาย'), t('เจ้าหนี้'),
      t('รายการ'), t('อ้างถึง'), t('เลขที่เอกสารอ้างถึง'), t('ภาษี'), t('มูลค่าสินค้า'), t('เงินภาษี'), t('สถานะ'),
    ];
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filtered.map((r) =>
        [
          r.code, formatThaiDate(r.invoiceDate), r.vendorInvoiceNo, t(r.vendorName), t(r.description),
          t(r.refDocType), r.refDocNo, `${r.taxRate}%`, r.baseAmount, r.taxAmount, t(r.status),
        ].map(escape).join(','),
      ),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('ภาษีซื้อ.csv');
    a.click();
    URL.revokeObjectURL(url);
    pushToast(t('ดาวน์โหลดไฟล์สำเร็จ'), 'success');
  }

  const canEdit = !!selected && selected.status !== 'ยืนยันแล้ว' && selected.status !== 'ยกเลิก';
  const canConfirm = !!selected && selected.status === 'รอบันทึก';
  const canCancel = !!selected && selected.status === 'รอบันทึก';

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('บันทึกภาษีซื้อ')}</h1>
      </div>

      <div className="ft-content-card">
        <div className="recon-filter-row" style={{ flexWrap: 'wrap' }}>
          <div className="recon-filter-field">
            <label>{t('ประจำเดือน')}</label>
            <Select
              value={draftFilters.month}
              onChange={(v) => setDraftFilters((p) => ({ ...p, month: v }))}
              placeholder={t('ทั้งหมด')}
              options={THAI_MONTH_OPTIONS.map((m) => ({ value: m, label: t(m) }))}
              className="aft-select"
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('ประจำปี')}</label>
            <Select
              value={draftFilters.year}
              onChange={(v) => setDraftFilters((p) => ({ ...p, year: v }))}
              placeholder={t('ทั้งหมด')}
              options={BUDDHIST_YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
              className="aft-select"
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('หน่วยงานหลัก')}</label>
            <Combobox
              value={draftFilters.dept}
              onChange={(v) => setDraftFilters((p) => ({ ...p, dept: v }))}
              options={DEPT_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
              placeholder={t('ทั้งหมด')}
              searchable
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('หน่วยงานย่อย')}</label>
            <Combobox
              value={subDeptForFilter}
              onChange={() => {}}
              options={subDeptForFilter ? [{ value: subDeptForFilter, label: t(subDeptForFilter) }] : []}
              placeholder={t('ทั้งหมด')}
              disabled={!draftFilters.dept}
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('ประเภทเอกสาร')}</label>
            <Combobox
              value={draftFilters.docType}
              onChange={(v) => setDraftFilters((p) => ({ ...p, docType: v }))}
              options={PT_DOC_TYPE_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
              placeholder={t('ทั้งหมด')}
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('สถานะ')}</label>
            <Combobox
              value={draftFilters.status}
              onChange={(v) => setDraftFilters((p) => ({ ...p, status: v }))}
              options={PT_STATUS_OPTIONS.map((s) => ({ value: s, label: t(s) }))}
              placeholder={t('ทั้งหมด')}
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('เลขที่เอกสารอ้างถึง (ตั้งแต่)')}</label>
            <input
              type="text"
              className="modal-input"
              value={draftFilters.docNoFrom}
              onChange={(e) => setDraftFilters((p) => ({ ...p, docNoFrom: e.target.value }))}
              placeholder={t('กรุณากรอก')}
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('ถึง')}</label>
            <input
              type="text"
              className="modal-input"
              value={draftFilters.docNoTo}
              onChange={(e) => setDraftFilters((p) => ({ ...p, docNoTo: e.target.value }))}
              placeholder={t('กรุณากรอก')}
            />
          </div>
          <button className="ft-btn-primary" onClick={handleSearch}>
            <SearchIcon />
            {t('ค้นหา')}
          </button>
        </div>

        <div className="recon-list-header">
          <h2>{tv('รายการภาษีซื้อ {count} รายการ', { count: filtered.length })}</h2>
          <div className="ft-header-buttons">
            <button className="ft-btn-outline" onClick={handleDownload}>
              <DownloadIcon />
              {t('พิมพ์')}
            </button>
            <button
              className="ft-btn-outline"
              disabled={!selected}
              title={t('รายละเอียด')}
              onClick={() => setDetailEntry(selected)}
            >
              <ViewIcon />
              {t('รายละเอียด')}
            </button>
            <button
              className="ft-btn-outline"
              disabled={!canCancel}
              title={t('ยกเลิก')}
              onClick={() => setCancelModalOpen(true)}
            >
              <CancelCircleIcon />
              {t('ยกเลิก')}
            </button>
            <button
              className="ft-btn-outline"
              disabled={!canConfirm}
              title={t('ยืนยัน')}
              onClick={() => setConfirmOpen(true)}
            >
              <CheckCircleIcon />
              {t('ยืนยัน')}
            </button>
            <button
              className="ft-btn-outline"
              disabled={!canEdit}
              title={t('แก้ไข')}
              onClick={() => setFormModal({ mode: 'edit', entry: selected })}
            >
              <EditIcon />
              {t('แก้ไข')}
            </button>
            <button className="ft-btn-outline" onClick={() => setSelectModalOpen(true)}>
              <SearchIcon />
              {t('เลือก')}
            </button>
            <button className="ft-btn-primary" onClick={() => setSelectModalOpen(true)}>
              <PlusIcon />
              {t('เพิ่ม')}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="ft-table-wrapper">
              <table className="ft-table pti-table">
                <colgroup>
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('ลำดับใบกำกับภาษี')}</th>
                    <th>{t('วันที่ใบกำกับภาษี')}</th>
                    <th>{t('เลขที่ใบกำกับภาษีผู้ขาย')}</th>
                    <th>{t('เจ้าหนี้')}</th>
                    <th>{t('รายการ')}</th>
                    <th>{t('อ้างถึง')}</th>
                    <th>{t('เลขที่เอกสารอ้างถึง')}</th>
                    <th>{t('ภาษี')} (%)</th>
                    <th>{t('มูลค่าสินค้า')}</th>
                    <th>{t('เงินภาษี')}</th>
                    <th className="ft-table-status-col">{t('สถานะ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === selectedId ? 'pti-row--selected' : ''}
                      onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                    >
                      <td>{row.code}</td>
                      <td>{formatThaiDate(row.invoiceDate)}</td>
                      <td>{row.vendorInvoiceNo}</td>
                      <td>{t(row.vendorName)}</td>
                      <td>{t(row.description)}</td>
                      <td>{t(row.refDocType)}</td>
                      <td>
                        <button
                          type="button"
                          className="pti-ref-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailEntry(row);
                          }}
                        >
                          {row.refDocNo}
                        </button>
                      </td>
                      <td>{row.taxRate}%</td>
                      <td>{formatMoney(row.baseAmount)}</td>
                      <td>{formatMoney(row.taxAmount)}</td>
                      <td className="ft-table-status-col">
                        <StatusBadge value={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={pageClamped}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {selectModalOpen && (
        <SelectReferenceDocModal
          availableDocs={availableRefDocs}
          onSelect={handleSelectDoc}
          onClose={() => setSelectModalOpen(false)}
        />
      )}

      {formModal && (
        <PurchaseTaxInvoiceFormModal
          mode={formModal.mode}
          refDoc={formModal.refDoc}
          entry={formModal.entry}
          period={activePeriod}
          existing={data}
          onClose={() => setFormModal(null)}
          onSubmit={formModal.mode === 'add' ? handleAddSave : handleEditSave}
        />
      )}

      {detailEntry && <ReferenceDocDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />}

      <Dialog
        open={confirmOpen}
        variant="save"
        title={t('คุณต้องการยืนยันรายการนี้ใช่ไหม?')}
        message={t('เมื่อยืนยันแล้ว จะไม่สามารถแก้ไขหรือลบรายการนี้ได้โดยตรงอีก')}
        onClose={() => setConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setConfirmOpen(false) },
          { label: t('ยืนยัน'), variant: 'primary', onClick: handleConfirmRow },
        ]}
      />
      <Dialog
        open={confirmSuccessOpen}
        variant="success"
        title={t('ยืนยันรายการสำเร็จ!')}
        autoCloseMs={3000}
        onClose={() => setConfirmSuccessOpen(false)}
      />

      {cancelModalOpen && (
        <div className="modal-backdrop" onClick={() => setCancelModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('ยกเลิกรายการภาษีซื้อ')}</h3>
            </div>
            <div className="filter-modal-body">
              <p>{t('คุณต้องการยกเลิกรายการนี้ใช่ไหม?')}</p>
              <div className="aft-form-field">
                <label className="aft-form-label">
                  {t('เหตุผลที่ยกเลิก')} <span className="aft-required">*</span>
                </label>
                <textarea
                  className="modal-input"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('กรุณากรอก')}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="ft-btn-outline" onClick={() => setCancelModalOpen(false)}>
                {t('ย้อนกลับ')}
              </button>
              <button className="ft-btn-primary" disabled={!cancelReason.trim()} onClick={handleCancelRow}>
                {t('ยกเลิกรายการ')}
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={cancelSuccessOpen}
        variant="success"
        title={t('ยกเลิกรายการสำเร็จ!')}
        autoCloseMs={3000}
        onClose={() => setCancelSuccessOpen(false)}
      />

      <Dialog
        open={saveSuccessOpen}
        variant="success"
        title={t('บันทึกภาษีซื้อสำเร็จ!')}
        autoCloseMs={3000}
        onClose={() => setSaveSuccessOpen(false)}
      />
    </>
  );
}
