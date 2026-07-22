import { useEffect, useRef, useState } from 'react';
import './design-tokens.css';
import './design-tokens-colors.css';
import './shared.css';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dialog from './components/Dialog';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import LoggedOutPage from './pages/LoggedOutPage';
import GenericCrudPage from './pages/GenericCrudPage';
import AccountGroupPage from './pages/AccountGroupPage';
import FinancialTargetPage from './pages/FinancialTargetPage';
import FinancialTargetFormPage from './pages/FinancialTargetFormPage';
import FinancialTargetViewPage from './pages/FinancialTargetViewPage';
import ReconciliationPage from './pages/ReconciliationPage';
import ReconciliationDetailPage from './pages/ReconciliationDetailPage';
import RecurringMonthlyPage from './pages/RecurringMonthlyPage';
import RecurringListPage from './pages/RecurringListPage';
import RecurringImportPage from './pages/RecurringImportPage';
import RecurringFormPage from './pages/RecurringFormPage';
import RecurringDetailPage from './pages/RecurringDetailPage';
import { SpinnerIcon } from './icons';
import { MODULE_CONFIGS } from './data';
import {
  MODULE_KEYS,
  accountGroupApi,
  financialTargetApi,
  recurringApi,
  reconciliationApi,
  crudModuleApi,
  ApiError,
} from './api';

function sidebarKeyForView(view) {
  switch (view.name) {
    case 'home':
      return 'home';
    case 'settings':
      return 'settings';
    case 'reconciliation':
      return 'reconciliation';
    case 'recurring-list':
    case 'recurring-form':
    case 'recurring-detail':
    case 'recurring-import':
      return 'recurring-list';
    case 'recurring-monthly':
      return 'recurring-monthly';
    case 'module':
      return view.module;
    case 'reconciliation-detail':
      return 'reconciliation';
    case 'account-group-list':
      return 'account-group';
    case 'financial-target-list':
    case 'financial-target-form':
    case 'financial-target-view':
      return 'financial-target';
  }
}

function viewForSidebarKey(key) {
  if (key === 'home') return { name: 'home' };
  if (key === 'settings') return { name: 'settings' };
  if (key === 'reconciliation') return { name: 'reconciliation' };
  if (key === 'recurring-list') return { name: 'recurring-list' };
  if (key === 'recurring-monthly') return { name: 'recurring-monthly' };
  if (key === 'account-group') return { name: 'account-group-list' };
  if (key === 'financial-target') return { name: 'financial-target-list' };
  return { name: 'module', module: key };
}

