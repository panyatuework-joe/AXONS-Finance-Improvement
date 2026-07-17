// Thai identity dictionary, split the same way as src/locales/en — kept
// for parity/documentation. The app's canonical stored/compared values are
// already Thai text, so this isn't required at runtime by i18n.js, but it
// gives every menu a matching th.json alongside its en.json.
import common from './common.json';
import home from './home.json';
import settings from './settings.json';
import loggedOut from './logged-out.json';
import glWriteoff from './gl-writeoff.json';
import reconciliation from './reconciliation.json';
import financialTarget from './financial-target.json';
import reports from './reports.json';
import accountGroup from './account-group.json';
import reportLine from './report-line.json';
import accountGroupLink from './account-group-link.json';
import reportLineLink from './report-line-link.json';
import purchaseTaxInvoice from './purchase-tax-invoice.json';

const files = [
  common,
  home,
  settings,
  loggedOut,
  glWriteoff,
  reconciliation,
  financialTarget,
  reports,
  accountGroup,
  reportLine,
  accountGroupLink,
  reportLineLink,
  purchaseTaxInvoice,
];

export const phrases = Object.assign({}, ...files.map((f) => f.phrases));
export const templates = Object.assign({}, ...files.map((f) => f.templates));
