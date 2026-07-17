import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import Dialog from '../components/Dialog';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import MultiSelect from '../components/MultiSelect';
import { THAI_MONTH_OPTIONS, START_PERIOD_OPTIONS } from '../data';
import { buildGlWriteoffSchedule, glWriteoffPerPeriodAmount } from '../utils';
import {
  DownloadIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
  ViewIcon,
  SortAIcon,
  SortBOutlineIcon,
  SortBSolidIcon,
  FileDocIcon,
  HistoryOutlineIcon,
  ErrorCircleSolidIcon,
} from '../icons';

const ACTIVE_STATUSES = ['ระหว่างดำเนินการ', 'หยุดชั่วคราว'];
const MONTH_STATUS_OPTIONS = ['รอดำเนินการตัดบัญชี'];
const HISTORY_STATUS_OPTIONS = ['ตัดบัญชีสำเร็จ', 'ตัดบัญชีไม่สำเร็จ'];
const PROCESS_FAIL_RATE = 0.1;

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// งวดที่ 1 อาจมีเศษทศนิยมสะสมอยู่ (ดู buildGlWriteoffSchedule) จึงต้องอ้างอิงยอดจากงวดที่กำลังจะตัดจริง
// แทนการใช้ยอดต่องวดแบบเฉลี่ย (glWriteoffPerPeriodAmount) ซึ่งปัดเศษทิ้งเสมอ
function nextInstallmentAmount(row) {
  const schedule = buildGlWriteoffSchedule(row.totalAmount, row.installments, row.startPeriod);
  return schedule[row.installmentsPaid]?.amount ?? glWriteoffPerPeriodAmount(row.totalAmount, row.installments);
}

function periodLabel(period) {
  const [mm, yyyy] = period.split('/');
  const monthName = THAI_MONTH_OPTIONS[parseInt(mm, 10) - 1] ?? mm;
  return `${monthName} ${yyyy}`;
}

function historyStatus(row) {
  return row.status === 'ยกเลิก' ? 'ตัดบัญชีไม่สำเร็จ' : 'ตัดบัญชีสำเร็จ';
}