function AppShellRouter() {
  const { clearToasts, pushToast, t } = useApp();
  const [view, setView] = useState({ name: 'home' });
  const [financialTargets, setFinancialTargets] = useState([]);
  const [accountGroups, setAccountGroups] = useState([]);
  const [crudData, setCrudData] = useState(
    () => Object.fromEntries(MODULE_KEYS.map((key) => [key, []])),
  );
  const [reconciliationItems, setReconciliationItems] = useState([]);
  const [recurringEntries, setRecurringEntries] = useState([]);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const pushToastRef = useRef(pushToast);
  pushToastRef.current = pushToast;

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [ag, ft, gw, rc, moduleEntries] = await Promise.all([
          accountGroupApi.list(),
          financialTargetApi.list(),
          recurringApi.list(),
          reconciliationApi.list(),
          Promise.all(MODULE_KEYS.map(async (key) => [key, await crudModuleApi.list(key)])),
        ]);
        if (cancelled) return;
        setAccountGroups(ag);
        setFinancialTargets(ft);
        setRecurringEntries(gw);
        setReconciliationItems(rc);
        setCrudData(Object.fromEntries(moduleEntries));
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Fires a persistence call in the background; UI state has already been updated optimistically. */
  function persist(run) {
    run().catch(() => {
      setErrorDialogOpen(true);
    });
  }

  if (loggedOut) {
    return (
      <LoggedOutPage
        onRelogin={() => {
          setLoggedOut(false);
          setView({ name: 'home' });
        }}
      />
    );
  }

  if (initialLoading) {
    return (
      <div className="app-loading-screen">
        <SpinnerIcon size={32} color="var(--color-primary-default)" />
        <span>{t('กำลังโหลดข้อมูล...')}</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-loading-screen">
        <span>{loadError}</span>
        <button className="ft-btn-primary" onClick={() => window.location.reload()}>
          {t('ลองใหม่อีกครั้ง')}
        </button>
      </div>
    );
  }

  function renderPage() {
    switch (view.name) {
      case 'home':
        return (
          <HomePage
            financialTargetsCount={financialTargets.length}
            reconciliationCount={reconciliationItems.length}
            accountGroupsCount={accountGroups.length}
            crudData={crudData}
            onNavigateModule={(key) => setView(viewForSidebarKey(key))}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'recurring-list':
        return (
          <RecurringListPage
            data={recurringEntries}
            onCreate={() => setView({ name: 'recurring-form' })}
            onView={(id) => setView({ name: 'recurring-detail', id })}
            onImportClick={() => setView({ name: 'recurring-import' })}
          />
        );
      case 'recurring-import':
        return (
          <RecurringImportPage
            existing={recurringEntries}
            onCancel={() => setView({ name: 'recurring-list' })}
            onImport={(entries) => {
              setRecurringEntries((prev) => {
                const next = [...entries, ...prev];
                persist(() => recurringApi.replace(next));
                return next;
              });
            }}
          />
        );
      case 'recurring-form': {
        const editEntry = view.editId ? recurringEntries.find((e) => e.id === view.editId) : undefined;
        const duplicateFrom = view.duplicateFromId
          ? recurringEntries.find((e) => e.id === view.duplicateFromId)
          : undefined;
        const formBackTarget =
          editEntry && editEntry.status !== 'ฉบับร่าง'
            ? { name: 'recurring-detail', id: editEntry.id }
            : duplicateFrom
              ? { name: 'recurring-detail', id: duplicateFrom.id }
              : { name: 'recurring-list' };
        function saveEntry(entry) {
          const isEdit = recurringEntries.some((r) => r.id === entry.id);
          setRecurringEntries((prev) =>
            isEdit ? prev.map((r) => (r.id === entry.id ? entry : r)) : [entry, ...prev],
          );
          persist(() => (isEdit ? recurringApi.update(entry) : recurringApi.create(entry)));
        }
        return (
          <RecurringFormPage
            existing={recurringEntries}
            initial={editEntry}
            duplicateFrom={duplicateFrom}
            onCancel={() => setView(formBackTarget)}
            onViewSource={(id) => setView({ name: 'recurring-detail', id })}
            onSave={(entry) => {
              saveEntry(entry);
            }}
            onSaveDraft={(entry) => {
              saveEntry(entry);
            }}
          />
        );
      }
      case 'recurring-detail': {
        const entry = recurringEntries.find((e) => e.id === view.id);
        if (!entry) return null;
        const backTarget = view.from === 'monthly' ? { name: 'recurring-monthly' } : { name: 'recurring-list' };
        const backLabel = view.from === 'monthly' ? 'รายการรอดำเนินการ' : 'จัดการรายการบัญชีประจำ';
        return (
          <RecurringDetailPage
            entry={entry}
            backLabel={backLabel}
            onBack={() => setView(backTarget)}
            onStatusChange={(updated) => {
              setRecurringEntries((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              persist(() => recurringApi.update(updated));
            }}
            onDuplicate={(source) => setView({ name: 'recurring-form', duplicateFromId: source.id })}
            onEdit={(source) => setView({ name: 'recurring-form', editId: source.id })}
            onDelete={(source) => {
              setRecurringEntries((prev) => prev.filter((r) => r.id !== source.id));
              persist(() => recurringApi.remove(source.id));
              pushToastRef.current(t('ลบฉบับร่างสำเร็จ!'), 'success');
              setView({ name: 'recurring-list' });
            }}
          />
        );
      }
      case 'recurring-monthly':
        return (
          <RecurringMonthlyPage
            data={recurringEntries}
            onView={(id) => setView({ name: 'recurring-detail', id, from: 'monthly' })}
            onProcessBatch={(rows) => {
              const ids = new Set(rows.map((r) => r.id));
              const bump = (r) =>
                ids.has(r.id)
                  ? { ...r, installmentsPaid: Math.min(r.installments, r.installmentsPaid + 1), failedInstallment: null }
                  : r;
              setRecurringEntries((prev) => prev.map(bump));
              persist(() => recurringApi.replace(recurringEntries.map(bump)));
            }}
            onProcessFailure={(rows) => {
              const ids = new Set(rows.map((r) => r.id));
              const markFailed = (r) => (ids.has(r.id) ? { ...r, failedInstallment: r.installmentsPaid + 1 } : r);
              setRecurringEntries((prev) => prev.map(markFailed));
              persist(() => recurringApi.replace(recurringEntries.map(markFailed)));
            }}
          />
        );
      case 'reconciliation':
        return (
          <ReconciliationPage
            data={reconciliationItems}
            onChange={(updater) => {
              setReconciliationItems((prev) => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                persist(() => reconciliationApi.replace(next));
                return next;
              });
            }}
            onView={(id) => setView({ name: 'reconciliation-detail', id })}
          />
        );
      case 'reconciliation-detail': {
        const item = reconciliationItems.find((it) => it.id === view.id);
        if (!item) return null;
        return (
          <ReconciliationDetailPage
            item={item}
            onChange={(updated) => {
              setReconciliationItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
              persist(() => reconciliationApi.update(updated));
            }}
            onBack={() => setView({ name: 'reconciliation' })}
          />
        );
      }
      case 'module':
        return (
          <GenericCrudPage
            config={MODULE_CONFIGS[view.module]}
            data={crudData[view.module]}
            onChange={(rows) => {
              setCrudData((prev) => ({ ...prev, [view.module]: rows }));
              persist(() => crudModuleApi.replace(view.module, rows));
            }}
          />
        );
      case 'account-group-list':
        return (
          <AccountGroupPage
            data={accountGroups}
            onChange={(rows) => {
              setAccountGroups(rows);
              persist(() => accountGroupApi.replace(rows));
            }}
          />
        );
      case 'financial-target-list':
        return (
          <FinancialTargetPage
            data={financialTargets}
            onChange={(rows) => {
              setFinancialTargets(rows);
              persist(() => financialTargetApi.replace(rows));
            }}
            onAdd={() => setView({ name: 'financial-target-form', mode: 'add' })}
            onView={(id) => setView({ name: 'financial-target-view', id })}
            onEdit={(id) => setView({ name: 'financial-target-form', mode: 'edit', id })}
          />
        );
      case 'financial-target-form': {
        const initialRecord = view.mode === 'add' ? undefined : financialTargets.find((f) => f.id === view.id);
        return (
          <FinancialTargetFormPage
            mode={view.mode}
            initial={initialRecord}
            existing={financialTargets}
            onCancel={() => setView({ name: 'financial-target-list' })}
            onSave={(ft) => {
              const isEdit = financialTargets.some((r) => r.id === ft.id);
              setFinancialTargets((prev) =>
                isEdit ? prev.map((r) => (r.id === ft.id ? ft : r)) : [ft, ...prev],
              );
              persist(() => (isEdit ? financialTargetApi.update(ft) : financialTargetApi.create(ft)));
            }}
          />
        );
      }
      case 'financial-target-view': {
        const target = financialTargets.find((f) => f.id === view.id);
        if (!target) return null;
        return (
          <FinancialTargetViewPage
            target={target}
            onBack={() => setView({ name: 'financial-target-list' })}
            onEdit={() => setView({ name: 'financial-target-form', mode: 'edit', id: target.id })}
            onDelete={() => {
              setFinancialTargets((prev) => prev.filter((r) => r.id !== target.id));
              persist(() => financialTargetApi.remove(target.id));
            }}
          />
        );
      }
    }
  }

  return (
    <>
      <Layout
        activeKey={sidebarKeyForView(view)}
        onNavigate={(key) => setView(viewForSidebarKey(key))}
        onLogoutClick={() => setLogoutConfirmOpen(true)}
      >
        {renderPage()}
      </Layout>

      <Dialog
        open={logoutConfirmOpen}
        variant="warning"
        title={t('คุณต้องการออกจากระบบใช่ไหม?')}
        message={t('คุณจะต้องเข้าสู่ระบบใหม่อีกครั้งเพื่อใช้งาน')}
        onClose={() => setLogoutConfirmOpen(false)}
        actions={[
          { label: t('ยกเลิก'), variant: 'outline', onClick: () => setLogoutConfirmOpen(false) },
          {
            label: t('ออกจากระบบ'),
            variant: 'danger',
            onClick: () => {
              setLogoutConfirmOpen(false);
              setLoggedOut(true);
              clearToasts();
            },
          },
        ]}
      />

      <Dialog
        open={errorDialogOpen}
        variant="error"
        title={t('ไม่สามารถทำรายการได้')}
        message={t('ขออภัย เกิดข้อผิดพลาดทางเทคนิค กรุณาลองใหม่อีกครั้งในภายหลัง')}
        onClose={() => setErrorDialogOpen(false)}
        actions={[{ label: t('ยอมรับ'), variant: 'primary', onClick: () => setErrorDialogOpen(false) }]}
      />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShellRouter />
    </AppProvider>
  );
}
