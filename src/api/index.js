import { createResource } from './resource';
import {
  MODULE_CONFIGS,
  seedAccountGroups,
  seedFinancialTargets,
  seedRecurringEntries,
  seedModuleData,
  seedReconciliationItems,
} from '../data';

export const MODULE_KEYS = Object.keys(MODULE_CONFIGS);

export const accountGroupApi = createResource('account-groups', seedAccountGroups);
export const financialTargetApi = createResource('financial-targets', seedFinancialTargets);
export const recurringApi = createResource('recurring-entries', seedRecurringEntries);
export const reconciliationApi = createResource('reconciliation-items', seedReconciliationItems);

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
