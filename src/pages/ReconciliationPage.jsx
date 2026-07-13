import { useMemo, useState } from 'react';
import { THAI_MONTH_OPTIONS, BUDDHIST_YEAR_OPTIONS, YEAR_OPTIONS } from '../data';
import { formatThaiTimestamp } from '../utils';
import { useApp } from '../context/AppContext';
import Select from '../components/Select';
import MultiSelect from '../components/MultiSelect';
import Pagination from '../components/Pagination';
import ReconStatusBadge from '../components/ReconStatusBadge';
import { FilterIcon, DocCheckIcon, SpinnerIcon, ViewIcon, CloseIcon } from '../icons';

const CATEGORY_OPTIONS = ['AA', 'AP', 'RP', 'AR', 'CR BP', 'BP', 'GL'];
const PAGE_SIZE = 10;

export default function ReconciliationPage({ data: items, onChange, onView }) {
  const { pushToast, t, tv, language } = useApp();
  const [month, setMonth] = useState('พฤษภาคม');
  const [year, setYear] = useState('2569');
  const [page, setPage] = useState(1);
  const [checkingAll, setCheckingAll] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [appliedCategories, setAppliedCategories] = useState([]);
  const [appliedStatus, setAppliedStatus] = useState('all');
  const [draftCategories, setDraftCategories] = useState([]);
  const [draftStatus, setDraftStatus] = useState('all');

  const filterCount = appliedCategories.length + (appliedStatus !== 'all' ? 1 : 0);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (appliedCategories.length > 0 && !appliedCategories.includes(item.category)) return false;
      if (appliedStatus !== 'all' && item.status !== appliedStatus) return false;
      return true;
    });
  }, [items, appliedCategories, appliedStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  function resolveItem(id) {
    onChange((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              status: Math.random() < 0.82 ? 'pass' : 'fail',
              lastChecked: formatThaiTimestamp(new Date()),
            }
          : it,
      ),
    );
  }

  function handleCheckOne(id) {
    const itemName = items.find((it) => it.id === id)?.name ?? '';
    onChange((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'checking' } : it)));
    setTimeout(() => {
      resolveItem(id);
      pushToast(t('ตรวจสอบรายการสำเร็จ'), 'success', t(itemName));
    }, 900);
  }

  function handleCheckAll() {
    const ids = items.map((it) => it.id);
    setCheckingAll(true);
    onChange((prev) => prev.map((it) => ({ ...it, status: 'checking' })));
    ids.forEach((id, idx) => {
      setTimeout(() => {
        resolveItem(id);
        if (idx === ids.length - 1) {
          setCheckingAll(false);
          pushToast(t('ตรวจสอบทั้งหมดสำเร็จ'), 'success', tv('{count} รายการ', { count: ids.length }));
        }
      }, 600 + idx * 350);
    });
  }

  function openFilterModal() {
    setDraftCategories(appliedCategories);
    setDraftStatus(appliedStatus);
    setFilterModalOpen(true);
  }

  function handleClearDraft() {
    setDraftCategories([]);
    setDraftStatus('all');
  }

  function handleApplyFilter() {
    setAppliedCategories(draftCategories);
    setAppliedStatus(draftStatus);
    setPage(1);
    setFilterModalOpen(false);
  }

  return (
    <>
      <div className="ft-page-header">
        <h1 className="ft-page-title">{t('ตรวจสอบบัญชีกระทบยอด')}</h1>
      </div>

      <div className="ft-content-card">
        <div className="recon-filter-row">
          <div className="recon-filter-field">
            <label>{t('เดือน')}</label>
            <Select
              value={month}
              onChange={setMonth}
              options={THAI_MONTH_OPTIONS.map((m) => ({ value: m, label: t(m) }))}
              className="aft-select"
            />
          </div>
          <div className="recon-filter-field">
            <label>{t('ปี')}</label>
            <Select
              value={year}
              onChange={setYear}
              options={BUDDHIST_YEAR_OPTIONS.map((y, i) => ({
                value: y,
                label: language === 'TH' ? y : YEAR_OPTIONS[i],
              }))}
              className="aft-select"
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

        <div className="recon-list-header">
          <h2>{tv('รายการตรวจสอบ {count} รายการ', { count: filtered.length })}</h2>
          <button className="ft-btn-primary" onClick={handleCheckAll} disabled={checkingAll}>
            {checkingAll ? <SpinnerIcon size={18} color="var(--color-base-white)" /> : <DocCheckIcon />}
            {checkingAll ? t('กำลังตรวจสอบทั้งหมด') : t('ตรวจสอบทั้งหมด')}
          </button>
        </div>

        <div className="ft-table-wrapper">
          <table className="ft-table recon-table">
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '300px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '180px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('รายการตรวจสอบ')}</th>
                <th>{t('รายงานที่จับคู่')}</th>
                <th>{t('ตรวจสอบล่าสุด')}</th>
                <th>{t('สถานะ')}</th>
                <th className="ft-table-action-col"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr className="ft-empty-row">
                  <td colSpan={6}>{t('ไม่พบข้อมูล')}</td>
                </tr>
              )}
              {pageRows.map((item, idx) => (
                <tr key={item.id}>
                  <td>{(pageClamped - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <div className="recon-name">
                      {t(item.name)} <span className="recon-category">· {item.category}</span>
                    </div>
                  </td>
                  <td>{item.matchedReport}</td>
                  <td>{item.lastChecked}</td>
                  <td>
                    <ReconStatusBadge status={item.status} />
                  </td>
                  <td className="ft-table-action-col">
                    <div className="ft-table-actions">
                      <button
                        className="recon-check-btn"
                        disabled={item.status === 'checking' || checkingAll}
                        onClick={() => handleCheckOne(item.id)}
                      >
                        {t('ตรวจสอบ')}
                      </button>
                      <button
                        className="ft-action-btn"
                        title={t('ดูรายงาน')}
                        onClick={() => onView(item.id)}
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
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
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
                <label className="aft-form-label">{t('ประเภท')}</label>
                <MultiSelect
                  values={draftCategories}
                  onChange={setDraftCategories}
                  options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div className="filter-modal-field">
                <label className="aft-form-label">{t('สถานะ')}</label>
                <Select
                  value={draftStatus}
                  onChange={setDraftStatus}
                  options={[
                    { value: 'all', label: t('ทั้งหมด') },
                    { value: 'pass', label: t('ผ่าน') },
                    { value: 'fail', label: t('ไม่ผ่าน') },
                    { value: 'checking', label: t('กำลังตรวจ') },
                  ]}
                  className="aft-select"
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
    </>
  );
}
