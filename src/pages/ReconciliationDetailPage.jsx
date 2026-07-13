import { useMemo, useState } from 'react';
import { formatThaiTimestamp } from '../utils';
import { useApp } from '../context/AppContext';
import Pagination from '../components/Pagination';
import ReconStatusBadge from '../components/ReconStatusBadge';
import {
  ChevronBreadcrumbIcon,
  DownloadIcon,
  DocCheckIcon,
  SpinnerIcon,
  SortAIcon,
  SortBOutlineIcon,
  SortBSolidIcon,
} from '../icons';

const PAGE_SIZE = 10;
const DETAIL_ROW_COUNT = 33;

const LOREM_SNIPPETS = [
  'The recent economic forecast suggests steady growth',
  'A financial literacy workshop was held for staff',
  'In a surprising turn, the city council approved',
  'A recent survey showed that most customers',
  'The community bank reported strong quarterly results',
  'The recent investment in infrastructure projects',
  'In the bustling city of Finance, new regulations',
  'The local credit union announced a new savings plan',
  'With the stock market hitting new highs',
  'A new startup, EcoFunds, raised a funding round',
];

const UL_OPTIONS = [
  '102 - การจัดการโลจิสติกส์',
  '103 - การบริหารจัดการ',
  '104 - การควบคุมโครงการ',
  '105 - การพัฒนาโครงการ',
  '106 - การดำเนินงาน',
  '107 - การวางแผนการผลิต',
  '108 - การบริหารกลยุทธ์',
  '109 - การตรวจสอบภายใน',
  '110 - การปรับปรุงกระบวนการ',
  '111 - การจัดการคุณภาพ',
];

function generateDetailRows(item, seed) {
  const failIndex = item.status === 'fail' ? seed % DETAIL_ROW_COUNT : -1;
  return Array.from({ length: DETAIL_ROW_COUNT }, (_, i) => {
    const code = String(93 + i).padStart(5, '0');
    const base = 90000 + i * 13000;
    const isFail = i === failIndex;
    return {
      id: `${item.id}-d${i}`,
      company: '6613 - บมจ.กรุงเทพโปรดิ๊วส',
      mainDept: '00 - สำนักงานใหญ่',
      subDept: '00 - สำนักงานใหญ่',
      topic: code,
      accountCode: code,
      description: LOREM_SNIPPETS[i % LOREM_SNIPPETS.length],
      ul: UL_OPTIONS[i % UL_OPTIONS.length],
      docType: code,
      docNumber: code,
      purchaseTax: base,
      glAmount: isFail ? base - 12500 : base,
      diff: isFail ? 12500 : 0,
      status: isFail ? 'fail' : 'pass',
    };
  });
}

const COLUMNS = [
  { key: 'company', label: 'บริษัท' },
  { key: 'mainDept', label: 'หน่วยงานหลัก' },
  { key: 'subDept', label: 'หน่วยงานย่อย' },
  { key: 'topic', label: 'หัวข้อ' },
  { key: 'accountCode', label: 'รหัสบัญชี' },
  { key: 'description', label: 'รายละเอียด' },
  { key: 'ul', label: 'ฝ่าย (UL)' },
  { key: 'docType', label: 'ประเภทเอกสาร' },
  { key: 'docNumber', label: 'เลขที่เอกสาร' },
  { key: 'purchaseTax', label: 'ยอดภาษีซื้อ' },
  { key: 'glAmount', label: 'ยอดบัญชีแยกประเภท (GL)' },
  { key: 'diff', label: 'ค่าความต่าง (Diff)' },
];

