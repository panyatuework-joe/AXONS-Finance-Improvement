import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getCalendarDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = new Date(year, month, 1).getDay();
  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export default function DateRangePicker({
  startValue,
  endValue,
  onChange,
  placeholder = 'กรุณาเลือก',
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (startValue ? parseISODate(startValue) : new Date()));
  const [draftStart, setDraftStart] = useState(startValue);
  const [draftEnd, setDraftEnd] = useState(endValue);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const controlRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      const target = e.target;
      if (
        controlRef.current &&
        !controlRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function openPanel() {
    const rect = controlRef.current?.getBoundingClientRect();
    if (rect) setPopoverPos({ top: rect.bottom + 4, left: rect.left });
    setDraftStart(startValue);
    setDraftEnd(endValue);
    setViewDate(startValue ? parseISODate(startValue) : new Date());
    setOpen(true);
  }

  function handleDayClick(day) {
    const iso = toISODate(day);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(iso);
      setDraftEnd('');
    } else if (iso < draftStart) {
      setDraftStart(iso);
      setDraftEnd('');
    } else {
      setDraftEnd(iso);
    }
  }

  function handleCancel() {
    setDraftStart(startValue);
    setDraftEnd(endValue);
    setOpen(false);
  }

  function handleSelect() {
    onChange(draftStart, draftEnd);
    setOpen(false);
  }

  const today = startOfDay(new Date());
  const todayIso = toISODate(today);
  const days = getCalendarDays(viewDate);
  const hasRange = !!(draftStart && draftEnd);

  const displayText = !startValue ? '' : endValue ? `${formatDisplayDate(startValue)} - ${formatDisplayDate(endValue)}` : formatDisplayDate(startValue);

  return (
    <div className="date-range" ref={controlRef}>
      <div className="date-range-control" onClick={() => (open ? setOpen(false) : openPanel())}>
        <span className={`date-range-value${!displayText ? ' date-range-value--placeholder' : ''}`}>
          {displayText || t(placeholder)}
        </span>
        <CalendarIcon size={18} color="#8a95a8" />
      </div>

      {open &&
        createPortal(
          <div
            className="date-range-popover"
            ref={popoverRef}
            style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="date-range-header">
              <button
                type="button"
                className="date-range-nav-btn"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              >
                <ChevronLeftIcon />
              </button>
              <span className="date-range-month-label">
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                className="date-range-nav-btn"
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              >
                <ChevronRightIcon />
              </button>
            </div>

            <div className="date-range-weekdays">
              {WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="date-range-grid">
              {days.map((day, i) => {
                if (!day) return <span key={`empty-${i}`} className="date-range-day date-range-day--empty" />;
                const iso = toISODate(day);
                const disabled = startOfDay(day) > today;
                const isStart = iso === draftStart;
                const isEnd = iso === draftEnd;
                const isBetween = hasRange && iso > draftStart && iso < draftEnd;
                const classes = ['date-range-day'];
                if (disabled) classes.push('date-range-day--disabled');
                if (iso === todayIso) classes.push('date-range-day--today');
                if (hasRange && (isStart || isBetween || isEnd)) classes.push('date-range-day--in-range');
                if (hasRange && isStart) classes.push('date-range-day--range-start');
                if (hasRange && isEnd) classes.push('date-range-day--range-end');
                if (isStart || isEnd) classes.push('date-range-day--selected');
                return (
                  <button
                    type="button"
                    key={iso}
                    className={classes.join(' ')}
                    disabled={disabled}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className="date-range-day-num">{day.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="date-range-actions">
              <button type="button" className="ft-btn-outline" onClick={handleCancel}>
                {t('ยกเลิก')}
              </button>
              <button type="button" className="ft-btn-primary" onClick={handleSelect}>
                {t('เลือก')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
