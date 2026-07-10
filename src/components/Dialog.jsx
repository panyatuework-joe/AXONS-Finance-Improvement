import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CloseIcon,
  DialogSuccessIcon,
  DialogErrorIcon,
  DialogDeleteIcon,
  DialogWarningIcon,
  DialogCancelIcon,
  DialogSaveIcon,
  DialogAddIcon,
  DialogPauseIcon,
  DialogCancelDangerIcon,
  DialogImportIcon,
  DialogProcessIcon,
} from '../icons';

const ICONS = {
  success: DialogSuccessIcon,
  error: DialogErrorIcon,
  delete: DialogDeleteIcon,
  warning: DialogWarningIcon,
  cancel: DialogCancelIcon,
  save: DialogSaveIcon,
  add: DialogAddIcon,
  pause: DialogPauseIcon,
  'cancel-danger': DialogCancelDangerIcon,
  import: DialogImportIcon,
  process: DialogProcessIcon,
};

export default function Dialog({ open, variant, title, message, onClose, actions, autoCloseMs, children }) {
  const { tv } = useApp();
  const [countdown, setCountdown] = useState(Math.ceil((autoCloseMs ?? 3000) / 1000));

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    setCountdown(Math.ceil(autoCloseMs / 1000));
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    const timeout = setTimeout(onClose, autoCloseMs);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoCloseMs]);

  if (!open) return null;

  const Icon = ICONS[variant];

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>
          <CloseIcon size={18} color="#667085" />
        </button>
        <div className="dialog-icon">
          <Icon />
        </div>
        <h3 className="dialog-title">{title}</h3>
        {message && <p className="dialog-message">{message}</p>}
        {autoCloseMs && (
          <p className="dialog-countdown">{tv('ระบบจะปิดหน้าต่างภายใน ({n}) ..', { n: countdown })}</p>
        )}
        {children}
        {actions && actions.length > 0 && (
          <div className={`dialog-actions${actions.length === 1 ? ' dialog-actions--single' : ''}`}>
            {actions.map((a, i) => (
              <button
                key={i}
                className={`dialog-btn dialog-btn--${a.variant ?? 'primary'}`}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