export default function GlWriteoffMonthlyPage({ data, onView, onProcessBatch }) {
  const { pushToast, t, tv } = useApp();
  const [tab, setTab] = useState('month');
  const [period, setPeriod] = useState(START_PERIOD_OPTIONS[0]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);

  const [appliedStatuses, setAppliedStatuses] = useState([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState([]);

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [processResult, setProcessResult] = useState({ succeeded: [], failed: [] });

  const monthRows = useMemo(
    () => data.filter((row) => row.startPeriod === period && ACTIVE_STATUSES.includes(row.status)),
    [data, period],
  );

  const baseRows = tab === 'month' ? monthRows : data;

  const filtered = useMemo(() => {
    let rows = baseRows.filter((row) => {
      if (appliedStatuses.length > 0) {
        const statusValue = tab === 'history' ? historyStatus(row) : 'รอดำเนินการตัดบัญชี';
        if (!appliedStatuses.includes(statusValue)) return false;
      }
      const q = search.trim().toLowerCase();
      if (q && !row.code.toLowerCase().includes(q) && !row.description.toLowerCase().includes(q)) return false;
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
  }, [baseRows, appliedStatuses, search, sortKey, sortAsc, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  const allPageSelected = tab === 'month' && pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

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

  function switchTab(next) {
    setTab(next);
    setPage(1);
    setSearch('');
    setAppliedStatuses([]);
    setSortKey(null);
    setSortAsc(true);
    setSelectedIds(new Set());
  }

  function openFilterModal() {
    setDraftStatuses(appliedStatuses);
    setFilterModalOpen(true);
  }

  function handleApplyFilter() {
    setAppliedStatuses(draftStatuses);
    setPage(1);
    setFilterModalOpen(false);
  }

  function handleDownload() {
    const header = [t('รหัสรายการตัดบัญชี'), t('รายละเอียด'), t('บริษัท'), t('หน่วยงานหลัก'), t('สถานะ')];
    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...filtered.map((r) =>
        [r.code, t(r.description), t(r.company), t(r.dept), tab === 'month' ? t('รอดำเนินการตัดบัญชี') : t(historyStatus(r))].map(escape).join(','),
      ),
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

  function toggleRowSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRows.forEach((r) => next.delete(r.id));
      } else {
        pageRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  const selectedRows = useMemo(
    () => monthRows.filter((r) => selectedIds.has(r.id)),
    [monthRows, selectedIds],
  );

  function handleConfirmProcess() {
    setConfirmOpen(false);
    const succeeded = [];
    const failed = [];
    selectedRows.forEach((row) => {
      if (Math.random() < PROCESS_FAIL_RATE) failed.push(row);
      else succeeded.push(row);
    });
    if (succeeded.length > 0) onProcessBatch(succeeded);
    setProcessResult({ succeeded, failed });
    setSelectedIds(new Set());
    setResultOpen(true);
  }

  const resultHasFailures = processResult.failed.length > 0;

  function handleViewHistory() {
    setResultOpen(false);
    switchTab('history');
  }

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('รายการตัดบัญชี')}</h1>
        <div className="ft-header-buttons">
          <div className="ft-year-select glw-period-select">
            <span className="ft-year-label">{t('งวดบัญชี')}</span>
            <Select
              value={period}
              onChange={(v) => {
                setPeriod(v);
                setPage(1);
                setSelectedIds(new Set());
              }}
              options={START_PERIOD_OPTIONS.map((p) => ({ value: p, label: periodLabel(p) }))}
            />
          </div>
          <button className="ft-btn-outline" onClick={handleDownload}>
            <DownloadIcon />
            {t('ดาวน์โหลด')}
          </button>
          <button
            className="ft-btn-primary"
            onClick={() => {
              if (selectedIds.size === 0) {
                pushToast(t('กรุณาเลือกรายการตัดบัญชีที่ต้องการ'), 'error');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            <FileDocIcon size={20} color="var(--color-base-white)" />
            {t('ดำเนินการตัดบัญชี')}
          </button>
        </div>
      </div>

      <div className="ft-content-card">
        <div className="glw-tabs">
          <button
            type="button"
            className={`glw-tab${tab === 'month' ? ' glw-tab--active' : ''}`}
            onClick={() => switchTab('month')}
          >
            <FileDocIcon size={20} color={tab === 'month' ? 'var(--color-primary-default)' : 'var(--color-text-normal)'} />
            {t('รายการตัดบัญชีเดือนนี้')}
          </button>
          <button
            type="button"
            className={`glw-tab${tab === 'history' ? ' glw-tab--active' : ''}`}
            onClick={() => switchTab('history')}
          >
            <HistoryOutlineIcon color={tab === 'history' ? 'var(--color-primary-default)' : 'var(--color-text-normal)'} />
            {t('ประวัติการตัดบัญชีทั้งหมด')}
          </button>
        </div>

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
              placeholder={t('ค้นหาด้วยรหัสรายการตัดบัญชี หรือ รายละเอียดการตัดบัญชี')}
            />
          </div>
          <button
            className={`ft-btn-filter${appliedStatuses.length > 0 ? ' ft-btn-filter--active' : ''}`}
            onClick={openFilterModal}
          >
            <FilterIcon />
            {t('ตัวกรอง')}{appliedStatuses.length > 0 ? ` (${appliedStatuses.length})` : ''}
          </button>
        </div>

        {appliedStatuses.length > 0 && (
          <>
            <div className="filter-chip-row">
              {appliedStatuses.map((v) => (
                <span className="filter-chip" key={v}>
                  {t(v)}
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedStatuses((prev) => prev.filter((s) => s !== v));
                      setPage(1);
                    }}
                  >
                    <CloseIcon size={12} color="var(--color-base-white)" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="filter-clear-all"
                onClick={() => {
                  setAppliedStatuses([]);
                  setPage(1);
                }}
              >
                {t('ล้างทั้งหมด')}
              </button>
            </div>
            <div className="filter-result-count">{tv('ผลลัพธ์การค้นหา: {count}', { count: filtered.length })}</div>
          </>
        )}

        {filtered.length === 0 ? (
          <EmptyState />
        ) : tab === 'month' ? (
          <>
            <div className="ft-table-wrapper">
              <table className="ft-table">
                <colgroup>
                  <col style={{ width: '64px' }} />
                  <col style={{ width: '204px' }} />
                  <col style={{ width: '365px' }} />
                  <col style={{ width: '259px' }} />
                  <col style={{ width: '231px' }} />
                  <col style={{ width: '253px' }} />
                  <col style={{ width: '148px' }} />
                  <col style={{ width: '109px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '263px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="ft-table-checkbox-col">
                      <input
                        type="checkbox"
                        className="process-modal-checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAllOnPage}
                      />
                    </th>
                    <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                      <span className="sort-th-inner">
                        {t('รหัสรายการตัดบัญชี')}
                        {renderSortIcon('code')}
                      </span>
                    </th>
                    <th>{t('รายละเอียด')}</th>
                    {[
                      ['company', 'บริษัท'],
                      ['dept', 'หน่วยงานหลัก'],
                      ['subDept', 'หน่วยงานย่อย'],
                      ['category', 'ประเภท'],
                    ].map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                        <span className="sort-th-inner">
                          {t(label)}
                          {renderSortIcon(key)}
                        </span>
                      </th>
                    ))}
                    <th onClick={() => handleSort('installmentsPaid')} style={{ cursor: 'pointer' }}>
                      <span className="sort-th-inner">
                        {t('งวดที่')}
                        {renderSortIcon('installmentsPaid')}
                      </span>
                    </th>
                    <th>{t('จำนวนเงิน')}</th>
                    <th className="ft-table-status-col">{t('สถานะ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td className="ft-table-checkbox-col">
                        <input
                          type="checkbox"
                          className="process-modal-checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRowSelected(row.id)}
                        />
                      </td>
                      <td>{row.code}</td>
                      <td>{t(row.description)}</td>
                      <td>{t(row.company)}</td>
                      <td>{t(row.dept)}</td>
                      <td>{t(row.subDept)}</td>
                      <td>{t(row.category)}</td>
                      <td>
                        {row.installmentsPaid}/{row.installments}
                      </td>
                      <td>{formatMoney(nextInstallmentAmount(row))}</td>
                      <td className="ft-table-status-col">
                        <div className="glw-status-cell">
                          <StatusBadge value="รอดำเนินการตัดบัญชี" />
                          <button className="ft-action-btn" title={t('รายละเอียด')} onClick={() => onView(row.id)}>
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
              pageSizeOptions={[10, 25, 50]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        ) : (
          <>
            <div className="ft-table-wrapper">
              <table className="ft-table">
                <colgroup>
                  <col style={{ width: '204px' }} />
                  <col style={{ width: '259px' }} />
                  <col style={{ width: '365px' }} />
                  <col style={{ width: '148px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '109px' }} />
                  <col style={{ width: '193px' }} />
                  <col style={{ width: '164px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('code')} style={{ cursor: 'pointer' }}>
                      <span className="sort-th-inner">
                        {t('รหัสรายการตัดบัญชี')}
                        {renderSortIcon('code')}
                      </span>
                    </th>
                    <th onClick={() => handleSort('company')} style={{ cursor: 'pointer' }}>
                      <span className="sort-th-inner">
                        {t('บริษัท')}
                        {renderSortIcon('company')}
                      </span>
                    </th>
                    <th>{t('รายละเอียด')}</th>
                    <th>{t('หน่วยงานหลัก')}</th>
                    <th>{t('หน่วยงานย่อย')}</th>
                    <th>{t('ประเภท')}</th>
                    <th>{t('งวด')}</th>
                    <th>{t('วันที่เริ่มตัดบัญชี')}</th>
                    <th className="ft-table-status-col">{t('สถานะ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.code}</td>
                      <td>{t(row.company)}</td>
                      <td>{t(row.description)}</td>
                      <td>{t(row.dept)}</td>
                      <td>{t(row.subDept)}</td>
                      <td>{t(row.category)}</td>
                      <td>
                        {row.installmentsPaid}/{row.installments}
                      </td>
                      <td>{row.startDate}</td>
                      <td className="ft-table-status-col">
                        <div className="glw-status-cell">
                          <StatusBadge value={historyStatus(row)} />
                          <button className="ft-action-btn" title={t('รายละเอียด')} onClick={() => onView(row.id)}>
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
              pageSizeOptions={[10, 25, 50]}
              onPageSizeChange={(size) => {
                setPageSize(size);
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
            <div className="modal-body">
              <div className="aft-form-field">
                <label className="aft-form-label">{t('สถานะ')}</label>
                <MultiSelect
                  values={draftStatuses}
                  onChange={setDraftStatuses}
                  options={(tab === 'month' ? MONTH_STATUS_OPTIONS : HISTORY_STATUS_OPTIONS).map((s) => ({
                    value: s,
                    label: t(s),
                  }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="ft-btn-outline" onClick={() => setDraftStatuses([])}>
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
        open={confirmOpen}
        variant="process"
        title={t('คุณต้องการดำเนินการตัดบัญชีต่อไปนี้ใช่ไหม?')}
        message={tv('ดำเนินการตัดบัญชีทั้งหมด {count} รายการ', { count: selectedRows.length })}
        onClose={() => setConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setConfirmOpen(false) },
          { label: t('ดำเนินการตัดบัญชี'), variant: 'primary', onClick: handleConfirmProcess },
        ]}
      >
        <div className="dialog-item-list">
          {selectedRows.map((row) => (
            <div className="dialog-item-row" key={row.id}>
              <span className="dialog-item-code">{row.code}</span>
              <span className="dialog-item-desc">{t(row.description)}</span>
            </div>
          ))}
        </div>
      </Dialog>

      <Dialog
        open={resultOpen}
        variant="success"
        title={t('ดำเนินการตัดบัญชีสำเร็จ!')}
        message={!resultHasFailures ? t('สามารถตรวจสอบสถานะของรายการตัดบัญชีได้ในหน้าประวัติการตัดบัญชีทั้งหมด') : null}
        autoCloseMs={!resultHasFailures ? 3000 : undefined}
        onClose={() => setResultOpen(false)}
        actions={
          resultHasFailures
            ? [{ label: t('ดูประวัติการตัดบัญชี'), variant: 'primary', onClick: handleViewHistory }]
            : undefined
        }
      >
        {resultHasFailures && (
          <div className="dialog-summary-lines">
            <p>{tv('รายการสำเร็จ {count} รายการ', { count: processResult.succeeded.length })}</p>
            <p>{tv('รายการไม่สำเร็จ {count} รายการ', { count: processResult.failed.length })}</p>
            <p>{t('ไม่สำเร็จเป็นเลขที่เอกสารต่อไปนี้')}</p>
          </div>
        )}
        {resultHasFailures && (
          <div className="dialog-item-list">
            {processResult.failed.map((row) => (
              <div className="dialog-item-row dialog-item-row--fail" key={row.id}>
                <ErrorCircleSolidIcon size={16} />
                <span className="dialog-item-code">{row.code}</span>
                <span className="dialog-item-desc">{t(row.description)}</span>
              </div>
            ))}
          </div>
        )}
        {resultHasFailures && (
          <p className="dialog-message">{t('สามารถตรวจสอบสถานะของรายการตัดบัญชีได้ในหน้าประวัติการตัดบัญชีทั้งหมด')}</p>
        )}
      </Dialog>
    </>
  );
}
