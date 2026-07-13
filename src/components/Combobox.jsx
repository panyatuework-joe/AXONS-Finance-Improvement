import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDownIcon, ChevronUpIcon } from '../icons';

export default function Combobox({
  value,
  onChange,
  options,
  placeholder = 'กรุณาเลือก',
  searchable = false,
  disabled,
  error,
  className,
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';
  const resolvedPlaceholder = t(placeholder);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtered =
    searchable && query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  function openPanel() {
    if (disabled || open) return;
    setOpen(true);
    setQuery('');
    if (searchable) requestAnimationFrame(() => inputRef.current?.select());
  }

  function selectOption(opt) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  return (
    <div
      className={`ft-combobox${disabled ? ' ft-combobox--disabled' : ''}${error ? ' ft-combobox--error' : ''}${
        open ? ' ft-combobox--open' : ''
      }${className ? ` ${className}` : ''}`}
      ref={wrapperRef}
    >
      <div className="ft-combobox-control" onClick={openPanel}>
        {searchable ? (
          <input
            ref={inputRef}
            type="text"
            className="ft-combobox-input"
            value={open ? query : selectedLabel}
            placeholder={resolvedPlaceholder}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={openPanel}
          />
        ) : (
          <span className={`ft-combobox-value${!selectedLabel ? ' ft-combobox-value--placeholder' : ''}`}>
            {selectedLabel || resolvedPlaceholder}
          </span>
        )}
        {open ? (
          <ChevronUpIcon size={20} color={disabled ? 'var(--color-neutral-default)' : 'var(--color-text-normal)'} />
        ) : (
          <ChevronDownIcon size={20} color={disabled ? 'var(--color-neutral-default)' : 'var(--color-text-normal)'} />
        )}
      </div>

      {open && (
        <div className="ft-combobox-panel">
          {filtered.length === 0 && <div className="ft-combobox-empty">{t('ไม่พบข้อมูล')}</div>}
          {filtered.map((opt) => (
            <div
              key={opt.value}
              className={`ft-combobox-option${opt.value === value ? ' ft-combobox-option--selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
