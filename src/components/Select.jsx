import { ChevronDownIcon } from '../icons';

export default function Select({ value, onChange, options, placeholder, disabled, className, error }) {
  return (
    <div
      className={`ft-select-wrapper${disabled ? ' ft-select-wrapper--disabled' : ''}${
        error ? ' ft-select-wrapper--error' : ''
      }${className ? ` ${className}` : ''}`}
    >
      <select
        className="ft-native-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={20} color={disabled ? '#8a95a8' : '#344054'} />
    </div>
  );
}
