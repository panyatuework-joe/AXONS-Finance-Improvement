import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateCompact, formatDateTime } from '../utils';
import MultiSelect from '../components/MultiSelect';
import DateRangePicker from '../components/DateRangePicker';
import Pagination from '../components/Pagination';
import Dialog from '../components/Dialog';
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  DownloadIcon,
  CloseIcon,
  SortAIcon,
  SortBOutlineIcon,
  SortBSolidIcon,
} from '../icons';

const PAGE_SIZE = 10;
const CURRENT_USER = 'สิริศักดิ์ หงษ์พัตรา';

function parseDateTime(s) {
  const [datePart, timePart] = s.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hh, mm] = (timePart ?? '0:0').split(':').map(Number);
  return new Date(year, month - 1, day, hh, mm).getTime();
}

function isWithinDateRange(value, start, end) {
  const valueMs = parseDateTime(value);
  if (start && valueMs < new Date(start).getTime()) return false;
  if (end && valueMs > new Date(end).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
  return true;
}

function toOptions(values) {
  return Array.from(new Set(values))
    .sort()
    .map((v) => ({ value: v, label: v }));
}

const EMPTY_FORM = { code: '', nameTH: '', nameEN: '', allowEdit: false, carryForward: false };

export default function AccountGroupPage({ data, onChange }) {
  const { t, tv } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('code');
  const [sortDir, setSortDir] = useState('asc');

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [appliedCodes, setAppliedCodes] = useState([]);
  const [appliedNameTH, setAppliedNameTH] = useState([]);
  const [appliedNameEN, setAppliedNameEN] = useState([]);
  const [appliedCreatedBy, setAppliedCreatedBy] = useState([]);
  const [appliedCreatedStart, setAppliedCreatedStart] = useState('');
  const [appliedCreatedEnd, setAppliedCreatedEnd] = useState('');
  const [appliedUpdatedStart, setAppliedUpdatedStart] = useState('');
  const [appliedUpdatedEnd, setAppliedUpdatedEnd] = useState('');

  const [draftCodes, setDraftCodes] = useState([]);
  const [draftNameTH, setDraftNameTH] = useState([]);
  const [draftNameEN, setDraftNameEN] = useState([]);
  const [draftCreatedBy, setDraftCreatedBy] = useState([]);
  const [draftCreatedStart, setDraftCreatedStart] = useState('');
  const [draftCreatedEnd, setDraftCreatedEnd] = useState('');
  const [draftUpdatedStart, setDraftUpdatedStart] = useState('');
  const [draftUpdatedEnd, setDraftUpdatedEnd] = useState('');

  const [modalMode, setModalMode] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successText, setSuccessText] = useState('');

  const codeOptions = useMemo(() => toOptions(data.map((r) => r.code)), [data]);
  const nameTHOptions = useMemo(() => toOptions(data.map((r) => r.nameTH)), [data]);
  const nameENOptions = useMemo(() => toOptions(data.map((r) => r.nameEN)), [data]);
  const createdByOptions = useMemo(() => toOptions(data.map((r) => r.createdBy)), [data]);

  const filterCount =
    (appliedCodes.length > 0 ? 1 : 0) +
    (appliedNameTH.length > 0 ? 1 : 0) +
    (appliedNameEN.length > 0 ? 1 : 0) +
    (appliedCreatedBy.length > 0 ? 1 : 0) +
    (appliedCreatedStart || appliedCreatedEnd ? 1 : 0) +
    (appliedUpdatedStart || appliedUpdatedEnd ? 1 : 0);

  const filtered = useMemo(() => {
    let rows = data;
    if (appliedCodes.length > 0) rows = rows.filter((r) => appliedCodes.includes(r.code));
    if (appliedNameTH.length > 0) rows = rows.filter((r) => appliedNameTH.includes(r.nameTH));
    if (appliedNameEN.length > 0) rows = rows.filter((r) => appliedNameEN.includes(r.nameEN));
    if (appliedCreatedBy.length > 0) rows = rows.filter((r) => appliedCreatedBy.includes(r.createdBy));
    if (appliedCreatedStart || appliedCreatedEnd) {
      rows = rows.filter((r) => isWithinDateRange(r.createdAt, appliedCreatedStart, appliedCreatedEnd));
    }
    if (appliedUpdatedStart || appliedUpdatedEnd) {
      rows = rows.filter((r) => isWithinDateRange(r.updatedAt, appliedUpdatedStart, appliedUpdatedEnd));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.nameTH.toLowerCase().includes(q) ||
          r.nameEN.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [
    data,
    search,
    appliedCodes,
    appliedNameTH,
    appliedNameEN,
    appliedCreatedBy,
    appliedCreatedStart,
    appliedCreatedEnd,
    appliedUpdatedStart,
    appliedUpdatedEnd,
  ]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'code':
          cmp = a.code.localeCompare(b.code);
          break;
        case 'nameTH':
          cmp = a.nameTH.localeCompare(b.nameTH);
          break;
        case 'nameEN':
          cmp = a.nameEN.localeCompare(b.nameEN);
          break;
        case 'allowEdit':
          cmp = Number(a.allowEdit) - Number(b.allowEdit);
          break;
        case 'carryForward':
          cmp = Number(a.carryForward) - Number(b.carryForward);
          break;
        case 'createdBy':
          cmp = a.createdBy.localeCompare(b.createdBy);
          break;
        case 'createdAt':
          cmp = parseDateTime(a.createdAt) - parseDateTime(b.createdAt);
          break;
        case 'updatedAt':
          cmp = parseDateTime(a.updatedAt) - parseDateTime(b.updatedAt);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = sorted.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function handleSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
  }

  function renderSortIcon(key) {
    if (sortKey !== key) return <SortAIcon />;
    return sortDir === 'asc' ? <SortBOutlineIcon /> : <SortBSolidIcon />;
  }

  function openFilterModal() {
    setDraftCodes(appliedCodes);
    setDraftNameTH(appliedNameTH);
    setDraftNameEN(appliedNameEN);
    setDraftCreatedBy(appliedCreatedBy);
    setDraftCreatedStart(appliedCreatedStart);
    setDraftCreatedEnd(appliedCreatedEnd);
    setDraftUpdatedStart(appliedUpdatedStart);
    setDraftUpdatedEnd(appliedUpdatedEnd);
    setFilterModalOpen(true);
  }

  function handleClearDraft() {
    setDraftCodes([]);
    setDraftNameTH([]);
    setDraftNameEN([]);
    setDraftCreatedBy([]);
    setDraftCreatedStart('');
    setDraftCreatedEnd('');
    setDraftUpdatedStart('');
    setDraftUpdatedEnd('');
  }

  function handleApplyFilter() {
    setAppliedCodes(draftCodes);
    setAppliedNameTH(draftNameTH);
    setAppliedNameEN(draftNameEN);
    setAppliedCreatedBy(draftCreatedBy);
    setAppliedCreatedStart(draftCreatedStart);
    setAppliedCreatedEnd(draftCreatedEnd);
    setAppliedUpdatedStart(draftUpdatedStart);
    setAppliedUpdatedEnd(draftUpdatedEnd);
    setPage(1);
    setFilterModalOpen(false);
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingRow(null);
    setDirty(false);
    setModalMode('add');
  }

  function openEdit(row) {
    setForm({ code: row.code, nameTH: row.nameTH, nameEN: row.nameEN, allowEdit: row.allowEdit, carryForward: row.carryForward });
    setErrors({});
    setEditingRow(row);
    setViewTarget(null);
    setDirty(false);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
  }

  function clearFieldError(key) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    clearFieldError(key);
  }

  function validate() {
    const e = {};
    if (!form.code.trim()) e.code = t('กรุณากรอกข้อมูล');
    if (!form.nameTH.trim()) e.nameTH = t('กรุณากรอกข้อมูล');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function isDuplicate() {
    const code = form.code.trim().toLowerCase();
    return data.some((r) => r.id !== editingRow?.id && r.code.trim().toLowerCase() === code);
  }

  function handleSubmit() {
    if (!validate()) return;
    if (isDuplicate()) {
      setDuplicateOpen(true);
      return;
    }
    const now = formatDateTime(new Date());
    if (modalMode === 'add') {
      const newRow = {
        id: `ag-${Date.now()}`,
        code: form.code.trim(),
        nameTH: form.nameTH.trim(),
        nameEN: form.nameEN.trim(),
        allowEdit: form.allowEdit,
        carryForward: form.carryForward,
        createdBy: CURRENT_USER,
        createdAt: now,
        updatedAt: now,
      };
      onChange([newRow, ...data]);
      setSuccessText(t('สร้างกลุ่มบัญชีสำเร็จ!'));
    } else if (modalMode === 'edit' && editingRow) {
      onChange(
        data.map((r) =>
          r.id === editingRow.id
            ? {
                ...r,
                code: form.code.trim(),
                nameTH: form.nameTH.trim(),
                nameEN: form.nameEN.trim(),
                allowEdit: form.allowEdit,
                carryForward: form.carryForward,
                updatedAt: now,
              }
            : r,
        ),
      );
      setSuccessText(t('บันทึกกลุ่มบัญชีสำเร็จ!'));
    }
    closeModal();
    setSuccessOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    onChange(data.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    setViewTarget(null);
    setDeleteSuccessOpen(true);
  }

  function handleDownload() {
    const header = [
      t('รหัสกลุ่มบัญชี'),
      tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'TH' }),
      tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'EN' }),
      t('อนุญาตให้ปรับปรุง'),
      t('ยกยอดระหว่างปี'),
      t('ผู้สร้าง'),
      t('วันที่สร้าง'),
      t('อัปเดตล่าสุด'),
    ];
    const escape = (v) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...sorted.map((r) =>
        [
          r.code,
          r.nameTH,
          r.nameEN,
          r.allowEdit ? t('อนุญาต') : t('ไม่อนุญาต'),
          r.carryForward ? t('ใช่') : t('ไม่ใช่'),
          r.createdBy,
          r.createdAt,
          r.updatedAt,
        ]
          .map(escape)
          .join(','),
      ),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account_group_${formatDateCompact(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('กลุ่มบัญชี')}</h1>
        <div className="ft-header-buttons">
          <button className="ft-btn-outline" onClick={handleDownload}>
            <DownloadIcon />
            {t('ดาวน์โหลด')}
          </button>
          <button className="ft-btn-primary" onClick={openAdd}>
            <PlusIcon />
            {t('สร้างกลุ่มบัญชี')}
          </button>
        </div>
      </div>

      <div className="ft-content-card">
        <div className="ft-search-filter">
          <div className="ft-search-input">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('ค้นหาด้วย รหัสกลุ่มบัญชี หรือ ชื่อกลุ่มบัญชี')}
            />
          </div>
          <button
            className={`ft-btn-filter${filterCount > 0 ? ' ft-btn-filter--active' : ''}`}
            onClick={openFilterModal}
          >
            <FilterIcon />
            {t('ตัวกรอง')}{filterCount > 0 ? ` (${filterCount})` : ''}
          </button>
        </div>

        <div className="ft-table-wrapper">
          <table className="ft-table">
            <colgroup>
              <col style={{ width: '130px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '130px' }} />
            </colgroup>
            <thead>
              <tr>
                <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {t('รหัสกลุ่มบัญชี')}
                    {renderSortIcon('code')}
                  </span>
                </th>
                <th onClick={() => handleSort('nameTH')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'TH' })}
                    {renderSortIcon('nameTH')}
                  </span>
                </th>
                <th onClick={() => handleSort('nameEN')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'EN' })}
                    {renderSortIcon('nameEN')}
                  </span>
                </th>
                <th onClick={() => handleSort('allowEdit')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {t('อนุญาตให้ปรับปรุง')}
                    {renderSortIcon('allowEdit')}
                  </span>
                </th>
                <th onClick={() => handleSort('carryForward')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {t('ยกยอดระหว่างปี')}
                    {renderSortIcon('carryForward')}
                  </span>
                </th>
                <th onClick={() => handleSort('createdBy')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {t('ผู้สร้าง')}
                    {renderSortIcon('createdBy')}
                  </span>
                </th>
                <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {t('วันที่สร้าง')}
                    {renderSortIcon('createdAt')}
                  </span>
                </th>
                <th onClick={() => handleSort('updatedAt')} style={{ cursor: 'pointer' }}>
                  <span className="sort-th-inner">
                    {t('อัปเดตล่าสุด')}
                    {renderSortIcon('updatedAt')}
                  </span>
                </th>
                <th className="ft-table-action-col"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr className="ft-empty-row">
                  <td colSpan={9}>{t('ไม่พบข้อมูล')}</td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.nameTH}</td>
                  <td>{row.nameEN}</td>
                  <td>{row.allowEdit ? t('อนุญาต') : t('ไม่อนุญาต')}</td>
                  <td>{row.carryForward ? t('ใช่') : t('ไม่ใช่')}</td>
                  <td>{row.createdBy}</td>
                  <td>{row.createdAt}</td>
                  <td>{row.updatedAt}</td>
                  <td className="ft-table-action-col">
                    <div className="ft-table-actions">
                      <button className="ft-action-btn" title={t('ดูรายละเอียด')} onClick={() => setViewTarget(row)}>
                        <ViewIcon />
                      </button>
                      <button className="ft-action-btn" title={t('แก้ไข')} onClick={() => openEdit(row)}>
                        <EditIcon />
                      </button>
                      <button className="ft-action-btn" title={t('ลบ')} onClick={() => setDeleteTarget(row)}>
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pageClamped}
          totalPages={totalPages}
          totalItems={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* FILTER MODAL */}
      {filterModalOpen && (
        <div className="modal-backdrop" onClick={() => setFilterModalOpen(false)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('ตัวกรอง')}</h3>
              <button className="modal-close" onClick={() => setFilterModalOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="filter-modal-body">
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('รหัสกลุ่มบัญชี')}</label>
                <MultiSelect values={draftCodes} onChange={setDraftCodes} options={codeOptions} />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'TH' })}</label>
                <MultiSelect values={draftNameTH} onChange={setDraftNameTH} options={nameTHOptions} />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'EN' })}</label>
                <MultiSelect values={draftNameEN} onChange={setDraftNameEN} options={nameENOptions} />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('ผู้สร้าง')}</label>
                <MultiSelect values={draftCreatedBy} onChange={setDraftCreatedBy} options={createdByOptions} />
              </div>
              <div className="aft-form-row">
                <div className="aft-form-field">
                  <label className="aft-form-label">{t('วันที่เพิ่ม (เริ่มต้น - สิ้นสุด)')}</label>
                  <DateRangePicker
                    startValue={draftCreatedStart}
                    endValue={draftCreatedEnd}
                    onChange={(s, e) => {
                      setDraftCreatedStart(s);
                      setDraftCreatedEnd(e);
                    }}
                  />
                </div>
                <div className="aft-form-field">
                  <label className="aft-form-label">{t('วันที่อัปเดตล่าสุด (เริ่มต้น - สิ้นสุด)')}</label>
                  <DateRangePicker
                    startValue={draftUpdatedStart}
                    endValue={draftUpdatedEnd}
                    onChange={(s, e) => {
                      setDraftUpdatedStart(s);
                      setDraftUpdatedEnd(e);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ft-btn-outline" onClick={handleClearDraft}>
                {t('ล้างการค้นหา')}
              </button>
              <button className="ft-btn-primary" onClick={handleApplyFilter}>
                {t('ค้นหา')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalMode && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'add' ? t('สร้างกลุ่มบัญชี') : t('แก้ไขกลุ่มบัญชี')}</h3>
              <button className="modal-close" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label className="aft-form-label">
                  {t('รหัสกลุ่มบัญชี')} <span className="aft-required">*</span>
                </label>
                <input
                  className={`modal-input${errors.code ? ' modal-input--error' : ''}`}
                  value={form.code}
                  placeholder={t('กรุณากรอก')}
                  onChange={(e) => updateForm('code', e.target.value)}
                />
                {errors.code && <span className="field-error">{errors.code}</span>}
              </div>
              <div className="modal-field">
                <label className="aft-form-label">
                  {tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'TH' })} <span className="aft-required">*</span>
                </label>
                <input
                  className={`modal-input${errors.nameTH ? ' modal-input--error' : ''}`}
                  value={form.nameTH}
                  placeholder={t('กรุณากรอก')}
                  onChange={(e) => updateForm('nameTH', e.target.value)}
                />
                {errors.nameTH && <span className="field-error">{errors.nameTH}</span>}
              </div>
              <div className="modal-field">
                <label className="aft-form-label">{tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'EN' })}</label>
                <input
                  className="modal-input"
                  value={form.nameEN}
                  placeholder={t('กรุณากรอก')}
                  onChange={(e) => updateForm('nameEN', e.target.value)}
                />
              </div>
              <div className="aft-form-row">
                <div className="aft-form-field">
                  <label className="aft-form-label">
                    {t('อนุญาตให้ปรับปรุง')} <span className="aft-required">*</span>
                  </label>
                  <div className="aft-radio-group">
                    <label className="aft-radio-option">
                      <input
                        type="radio"
                        checked={form.allowEdit === true}
                        onChange={() => updateForm('allowEdit', true)}
                      />
                      {t('อนุญาต')}
                    </label>
                    <label className="aft-radio-option">
                      <input
                        type="radio"
                        checked={form.allowEdit === false}
                        onChange={() => updateForm('allowEdit', false)}
                      />
                      {t('ไม่อนุญาต')}
                    </label>
                  </div>
                </div>
                <div className="aft-form-field">
                  <label className="aft-form-label">
                    {t('ยกยอดระหว่างปี')} <span className="aft-required">*</span>
                  </label>
                  <div className="aft-radio-group">
                    <label className="aft-radio-option">
                      <input
                        type="radio"
                        checked={form.carryForward === true}
                        onChange={() => updateForm('carryForward', true)}
                      />
                      {t('ใช่')}
                    </label>
                    <label className="aft-radio-option">
                      <input
                        type="radio"
                        checked={form.carryForward === false}
                        onChange={() => updateForm('carryForward', false)}
                      />
                      {t('ไม่ใช่')}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="ft-btn-outline" onClick={closeModal}>
                {t('ยกเลิก')}
              </button>
              <button
                className="ft-btn-primary"
                onClick={handleSubmit}
                disabled={modalMode === 'edit' && !dirty}
              >
                {modalMode === 'add' ? t('สร้าง') : t('บันทึก')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewTarget && (
        <div className="modal-backdrop" onClick={() => setViewTarget(null)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('รายละเอียดกลุ่มบัญชี')}</h3>
              <button className="modal-close" onClick={() => setViewTarget(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="view-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="view-detail-field">
                  <span className="view-detail-label">{t('รหัสกลุ่มบัญชี')}</span>
                  <span className="view-detail-value">{viewTarget.code}</span>
                </div>
                <div className="view-detail-field">
                  <span className="view-detail-label">{tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'TH' })}</span>
                  <span className="view-detail-value">{viewTarget.nameTH}</span>
                </div>
                <div className="view-detail-field">
                  <span className="view-detail-label">{tv('ชื่อกลุ่มบัญชี ({lang})', { lang: 'EN' })}</span>
                  <span className="view-detail-value">{viewTarget.nameEN}</span>
                </div>
              </div>
              <div className="view-detail-grid" style={{ marginTop: '8px' }}>
                <div className="view-detail-field">
                  <span className="view-detail-label">{t('อนุญาตให้ปรับปรุง')}</span>
                  <span className="view-detail-value">{viewTarget.allowEdit ? t('อนุญาต') : t('ไม่อนุญาต')}</span>
                </div>
                <div className="view-detail-field">
                  <span className="view-detail-label">{t('ยกยอดระหว่างปี')}</span>
                  <span className="view-detail-value">{viewTarget.carryForward ? t('ใช่') : t('ไม่ใช่')}</span>
                </div>
              </div>
              <div className="aft-divider" />
              <div className="view-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="view-detail-field">
                  <span className="view-detail-label">{t('ผู้สร้าง')}</span>
                  <span className="view-detail-value">{viewTarget.createdBy}</span>
                </div>
              </div>
              <div className="view-detail-grid" style={{ marginTop: '8px' }}>
                <div className="view-detail-field">
                  <span className="view-detail-label">{t('วันที่สร้าง')}</span>
                  <span className="view-detail-value">{viewTarget.createdAt}</span>
                </div>
                <div className="view-detail-field">
                  <span className="view-detail-label">{t('อัปเดตล่าสุด')}</span>
                  <span className="view-detail-value">{viewTarget.updatedAt}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="ft-btn-text" onClick={() => setViewTarget(null)}>
                {t('ปิดหน้าต่างนี้')}
              </button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="ft-btn-outline-danger" onClick={() => setDeleteTarget(viewTarget)}>
                  <DeleteIcon color="#D92D20" />
                  {t('ลบ')}
                </button>
                <button className="ft-btn-outline" onClick={() => openEdit(viewTarget)}>
                  <EditIcon color="#074E9F" />
                  {t('แก้ไข')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        variant="delete"
        title={t('คุณต้องการลบกลุ่มบัญชีนี้ใช่ไหม?')}
        message={t('หากลบแล้ว จะไม่สามารถเรียกคืนได้อีก')}
        onClose={() => setDeleteTarget(null)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setDeleteTarget(null) },
          { label: t('ลบ'), variant: 'danger', onClick: handleDelete },
        ]}
      />

      <Dialog
        open={deleteSuccessOpen}
        variant="success"
        title={t('ลบกลุ่มบัญชีสำเร็จ!')}
        autoCloseMs={3000}
        onClose={() => setDeleteSuccessOpen(false)}
      />

      <Dialog
        open={duplicateOpen}
        variant="error"
        title={t('ไม่สามารถบันทึกข้อมูลได้')}
        message={tv('{label}นี้มีอยู่ในระบบแล้ว กรุณาใช้ค่าอื่น', { label: t('รหัสกลุ่มบัญชี') })}
        onClose={() => setDuplicateOpen(false)}
        actions={[{ label: t('ยอมรับ'), variant: 'primary', onClick: () => setDuplicateOpen(false) }]}
      />

      <Dialog
        open={successOpen}
        variant="success"
        title={successText}
        autoCloseMs={3000}
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
}
