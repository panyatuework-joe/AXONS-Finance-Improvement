import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { translateVars } from '../i18n';
import { COMPANY_OPTIONS } from '../data';
import {
  HamburgerIcon,
  AxonsLogo,
  CompanyLogo,
  PersonAvatarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TriangleDownIcon,
  CheckIcon,
  HomeIcon,
  FinanceIcon,
  SettingsIcon,
  LogoutIcon,
} from '../icons';

const LEDGER_CHILDREN = [
  'reconciliation',
  'recurring-list',
  'recurring-monthly',
  'reports',
  'account-group',
  'report-lines',
  'link-account-groups',
  'link-report-lines',
  'financial-target',
];
const RECURRING_CHILDREN = ['recurring-list', 'recurring-monthly'];
const MANAGE_CHILDREN = [
  'account-group',
  'report-lines',
  'link-account-groups',
  'link-report-lines',
  'financial-target',
];

export default function Layout({ activeKey, onNavigate, onLogoutClick, children }) {
  const { language, setLanguage, company, setCompany, pushToast, t, tv } = useApp();
  const [ledgerExpanded, setLedgerExpanded] = useState(true);
  const [recurringExpanded, setRecurringExpanded] = useState(true);
  const [manageExpanded, setManageExpanded] = useState(true);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const companyMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  const ledgerActive = LEDGER_CHILDREN.includes(activeKey);
  const recurringActive = RECURRING_CHILDREN.includes(activeKey);
  const manageActive = MANAGE_CHILDREN.includes(activeKey);

  useEffect(() => {
    if (!companyMenuOpen && !langMenuOpen) return;
    function handleClickOutside(e) {
      if (companyMenuOpen && companyMenuRef.current && !companyMenuRef.current.contains(e.target)) {
        setCompanyMenuOpen(false);
      }
      if (langMenuOpen && langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [companyMenuOpen, langMenuOpen]);

  function handleSelectCompany(c) {
    setCompanyMenuOpen(false);
    if (c === company) return;
    setCompany(c);
    pushToast(tv('เปลี่ยนบริษัทเป็น {value}', { value: t(c) }), 'success');
  }

  function handleSelectLanguage(l) {
    setLangMenuOpen(false);
    if (l === language) return;
    setLanguage(l);
    pushToast(translateVars('เปลี่ยนภาษาเป็น {value}', { value: l }, l), 'success');
  }

  const LANGUAGE_OPTIONS = [
    { value: 'TH', label: 'ไทย (TH)' },
    { value: 'EN', label: 'English (EN)' },
  ];

  function handleNavigate(key) {
    onNavigate(key);
    setMobileSidebarOpen(false);
  }

  function handleLogoutClick() {
    setMobileSidebarOpen(false);
    onLogoutClick();
  }

  function handleToggleSidebar() {
    if (window.matchMedia('(max-width: 1024px)').matches) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  }

  return (
    <div className="ft-page">
      {/* NAVBAR */}
      <header className="ft-navbar">
        <div className="ft-navbar-left">
          <button className="ft-icon-btn" onClick={handleToggleSidebar}>
            <HamburgerIcon />
          </button>
          <div className="ft-navbar-logo">
            <AxonsLogo />
          </div>
          <span className="ft-navbar-title">AXONS Finance</span>
        </div>

        <div className="ft-navbar-right">
          <div className="ft-company-wrapper" ref={companyMenuRef}>
            <div className="ft-company-selector" onClick={() => setCompanyMenuOpen((v) => !v)}>
              <CompanyLogo />
              <span className="ft-company-name">{t(company)}</span>
              <TriangleDownIcon />
            </div>

            {companyMenuOpen && (
              <div className="navbar-dropdown navbar-dropdown--company">
                {COMPANY_OPTIONS.map((c) => (
                  <div
                    key={c}
                    className={`navbar-dropdown-item${c === company ? ' navbar-dropdown-item--active' : ''}`}
                    onClick={() => handleSelectCompany(c)}
                  >
                    <span>{t(c)}</span>
                    {c === company && <CheckIcon size={18} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ft-lang-wrapper" ref={langMenuRef}>
            <button className="ft-lang-btn" onClick={() => setLangMenuOpen((v) => !v)} title={t('สลับภาษา')}>
              <div className="ft-flag">
                <div className="ft-flag-red" />
                <div className="ft-flag-white" />
                <div className="ft-flag-blue" />
                <div className="ft-flag-white" />
                <div className="ft-flag-red" />
              </div>
              {language}
              <TriangleDownIcon size={8} />
            </button>

            {langMenuOpen && (
              <div className="navbar-dropdown navbar-dropdown--lang">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`navbar-dropdown-item${opt.value === language ? ' navbar-dropdown-item--active' : ''}`}
                    onClick={() => handleSelectLanguage(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {opt.value === language && <CheckIcon size={18} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ft-user-profile">
            <div className="ft-avatar">
              <PersonAvatarIcon />
              <div className="ft-avatar-status" />
            </div>
            <div className="ft-user-info">
              <span className="ft-user-name">{t('สิริศักดิ์ หงษ์พัตรา')}</span>
              <span className="ft-user-org">AXONS</span>
            </div>
            <TriangleDownIcon />
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="ft-layout">
        {mobileSidebarOpen && <div className="ft-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />}

        {/* SIDEBAR */}
        <aside
          className={`ft-sidebar${mobileSidebarOpen ? ' ft-sidebar--open' : ''}${
            sidebarCollapsed ? ' ft-sidebar--collapsed' : ''
          }`}
        >
          <nav className="ft-sidebar-nav">
            <div className="ft-menu-item" title={t('หน้าแรก')} onClick={() => handleNavigate('home')}>
              <div className="ft-menu-icon">
                <HomeIcon />
              </div>
              <span className={`ft-menu-label${activeKey === 'home' ? ' ft-menu-label--selected' : ''}`}>
                {t('หน้าแรก')}
              </span>
            </div>

            <div
              className="ft-menu-item"
              title={t('บัญชีแยกประเภท')}
              onClick={() => setLedgerExpanded((v) => !v)}
            >
              <div className="ft-menu-icon">
                <FinanceIcon color={ledgerActive ? 'var(--color-creation-primary-selected)' : 'var(--color-text-normal)'} />
              </div>
              <span className={`ft-menu-label${ledgerActive ? ' ft-menu-label--selected' : ''}`}>
                {t('บัญชีแยกประเภท')}
              </span>
              <div className="ft-menu-chevron">
                {ledgerExpanded ? <ChevronUpIcon color="var(--color-creation-primary-selected)" /> : <ChevronDownIcon />}
              </div>
            </div>

            {ledgerExpanded && (
              <>
                <div
                  className={`ft-submenu-item${activeKey === 'reconciliation' ? ' ft-submenu-item--active' : ''}`}
                  onClick={() => handleNavigate('reconciliation')}
                >
                  <span
                    className={`ft-submenu-label${activeKey === 'reconciliation' ? ' ft-submenu-label--active' : ''}`}
                  >
                    {t('ตรวจสอบบัญชีกระทบยอด')}
                  </span>
                </div>
                <div className="ft-submenu-item" onClick={() => setRecurringExpanded((v) => !v)}>
                  <span className={`ft-submenu-label${recurringActive ? ' ft-submenu-label--active' : ''}`}>
                    {t('รายการบัญชีประจำ')}
                  </span>
                  <div className="ft-submenu-chevron">
                    {recurringExpanded ? <ChevronUpIcon color="var(--color-creation-primary-selected)" size={16} /> : <ChevronDownIcon size={16} />}
                  </div>
                </div>

                {recurringExpanded && (
                  <>
                    {[
                      ['recurring-list', 'จัดการรายการบัญชีประจำ'],
                      ['recurring-monthly', 'รายการรอดำเนินการ'],
                    ].map(([key, label]) => (
                      <div
                        key={key}
                        className={`ft-submenu-item${activeKey === key ? ' ft-submenu-item--active' : ''}`}
                        onClick={() => handleNavigate(key)}
                      >
                        <span
                          className={`ft-submenu-label ft-submenu-label--l2${
                            activeKey === key ? ' ft-submenu-label--active' : ''
                          }`}
                        >
                          {t(label)}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                <div
                  className={`ft-submenu-item${activeKey === 'reports' ? ' ft-submenu-item--active' : ''}`}
                  onClick={() => handleNavigate('reports')}
                >
                  <span className={`ft-submenu-label${activeKey === 'reports' ? ' ft-submenu-label--active' : ''}`}>
                    {t('รายงาน')}
                  </span>
                </div>

                <div className="ft-submenu-item" onClick={() => setManageExpanded((v) => !v)}>
                  <span className={`ft-submenu-label${manageActive ? ' ft-submenu-label--active' : ''}`}>
                    {t('จัดการข้อมูล')}
                  </span>
                  <div className="ft-submenu-chevron">
                    {manageExpanded ? <ChevronUpIcon color="var(--color-creation-primary-selected)" size={16} /> : <ChevronDownIcon size={16} />}
                  </div>
                </div>

                {manageExpanded && (
                  <>
                    {[
                      ['account-group', 'กลุ่มบัญชี'],
                      ['report-lines', 'บรรทัดรายงาน'],
                      ['link-account-groups', 'ผูกกลุ่มบัญชี'],
                      ['link-report-lines', 'ผูกบรรทัดรายงาน'],
                      ['financial-target', 'เป้าหมายงบการเงิน'],
                    ].map(([key, label]) => (
                      <div
                        key={key}
                        className={`ft-submenu-item${activeKey === key ? ' ft-submenu-item--active' : ''}`}
                        onClick={() => handleNavigate(key)}
                      >
                        <span
                          className={`ft-submenu-label ft-submenu-label--l2${
                            activeKey === key ? ' ft-submenu-label--active' : ''
                          }`}
                        >
                          {t(label)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            <div className="ft-menu-item" title={t('การตั้งค่า')} onClick={() => handleNavigate('settings')}>
              <div className="ft-menu-icon">
                <SettingsIcon />
              </div>
              <span className={`ft-menu-label${activeKey === 'settings' ? ' ft-menu-label--selected' : ''}`}>
                {t('การตั้งค่า')}
              </span>
              <div className="ft-menu-chevron">
                <ChevronDownIcon />
              </div>
            </div>
          </nav>

          <div className="ft-sidebar-divider" />
          <div className="ft-sidebar-footer">
            <div className="ft-menu-item" title={t('ออกจากระบบ')} onClick={handleLogoutClick}>
              <div className="ft-menu-icon">
                <LogoutIcon />
              </div>
              <span className="ft-menu-label">{t('ออกจากระบบ')}</span>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="ft-main">
          <div className="ft-content-wrapper">{children}</div>

          {/* FOOTER */}
          <footer className="ft-footer">
            <span className="ft-footer-text">Version 1.00</span>
            <span className="ft-footer-text">©2026 AXONS Corporate. All rights reserved.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
