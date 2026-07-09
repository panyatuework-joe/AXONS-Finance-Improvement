import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, ErrorCircleIcon, CircleOutlineIcon, SpinnerIcon, CloseIcon } from '../icons';
import { COMPANY_OPTIONS } from '../data';
import { translate, translateVars } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'axons-language';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'EN' || stored === 'TH' ? stored : 'TH';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [company, setCompany] = useState(COMPANY_OPTIONS[0]);
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const t = useCallback((text) => translate(text, language), [language]);
  const tv = useCallback(
    (template, vars) => translateVars(template, vars, language),
    [language],
  );

  const pushToast = useCallback(
    (message, type = 'success', detail) => {
      if (!notificationsEnabled) return;
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, kind: 'message', message, type, detail }]);
      timers.current.push(
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000),
      );
    },
    [notificationsEnabled],
  );

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startDownloadToast = useCallback(
    (filename, run) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, kind: 'download', stage: 'preparing', filename }]);

      const setStage = (stage) =>
        setToasts((prev) => prev.map((t) => (t.id === id && t.kind === 'download' ? { ...t, stage } : t)));

      timers.current.push(
        setTimeout(() => {
          setStage('downloading');
          timers.current.push(
            setTimeout(() => {
              try {
                run();
                setStage('complete');
                timers.current.push(setTimeout(() => closeToast(id), 4000));
              } catch {
                setStage('failed');
              }
            }, 900),
          );
        }, 700),
      );
    },
    [closeToast],
  );

  const clearToasts = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setToasts([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        notificationsEnabled,
        setNotificationsEnabled,
        company,
        setCompany,
        pushToast,
        startDownloadToast,
        closeToast,
        clearToasts,
        t,
        tv,
      }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((t) =>
          t.kind === 'message' ? (
            <div key={t.id} className={`toast toast--download toast--${t.type === 'success' ? 'complete' : 'failed'}`}>
              {t.type === 'success' ? <CheckCircleIcon size={24} /> : <ErrorCircleIcon size={24} />}
              <div className="toast-download-body">
                <span className="toast-download-title">{t.message}</span>
                {t.detail && <span className="toast-download-filename">{t.detail}</span>}
              </div>
              <button className="toast-download-close" onClick={() => closeToast(t.id)}>
                <CloseIcon />
              </button>
            </div>
          ) : (
            <div key={t.id} className={`toast toast--download toast--${t.stage}`}>
              {t.stage === 'preparing' && <CircleOutlineIcon size={24} color="#9CC3EA" />}
              {t.stage === 'downloading' && <SpinnerIcon size={24} color="#074E9F" />}
              {t.stage === 'complete' && <CheckCircleIcon size={24} />}
              {t.stage === 'failed' && <ErrorCircleIcon size={24} />}
              <div className="toast-download-body">
                <span className="toast-download-title">
                  {t.stage === 'preparing' && translate('กำลังเตรียมดาวน์โหลด', language)}
                  {t.stage === 'downloading' && translate('กำลังดาวน์โหลด', language)}
                  {t.stage === 'complete' && translate('ดาวน์โหลดสำเร็จ', language)}
                  {t.stage === 'failed' && translate('ดาวน์โหลดไม่สำเร็จ', language)}
                </span>
                <span className="toast-download-filename">{t.filename}</span>
              </div>
              {(t.stage === 'complete' || t.stage === 'failed') && (
                <button className="toast-download-close" onClick={() => closeToast(t.id)}>
                  <CloseIcon />
                </button>
              )}
            </div>
          ),
        )}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