function formatAmount(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReconciliationDetailPage({ item, onChange, onBack }) {
  const { pushToast, startDownloadToast, t, tv } = useApp();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [rechecking, setRechecking] = useState(false);
  const [seed, setSeed] = useState(3);

  const detailRows = useMemo(() => generateDetailRows(item, seed), [item.id, item.status, seed]);
  const failCount = detailRows.filter((r) => r.status === 'fail').length;

  const sortedRows = useMemo(() => {
    if (!sortKey) return detailRows;
    return [...detailRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [detailRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

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

  function exportCsv(rows, filename) {
    startDownloadToast(filename, () => {
      const header = COLUMNS.map((c) => t(c.label)).concat(t('สถานะ'));
      const escape = (v) => `"${v.replace(/"/g, '""')}"`;
      const lines = [
        header.join(','),
        ...rows.map((r) =>
          [
            t(r.company),
            t(r.mainDept),
            t(r.subDept),
            r.topic,
            r.accountCode,
            r.description,
            t(r.ul),
            r.docType,
            r.docNumber,
            formatAmount(r.purchaseTax),
            formatAmount(r.glAmount),
            formatAmount(r.diff),
            r.status === 'pass' ? t('ผ่าน') : t('ไม่ผ่าน'),
          ]
            .map(escape)
            .join(','),
        ),
      ];
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleRecheckAll() {
    setRechecking(true);
    onChange({ ...item, status: 'checking' });
    setTimeout(() => {
      const passed = Math.random() < 0.7;
      onChange({
        ...item,
        status: passed ? 'pass' : 'fail',
        lastChecked: formatThaiTimestamp(new Date()),
      });
      setSeed((s) => s + 7);
      setRechecking(false);
      pushToast(t('ตรวจสอบทั้งหมดสำเร็จ'), 'success', t(item.name));
    }, 1200);
  }

  const [reportBase, reportCompare] = item.matchedReport.split(' vs ').map((s) => s.trim());

  return (
    <>
      <div className="aft-page-header">
        <div className="aft-breadcrumb">
          <span className="aft-breadcrumb-link" onClick={onBack}>
            {t('ตรวจสอบบัญชีกระทบยอด')}
          </span>
          <ChevronBreadcrumbIcon />
          <span className="aft-breadcrumb-current">{t('รายละเอียดการตรวจสอบ')}</span>
        </div>
        <h1 className="aft-page-title">{tv('รายละเอียดการตรวจสอบ - {name}', { name: t(item.name) })}</h1>
      </div>

      <div className="aft-card">
        <div className="aft-section-title">{t('รายละเอียด')}</div>
        <div className="view-detail-grid">
          <div className="view-detail-field">
            <span className="view-detail-label">{t('รายการตรวจสอบ')}</span>
            <span className="view-detail-value">{t(item.name)}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('รายงานตั้งต้น')}</span>
            <span className="view-detail-value">{reportBase}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('รายงานเปรียบเทียบ')}</span>
            <span className="view-detail-value">{t(reportCompare)}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('เดือน-ปี')}</span>
            <span className="view-detail-value">{t('พฤษภาคม 2026')}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('วันที่ตรวจสอบล่าสุด')}</span>
            <span className="view-detail-value">{item.lastChecked}</span>
          </div>
          <div className="view-detail-field">
            <span className="view-detail-label">{t('สถานะ')}</span>
            <span>
              <ReconStatusBadge status={item.status} />
            </span>
          </div>
        </div>
      </div>

      <div className="ft-content-card">
        <div className="recon-detail-header" style={{ padding: '24px 24px 0 24px' }}>
          <h2>{t('ข้อมูลการตรวจสอบ')}</h2>
          <div className="ft-header-buttons">
            {failCount > 0 && (
              <button className="ft-btn-outline" onClick={() => exportCsv(detailRows.filter((r) => r.status === 'fail'), t('รายการไม่ผ่าน.csv'))}>
                <DownloadIcon />
                {t('ดาวน์โหลดเฉพาะที่ไม่ผ่าน')}
              </button>
            )}
            <button className="ft-btn-outline" onClick={() => exportCsv(detailRows, t('ข้อมูลการตรวจสอบ.csv'))}>
              <DownloadIcon />
              {t('ดาวน์โหลดทั้งหมด')}
            </button>
            <button className="ft-btn-primary" onClick={handleRecheckAll} disabled={rechecking}>
              {rechecking ? <SpinnerIcon size={18} color="var(--color-base-white)" /> : <DocCheckIcon />}
              {rechecking ? t('กำลังตรวจสอบทั้งหมด') : t('ตรวจสอบทั้งหมด')}
            </button>
          </div>
        </div>

        {failCount > 0 && (
          <div className="recon-fail-banner">
            <div className="recon-fail-banner-title">{tv('รายการตรวจสอบไม่ผ่าน {count} รายการ', { count: failCount })}</div>
            <div className="recon-fail-banner-message">{t('โปรดตรวจสอบรายการที่ไม่ผ่าน และทำการกดตรวจสอบใหม่อีกครั้ง')}</div>
          </div>
        )}

        <div className="recon-detail-table-wrapper">
          <table className="recon-detail-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} onClick={() => handleSort(col.key)}>
                    <span className="sort-th-inner">
                      {t(col.label)}
                      {renderSortIcon(col.key)}
                    </span>
                  </th>
                ))}
                <th>{t('สถานะ')}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className={row.status === 'fail' ? 'recon-detail-row--fail' : ''}>
                  <td>{t(row.company)}</td>
                  <td>{t(row.mainDept)}</td>
                  <td>{t(row.subDept)}</td>
                  <td>{row.topic}</td>
                  <td>{row.accountCode}</td>
                  <td>{row.description}</td>
                  <td>{t(row.ul)}</td>
                  <td>{row.docType}</td>
                  <td>{row.docNumber}</td>
                  <td>{formatAmount(row.purchaseTax)}</td>
                  <td>{formatAmount(row.glAmount)}</td>
                  <td>{formatAmount(row.diff)}</td>
                  <td>
                    <ReconStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pageClamped}
          totalPages={totalPages}
          totalItems={sortedRows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
