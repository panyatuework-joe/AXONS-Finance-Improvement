import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import MultiSelect from '../components/MultiSelect';
import { WRITEOFF_CATEGORY_OPTIONS } from '../data';
import {
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
  SortAIcon,
  SortBOutlineIcon,
  SortBSolidIcon,
  ViewIcon,
  FileImportIcon,
} from '../icons';

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_OPTIONS = ['ระหว่างดำเนินการ', 'แบบร่าง', 'หยุดชั่วคราว', 'ยกเลิก', 'เสร็จสิ้น'];

export default function GlWriteoffListPage({ data, onCreate, onView, onImportClick }) {
  const { pushToast, t, tv } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  const [appliedStatuses, setAppliedStatuses] = useState([]);
  const [appliedCategories, setAppliedCategories] = useState([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState([]);
  const [draftCategories, setDraftCategories] = useState([]);

  const filterCount = appliedStatuses.length + appliedCategories.length;

  const filtered = useMemo(() => {
    let rows = data.filter((row) => {
      if (appliedStatuses.length > 0 && !appliedStatuses.includes(row.status)) return false;
      if (appliedCategories.length > 0 && !appliedCategories.includes(row.category)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesCode = row.code.toLowerCase().includes(q);
        const matchesDescription = t(row.description).toLowerCase().includes(q);
        if (!matchesCode && !matchesDescription) return false;
      }
      return true;
    });
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'th');
        return sortAsc ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, sortKey, sortAsc, appliedStatuses, appliedCategories, t]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  function handleSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortAsc(true);
    } else if (sortAsc) {
      setSortAsc(false);
    } else {
      setSortKey(null);
      setSortAsc(true);
    }
  }

  function renderSortIcon(key) {
    if (sortKey !== key) return <SortAIcon />;
    return sortAsc ? <SortBOutlineIcon /> : <SortBSolidIcon />;
  }

  function openFilterModal() {
    setDraftStatuses(appliedStatuses);
    setDraftCategories(appliedCategories);
    setFilterModalOpen(true);
  }

  function handleApplyFilter() {
    setAppliedStatuses(draftStatuses);
    setAppliedCategories(draftCategories);
    setPage(1);
    setFilterModalOpen(false);
  }

  function removeAppliedChip(kind, value) {
    if (kind === 'status') setAppliedStatuses((prev) => prev.filter((v) => v !== value));
    if (kind === 'category') setAppliedCategories((prev) => prev.filter((v) => v !== value));
    setPage(1);
  }

  function handleClearAllApplied() {
    setAppliedStatuses([]);
    setAppliedCategories([]);
    setPage(1);
  }

  function handleDownload() {
    const header = [t('รหัสรายการตัดบัญชี'), t('รายละเอียด'), t('บริษัท'), t('สถานะ')];
    const escape = (v) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filtered.map((r) => [r.code, t(r.description), t(r.company), t(r.status)].map(escape).join(',')),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('รายการตัดบัญชี.csv');
    a.click();
    URL.revokeObjectURL(url);
    pushToast(t('ดาวน์โหลดไฟล์สำเร็จ'), 'success');
  }

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('จัดการรายการบัญชีประจำ')}</h1>
        <div className="ft-header-buttons">
          <button className="ft-btn-outline" onClick={handleDownload}>
            <DownloadIcon />
            {t('ดาวน์โหลด')}
          </button>
          <button className="ft-btn-outline" onClick={onImportClick}>
            <FileImportIcon />
            {t('นำเข้าไฟล์รายการบัญชีประจำ')}
          </button>
          <button className="ft-btn-primary" onClick={onCreate}>
            <PlusIcon />
            {t('สร้างรายการบัญชีประจำ')}
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
              placeholder={t('ค้นหาด้วย รหัส หรือ รายละเอียด')}
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
              {appliedStatuses.map((v) => (
                <span className="filter-chip" key={`st-${v}`}>
                  {t(v)}
                  <button type="button" onClick={() => removeAppliedChip('status', v)}>
                    <CloseIcon size={12} color="var(--color-base-white)" />
                  </button>
                </span>
              ))}
              {appliedCategories.map((v) => (
                <span className="filter-chip" key={`cat-${v}`}>
                  {t(v)}
                  <button type="button" onClick={() => removeAppliedChip('category', v)}>
                    <CloseIcon size={12} color="var(--color-base-white)" />
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
                  <col style={{ width: '204px' }} />
                  <col style={{ width: '365px' }} />
                  <col style={{ width: '259px' }} />
                  <col style={{ width: '231px' }} />
                  <col style={{ width: '253px' }} />
                  <col style={{ width: '148px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '109px' }} />
                  <col style={{ width: '171px' }} />
                  <col style={{ width: '193px' }} />
                  <col style={{ width: '129px' }} />
                  <col style={{ width: '231px' }} />
                </colgroup>
                <thead>
                  <tr>
                    {(
                      [
                        ['code', 'รหัส'],
                        ['description', 'รายละเอียด'],
                        ['company', 'บริษัท'],
                        ['dept', 'หน่วยงานหลัก'],
                        ['subDept', 'หน่วยงานย่อย'],
                        ['category', 'ประเภท'],
                      ]
                    ).map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                        <span className="sort-th-inner">
                          {t(label)}
                          {renderSortIcon(key)}
                        </span>
                      </th>
                    ))}
                    <th onClick={() => handleSort('totalAmount')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                      <span className="sort-th-inner" style={{ justifyContent: 'flex-end' }}>
                        {t('ยอดรวม')}
                        {renderSortIcon('totalAmount')}
                      </span>
                    </th>
                    <th>{t('ความคืบหน้า')}</th>
                    {(
                      [
                        ['startDate', 'วันที่เริ่มดำเนินการ'],
                        ['createdBy', 'ผู้สร้าง'],
                        ['createdAt', 'วันที่สร้าง'],
                      ]
                    ).map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                        <span className="sort-th-inner">
                          {t(label)}
                          {renderSortIcon(key)}
                        </span>
                      </th>
                    ))}
                    <th className="ft-table-status-col">{t('สถานะ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.code}</td>
                      <td>{t(row.description)}</td>
                      <td>{t(row.company)}</td>
                      <td>{t(row.dept)}</td>
                      <td>{t(row.subDept)}</td>
                      <td>{t(row.category)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(row.totalAmount)}</td>
                      <td>
                        {row.installmentsPaid}/{row.installments}
                      </td>
                      <td>{row.startDate}</td>
                      <td>{row.createdBy}</td>
                      <td>{row.createdAt}</td>
                      <td className="ft-table-status-col">
                        <div className="glw-status-cell">
                          <StatusBadge value={row.status} />
                          <button
                            className="ft-action-btn"
                            title={t('รายละเอียด')}
                            onClick={() => onView(row.id)}
                          >
                            <ViewIcon />
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
                <label className="aft-form-label">{t('สถานะ')}</label>
                <MultiSelect
                  values={draftStatuses}
                  onChange={setDraftStatuses}
                  options={STATUS_OPTIONS.map((s) => ({ value: s, label: t(s) }))}
                />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('ประเภท')}</label>
                <MultiSelect
                  values={draftCategories}
                  onChange={setDraftCategories}
                  options={WRITEOFF_CATEGORY_OPTIONS.map((c) => ({ value: c, label: t(c) }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="ft-btn-outline"
                onClick={() => {
                  setDraftStatuses([]);
                  setDraftCategories([]);
                }}
              >
                {t('ล้างตัวกรอง')}
              </button>
              <button className="ft-btn-primary" onClick={handleApplyFilter}>
                {t('ค้นหา')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
