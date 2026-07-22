// One JSON file per menu/function (see the sidebar item or page each one
// backs). Merged here into the flat {phrases, templates} shape i18n.js
// expects — the split is for maintainability only, not a runtime concern.
import common from './common.json';
import home from './home.json';
import settings from './settings.json';
import loggedOut from './logged-out.json';
import recurring from './recurring.json';
import reconciliation from './reconciliation.json';
import financialTarget from './financial-target.json';
import reports from './reports.json';
import accountGroup from './account-group.json';
import reportLine from './report-line.json';
import accountGroupLink from './account-group-link.json';
import reportLineLink from './report-line-link.json';

const files = [
  common,
  home,
  settings,
  loggedOut,
  recurring,
  reconciliation,
  financialTarget,
  reports,
  accountGroup,
  reportLine,
  accountGroupLink,
  reportLineLink,
];

export const phrases = Object.assign({}, ...files.map((f) => f.phrases));
export const templates = Object.assign({}, ...files.map((f) => f.templates));
