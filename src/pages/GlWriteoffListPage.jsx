import { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import MultiSelect from '../components/MultiSelect';
import { WRITEOFF_CATEGORY_OPTIONS, UL_DEPT_OPTIONS, GL_ACCOUNT_CODE_OPTIONS, CV_OPTIONS } from '../data';
import { parseCsv, nextGlWriteoffCode, glWriteoffPerPeriodAmount } from '../utils';
import {
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
  SortIcon,
  ViewIcon,
  FileImportIcon,
} from '../icons';

const IMPORT_COLUMNS = [
  'บริษัท',
  'หน่วยงานหลัก',
  'ประเภทเอกสารอ้างอิง',
  'เลขที่เอกสารอ้างอิง',
  'ประเภท',
  'รายละเอียด',
  'ยอดเงินรวมทั้งสัญญา',
  'จำนวนงวด',
  'เริ่มตัดบัญชีงวดแรก (MM/YYYY)',
];

function formatMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_OPTIONS = ['ระหว่างดำเนินการ', 'หยุดชั่วคราว', 'ยกเลิก', 'จ่ายครบแล้ว'];

export default function GlWriteoffListPage({ data, onCreate, onView, onImport }) {
  const { pushToast, t, tv } = useApp();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [importResults, setImportResults] = useState(null);
  const importInputRef = useRef(null);

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
      if (search.trim() && !row.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
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
  }, [data, search, sortKey, sortAsc, appliedStatuses, appliedCategories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
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

  function handleImportClick() {
    importInputRef.current?.click();
  }

  function validateImportRow(cols) {
    const [, dept, docType, docNo, category, description, totalAmountRaw, installmentsRaw, startPeriod] = cols.map((c) => c.trim());
    if (!dept) return t('ไม่พบหน่วยงานหลัก');
    if (!docType) return t('ไม่พบประเภทเอกสารอ้างอิง');
    if (!docNo) return t('ไม่พบเลขที่เอกสารอ้างอิง');
    if (!category) return t('ไม่พบประเภท');
    if (!description) return t('ไม่พบรายละเอียด');
    if (!(parseFloat((totalAmountRaw ?? '').replace(/,/g, '')) > 0)) return t('ยอดเงินรวมทั้งสัญญาไม่ถูกต้อง');
    if (!(parseInt(installmentsRaw ?? '', 10) > 0)) return t('จำนวนงวดไม่ถูกต้อง');
    if (!/^\d{2}\/\d{4}$/.test(startPeriod ?? '')) return t('รูปแบบงวดเริ่มต้นไม่ถูกต้อง (MM/YYYY)');
    return null;
  }

  async function handleImportFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const results = [];
    const newEntries = [];
    let runningEntries = [...data];
    let idCounter = 0;

    for (const file of files) {
      const text = await file.text();
      const rows = parseCsv(text).slice(1);
      if (rows.length === 0) {
        results.push({ fileName: file.name, company: null, importedCount: 0, skippedRows: [], error: t('ไม่พบข้อมูลในไฟล์') });
        continue;
      }

      const companies = new Set(rows.map((r) => (r[0] ?? '').trim()).filter(Boolean));
      if (companies.size === 0) {
        const reason = t('ไม่พบชื่อบริษัทในไฟล์');
        results.push({
          fileName: file.name,
          company: null,
          importedCount: 0,
          skippedRows: rows.map((cols) => ({ fileName: file.name, cols, reason })),
          error: reason,
        });
        continue;
      }
      if (companies.size > 1) {
        const reason = t('ไฟล์นี้มีมากกว่า 1 บริษัท กรุณาแยกไฟล์ต่อบริษัท');
        results.push({
          fileName: file.name,
          company: null,
          importedCount: 0,
          skippedRows: rows.map((cols) => ({ fileName: file.name, cols, reason })),
          error: reason,
        });
        continue;
      }

      const company = [...companies][0];
      let importedCount = 0;
      const skippedRows = [];

      for (const cols of rows) {
        const reason = validateImportRow(cols);
        if (reason) {
          skippedRows.push({ fileName: file.name, cols, reason });
          continue;
        }

        const [, dept, docType, docNo, category, description, totalAmountRaw, installmentsRaw, startPeriod] = cols.map((c) => c.trim());
        const totalAmount = parseFloat(totalAmountRaw.replace(/,/g, ''));
        const installments = parseInt(installmentsRaw, 10);
        const code = nextGlWriteoffCode(runningEntries);
        const perAmount = glWriteoffPerPeriodAmount(totalAmount, installments);
        idCounter++;
        const entry = {
          id: `glw-${Date.now()}-${idCounter}`,
          code,
          company,
          dept,
          subDept: '00 - สำนักงานใหญ่',
          docType,
          docNo,
          category,
          description,
          totalAmount,
          installments,
          installmentsPaid: 0,
          startPeriod,
          startDate: `25/${startPeriod}`,
          createdBy: 'สิริศักดิ์ หงษ์พัตรา',
          createdAt: new Date().toLocaleDateString('en-GB'),
          status: 'ระหว่างดำเนินการ',
          debitLines: [
            { id: `${code}-d1`, dept: UL_DEPT_OPTIONS[0], accountCode: GL_ACCOUNT_CODE_OPTIONS[0], cvCode: CV_OPTIONS[0], amount: perAmount },
          ],
          creditLines: [
            { id: `${code}-c1`, dept: UL_DEPT_OPTIONS[3], accountCode: GL_ACCOUNT_CODE_OPTIONS[1], cvCode: CV_OPTIONS[1], amount: perAmount },
          ],
          files: [],
        };
        newEntries.push(entry);
        runningEntries = [entry, ...runningEntries];
        importedCount++;
      }

      results.push({ fileName: file.name, company, importedCount, skippedRows });
    }

    if (newEntries.length > 0) onImport(newEntries);
    setImportResults(results);
    if (importInputRef.current) importInputRef.current.value = '';
  }

  function handleDownloadFailedRows() {
    if (!importResults) return;
    const failedRows = importResults.flatMap((r) => r.skippedRows);
    if (failedRows.length === 0) return;
    const header = [...IMPORT_COLUMNS.map((c) => t(c)), t('ไฟล์ต้นทาง'), t('เหตุผลที่ไม่ผ่าน')];
    const escape = (v) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...failedRows.map((r) => [...r.cols, r.fileName, r.reason].map(escape).join(',')),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('รายการที่นำเข้าไม่สำเร็จ.csv');
    a.click();
    URL.revokeObjectURL(url);
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
        <h1 className="ft-page-title">{t('จัดการรายการตัดบัญชี')}</h1>
        <div className="ft-header-buttons">
          <button className="ft-btn-outline" onClick={handleDownload}>
            <DownloadIcon />
            {t('ดาวน์โหลด')}
          </button>
          <button
            className="ft-btn-outline"
            onClick={handleImportClick}
            title={tv('รูปแบบไฟล์ CSV แต่ละไฟล์คือ 1 บริษัท คอลัมน์: {columns}', { columns: IMPORT_COLUMNS.map((c) => t(c)).join(', ') })}
          >
            <FileImportIcon />
            {t('นำเข้าไฟล์รายการตัดบัญชี')}
          </button>
          <input
            ref={importInputRef}
            type="file"
            multiple
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleImportFilesSelected(e.target.files)}
          />
          <button className="ft-btn-primary" onClick={onCreate}>
            <PlusIcon />
            {t('สร้างรายการตัดบัญชี')}
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
              placeholder={t('ค้นหาด้วย รหัสรายการตัดบัญชี')}
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
                    <CloseIcon size={12} color="#ffffff" />
                  </button>
                </span>
              ))}
              {appliedCategories.map((v) => (
                <span className="filter-chip" key={`cat-${v}`}>
                  {t(v)}
                  <button type="button" onClick={() => removeAppliedChip('category', v)}>
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
                  <col style={{ width: '190px' }} />
                  <col style={{ width: '300px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '234px' }} />
                </colgroup>
                <thead>
                  <tr>
                    {(
                      [
                        ['code', 'รหัสรายการตัดบัญชี'],
                        ['description', 'รายละเอียด'],
                        ['company', 'บริษัท'],
                        ['dept', 'หน่วยงานหลัก'],
                        ['subDept', 'หน่วยงานย่อย'],
                        ['category', 'ประเภท'],
                        ['totalAmount', 'ยอดรวม'],
                      ]
                    ).map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                        <span className="sort-th-inner">
                          {t(label)}
                          <SortIcon />
                        </span>
                      </th>
                    ))}
                    <th>{t('ความคืบหน้า')}</th>
                    {(
                      [
                        ['startDate', 'วันที่เริ่มตัดบัญชี'],
                        ['createdBy', 'ผู้สร้าง'],
                        ['createdAt', 'วันที่สร้าง'],
                      ]
                    ).map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                        <span className="sort-th-inner">
                          {t(label)}
                          <SortIcon />
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
                      <td>{formatMoney(row.totalAmount)}</td>
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

      {importResults && (
        <div className="modal-backdrop" onClick={() => setImportResults(null)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('ผลการนำเข้าไฟล์')}</h3>
              <button className="modal-close" onClick={() => setImportResults(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="import-result-list">
              {importResults.map((r, i) => (
                <div
                  key={`${r.fileName}-${i}`}
                  className={`import-result-row ${
                    r.error ? 'import-result-row--fail' : r.skippedRows.length > 0 ? 'import-result-row--partial' : 'import-result-row--ok'
                  }`}
                >
                  <div>
                    <div className="import-result-file">{r.fileName}</div>
                    {r.company && <div className="import-result-company">{t(r.company)}</div>}
                  </div>
                  <div className={`import-result-status${r.error ? ' import-result-status--fail' : ''}`}>
                    {r.error ? (
                      r.error
                    ) : (
                      <>
                        {tv('นำเข้าสำเร็จ {count} รายการ', { count: r.importedCount })}
                        {r.skippedRows.length > 0 &&
                          ` · ${tv('ข้าม {count} แถวที่ข้อมูลไม่ถูกต้อง', { count: r.skippedRows.length })}`}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              {importResults.some((r) => r.skippedRows.length > 0) && (
                <button className="ft-btn-outline" onClick={handleDownloadFailedRows}>
                  <DownloadIcon />
                  {t('ดาวน์โหลดรายการที่ไม่ผ่าน')}
                </button>
              )}
              <button className="ft-btn-primary" onClick={() => setImportResults(null)}>
                {t('ปิด')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
