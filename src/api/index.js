import { createResource } from './resource';
import {
  MODULE_CONFIGS,
  seedAccountGroups,
  seedFinancialTargets,
  seedGlWriteoffEntries,
  seedModuleData,
  seedReconciliationItems,
  seedPurchaseTaxInvoices,
  seedPurchaseTaxRefDocs,
} from '../data';

export const MODULE_KEYS = Object.keys(MODULE_CONFIGS);

export const accountGroupApi = createResource('account-groups', seedAccountGroups);
export const financialTargetApi = createResource('financial-targets', seedFinancialTargets);
export const glWriteoffApi = createResource('gl-writeoff-entries', seedGlWriteoffEntries);
export const reconciliationApi = createResource('reconciliation-items', seedReconciliationItems);
// TODO: point at the real Input VAT endpoint once the backend exposes it (see Req_Module_ภาษีซื้อ_Fi.md).
export const purchaseTaxInvoiceApi = createResource('purchase-tax-invoices', seedPurchaseTaxInvoices);
// TODO: replace with a real GL/AP "posted, not yet tax-invoice-recorded" lookup endpoint.
export const purchaseTaxRefDocApi = createResource('purchase-tax-ref-docs', seedPurchaseTaxRefDocs);

const moduleResources = Object.fromEntries(
  MODULE_KEYS.map((key) => [key, createResource(`module-${key}`, () => seedModuleData()[key])]),
);

export const crudModuleApi = {
  list(module) {
    return moduleResources[module].list();
  },
  replace(module, rows) {
    return moduleResources[module].replace(rows);
  },
};

export { ApiError } from './http';
