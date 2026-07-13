import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDownIcon, CloseIcon } from '../icons';

export default function MultiSelect({ values, onChange, options, placeholder = 'กรุณาเลือก' }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggleValue(v) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  }

  function removeChip(v, e) {
    e.stopPropagation();
    onChange(values.filter((x) => x !== v));
  }

  function clearAll(e) {
    e.stopPropagation();
    onChange([]);
  }

  const VISIBLE_CHIP_LIMIT = 3;
  const visibleValues = values.slice(0, VISIBLE_CHIP_LIMIT);
  const overflowCount = values.length - visibleValues.length;

  return (
    <div className="multiselect" ref={ref}>
      <div className="multiselect-control" onClick={() => setOpen((v) => !v)}>
        {values.length === 0 ? (
          <span className="multiselect-placeholder">{t(placeholder)}</span>
        ) : (
          <div className="multiselect-chips">
            {visibleValues.map((v) => (
              <span className="multiselect-chip" key={v}>
                <span className="multiselect-chip-label">{options.find((o) => o.value === v)?.label ?? v}</span>
                <button type="button" onClick={(e) => removeChip(v, e)}>
                  <CloseIcon size={12} color="var(--color-base-white)" />
                </button>
              </span>
            ))}
            {overflowCount > 0 && <span className="multiselect-chip multiselect-chip--overflow">{overflowCount}+</span>}
          </div>
        )}
        {values.length > 0 && (
          <button type="button" className="multiselect-clear" onClick={clearAll}>
            <CloseIcon size={16} color="var(--color-text-light)" />
          </button>
        )}
        <ChevronDownIcon size={20} />
      </div>

      {open && (
        <div className="multiselect-dropdown">
          {options.map((opt) => (
            <label className="multiselect-option" key={opt.value}>
              <input type="checkbox" checked={values.includes(opt.value)} onChange={() => toggleValue(opt.value)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
