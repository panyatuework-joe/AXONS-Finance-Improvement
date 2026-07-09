import { useMemo, useState } from 'react';
import { DEPT_OPTIONS, ACCOUNT_OPTIONS } from '../data';
import { useApp } from '../context/AppContext';
import Select from '../components/Select';
import MultiSelect from '../components/MultiSelect';
import Pagination from '../components/Pagination';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import {
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  ViewIcon,
  EditIcon,
  DeleteIcon,
  CloseIcon,
} from '../icons';

export default function FinancialTargetPage({ data, onChange, onAdd, onView, onEdit }) {
  const { pushToast, t, tv } = useApp();
  const [year, setYear] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

  // Applied filter values (actually used to filter the table)
  const [appliedDepts, setAppliedDepts] = useState([]);
  const [appliedSubDepts, setAppliedSubDepts] = useState([]);
  const [appliedAccountCodes, setAppliedAccountCodes] = useState([]);

  // Draft values edited inside the filter modal (committed on "ค้นหา")
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftDepts, setDraftDepts] = useState([]);
  const [draftSubDepts, setDraftSubDepts] = useState([]);
  const [draftAccountCodes, setDraftAccountCodes] = useState([]);

  const years = useMemo(() => Array.from(new Set(data.map((d) => d.year))).sort(), [data]);
  const subDeptOptions = useMemo(() => Array.from(new Set(data.map((d) => d.subDept))).sort(), [data]);

  const filterCount = appliedDepts.length + appliedSubDepts.length + appliedAccountCodes.length;

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (year !== 'all' && row.year !== year) return false;
      if (appliedDepts.length > 0 && !appliedDepts.includes(row.dept)) return false;
      if (appliedSubDepts.length > 0 && !appliedSubDepts.includes(row.subDept)) return false;
      if (appliedAccountCodes.length > 0 && !appliedAccountCodes.includes(row.accountCode)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !row.dept.toLowerCase().includes(q) &&
          !row.subDept.toLowerCase().includes(q) &&
          !row.accountCode.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [data, year, appliedDepts, appliedSubDepts, appliedAccountCodes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  function openFilterModal() {
    setDraftDepts(appliedDepts);
    setDraftSubDepts(appliedSubDepts);
    setDraftAccountCodes(appliedAccountCodes);
    setFilterModalOpen(true);
  }

  function handleClearDraft() {
    setDraftDepts([]);
    setDraftSubDepts([]);
    setDraftAccountCodes([]);
  }

  function handleApplyFilter() {
    setAppliedDepts(draftDepts);
    setAppliedSubDepts(draftSubDepts);
    setAppliedAccountCodes(draftAccountCodes);
    setPage(1);
    setFilterModalOpen(false);
  }

  function handleClearAllApplied() {
    setAppliedDepts([]);
    setAppliedSubDepts([]);
    setAppliedAccountCodes([]);
    setPage(1);
  }

  function removeAppliedChip(kind, value) {
    if (kind === 'dept') setAppliedDepts((prev) => prev.filter((v) => v !== value));
    if (kind === 'subDept') setAppliedSubDepts((prev) => prev.filter((v) => v !== value));
    if (kind === 'accountCode') setAppliedAccountCodes((prev) => prev.filter((v) => v !== value));
    setPage(1);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    onChange(data.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteSuccessOpen(true);
  }

  function handleDownload() {
    const header = [t('ปีงบการเงิน'), t('หน่วยงานหลัก'), t('หน่วยงานย่อย'), t('กลุ่มบัญชี')];
    const escape = (v) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filtered.map((r) => [r.year, t(r.dept), t(r.subDept), t(r.accountCode)].map(escape).join(',')),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('เป้าหมายงบการเงิน.csv');
    a.click();
    URL.revokeObjectURL(url);
    pushToast(t('ดาวน์โหลดไฟล์สำเร็จ'), 'success');
  }

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('เป้าหมายงบการเงิน')}</h1>
        <div className="ft-header-buttons">
          <button className="ft-btn-outline" onClick={handleDownload}>
            <DownloadIcon />
            {t('ดาวน์โหลด')}
          </button>
          <button className="ft-btn-primary" onClick={onAdd}>
            <PlusIcon />
            {t('เพิ่มเป้าหมายงบการเงิน')}
          </button>
        </div>
      </div>

      <div className="ft-content-card">
        <div className="ft-search-filter">
          <div className="ft-year-select">
            <span className="ft-year-label">{t('ปีงบการเงิน')}</span>
            <Select
              value={year}
              onChange={(v) => {
                setYear(v);
                setPage(1);
              }}
              options={[{ value: 'all', label: t('ทั้งหมด') }, ...years.map((y) => ({ value: y, label: y }))]}
            />
          </div>
          <div className="ft-search-input">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('ค้นหาด้วย หน่วยงานหลัก หน่วยงานย่อย หรือ กลุ่มบัญชี')}
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

        {filterCount > 0 && (
          <>
            <div className="filter-chip-row">
              {appliedDepts.map((v) => (
                <span className="filter-chip" key={`dept-${v}`}>
                  {t(v)}
                  <button type="button" onClick={() => removeAppliedChip('dept', v)}>
                    <CloseIcon size={12} color="#ffffff" />
                  </button>
                </span>
              ))}
              {appliedSubDepts.map((v) => (
                <span className="filter-chip" key={`subdept-${v}`}>
                  {t(v)}
                  <button type="button" onClick={() => removeAppliedChip('subDept', v)}>
                    <CloseIcon size={12} color="#ffffff" />
                  </button>
                </span>
              ))}
              {appliedAccountCodes.map((v) => (
                <span className="filter-chip" key={`acc-${v}`}>
                  {t(v)}
                  <button type="button" onClick={() => removeAppliedChip('accountCode', v)}>
                    <CloseIcon size={12} color="#ffffff" />
                  </button>
                </span>
              ))}
              <button type="button" className="filter-clear-all" onClick={handleClearAllApplied}>
                {t('ล้างทั้งหมด')}
              </button>
            </div>
            <div className="filter-result-count">{tv('ผลลัพธ์การค้นหา: {count}', { count: filtered.length })}</div>
          </>
        )}

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="ft-table-wrapper">
              <table className="ft-table">
                <colgroup>
                  <col className="ft-col-year" />
                  <col className="ft-col-dept" />
                  <col className="ft-col-subdept" />
                  <col className="ft-col-code" />
                  <col className="ft-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('ปีงบการเงิน')}</th>
                    <th>{t('หน่วยงานหลัก')}</th>
                    <th>{t('หน่วยงานย่อย')}</th>
                    <th>{t('กลุ่มบัญชี')}</th>
                    <th className="ft-table-action-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.year}</td>
                      <td>{t(row.dept)}</td>
                      <td>{t(row.subDept)}</td>
                      <td>{t(row.accountCode)}</td>
                      <td className="ft-table-action-col">
                        <div className="ft-table-actions">
                          <button className="ft-action-btn" title={t('ดูรายละเอียด')} onClick={() => onView(row.id)}>
                            <ViewIcon />
                          </button>
                          <button className="ft-action-btn" title={t('แก้ไข')} onClick={() => onEdit(row.id)}>
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
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </div>

      {filterModalOpen && (
        <div className="modal-backdrop" onClick={() => setFilterModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('ตัวกรอง')}</h3>
              <button className="modal-close" onClick={() => setFilterModalOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="filter-modal-body">
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('หน่วยงานหลัก')}</label>
                <MultiSelect
                  values={draftDepts}
                  onChange={setDraftDepts}
                  options={DEPT_OPTIONS.map((d) => ({ value: d, label: t(d) }))}
                />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('หน่วยงานย่อย')}</label>
                <MultiSelect
                  values={draftSubDepts}
                  onChange={setDraftSubDepts}
                  options={subDeptOptions.map((d) => ({ value: d, label: t(d) }))}
                />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('กลุ่มบัญชี')}</label>
                <MultiSelect
                  values={draftAccountCodes}
                  onChange={setDraftAccountCodes}
                  options={ACCOUNT_OPTIONS.map((a) => ({ value: a, label: t(a) }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="ft-btn-outline" onClick={handleClearDraft}>
                {t('ล้างตัวกรอง')}
              </button>
              <button className="ft-btn-primary" onClick={handleApplyFilter}>
                {t('ค้นหา')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        variant="delete"
        title={t('คุณต้องการลบเป้าหมายงบการเงินนี้ใช่ไหม?')}
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
        title={t('ลบเป้าหมายงบการเงินสำเร็จ!')}
        autoCloseMs={3000}
        onClose={() => setDeleteSuccessOpen(false)}
      />
    </>
  );
}
