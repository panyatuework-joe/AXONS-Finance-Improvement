import { useEffect, useRef, useState } from 'react';
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
import GlWriteoffPage from './pages/GlWriteoffPage';
import GlWriteoffListPage from './pages/GlWriteoffListPage';
import GlWriteoffFormPage from './pages/GlWriteoffFormPage';
import GlWriteoffDetailPage from './pages/GlWriteoffDetailPage';
import PurchaseTaxInvoicePage from './pages/PurchaseTaxInvoicePage';
import { SpinnerIcon } from './icons';
import { MODULE_CONFIGS } from './data';
import {
  MODULE_KEYS,
  accountGroupApi,
  financialTargetApi,
  glWriteoffApi,
  reconciliationApi,
  crudModuleApi,
  purchaseTaxInvoiceApi,
  purchaseTaxRefDocApi,
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
    case 'gl-writeoff-create':
    case 'gl-writeoff-form':
    case 'gl-writeoff-detail':
      return 'gl-writeoff-create';
    case 'gl-writeoff-list':
      return 'gl-writeoff-list';
    case 'purchase-tax-invoice':
      return 'purchase-tax-invoice';
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
  if (key === 'gl-writeoff-create') return { name: 'gl-writeoff-create' };
  if (key === 'gl-writeoff-list') return { name: 'gl-writeoff-list' };
  if (key === 'purchase-tax-invoice') return { name: 'purchase-tax-invoice' };
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
  const [glWriteoffEntries, setGlWriteoffEntries] = useState([]);
  const [purchaseTaxInvoices, setPurchaseTaxInvoices] = useState([]);
  const [purchaseTaxRefDocs, setPurchaseTaxRefDocs] = useState([]);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const pushToastRef = useRef(pushToast);
  pushToastRef.current = pushToast;

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [ag, ft, gw, rc, pti, ptRef, moduleEntries] = await Promise.all([
          accountGroupApi.list(),
          financialTargetApi.list(),
          glWriteoffApi.list(),
          reconciliationApi.list(),
          purchaseTaxInvoiceApi.list(),
          purchaseTaxRefDocApi.list(),
          Promise.all(MODULE_KEYS.map(async (key) => [key, await crudModuleApi.list(key)])),
        ]);
        if (cancelled) return;
        setAccountGroups(ag);
        setFinancialTargets(ft);
        setGlWriteoffEntries(gw);
        setReconciliationItems(rc);
        setPurchaseTaxInvoices(pti);
        setPurchaseTaxRefDocs(ptRef);
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
    run().catch((err) => {
      pushToastRef.current(
        t('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'),
        'error',
        err instanceof ApiError ? err.message : undefined,
      );
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
        <SpinnerIcon size={32} color="#074E9F" />
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
      case 'gl-writeoff-create':
        return (
          <GlWriteoffListPage
            data={glWriteoffEntries}
            onCreate={() => setView({ name: 'gl-writeoff-form' })}
            onView={(id) => setView({ name: 'gl-writeoff-detail', id })}
            onImport={(entries) => {
              setGlWriteoffEntries((prev) => {
                const next = [...entries, ...prev];
                persist(() => glWriteoffApi.replace(next));
                return next;
              });
            }}
          />
        );
      case 'gl-writeoff-form':
        return (
          <GlWriteoffFormPage
            existing={glWriteoffEntries}
            onCancel={() => setView({ name: 'gl-writeoff-create' })}
            onSave={(entry) => {
              setGlWriteoffEntries((prev) => [entry, ...prev]);
              persist(() => glWriteoffApi.create(entry));
            }}
          />
        );
      case 'gl-writeoff-detail': {
        const entry = glWriteoffEntries.find((e) => e.id === view.id);
        if (!entry) return null;
        return (
          <GlWriteoffDetailPage
            entry={entry}
            onBack={() => setView({ name: 'gl-writeoff-create' })}
            onStatusChange={(updated) => {
              setGlWriteoffEntries((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              persist(() => glWriteoffApi.update(updated));
            }}
          />
        );
      }
      case 'gl-writeoff-list':
        return <GlWriteoffPage title="รายการตัดบัญชี" />;
      case 'purchase-tax-invoice':
        return (
          <PurchaseTaxInvoicePage
            data={purchaseTaxInvoices}
            refDocs={purchaseTaxRefDocs}
            onChange={(rows) => {
              setPurchaseTaxInvoices(rows);
              persist(() => purchaseTaxInvoiceApi.replace(rows));
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
