import Select from './Select';
import { useApp } from '../context/AppContext';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

function getPageNumbers(current, total) {
  const pages = new Set([1, total]);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}) {
  const { tv } = useApp();
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="ft-pagination">
      {pageSizeOptions && onPageSizeChange && (
        <div className="ft-page-size-select">
          <Select
            className="ft-page-size-dropdown"
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
      )}
      <span className="ft-page-info">
        {tv('แสดง {start} - {end} จาก {total}', { start, end, total: totalItems })}
      </span>
      <div className="ft-page-controls">
        <button className="ft-page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeftIcon />
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span className="ft-page-ellipsis" key={`e-${i}`}>
              …
            </span>
          ) : (
            <button
              key={p}
              className={`ft-page-btn${p === page ? ' ft-page-btn--active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button className="ft-page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
