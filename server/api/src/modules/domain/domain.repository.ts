import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import type {
  AuditEvent,
  Budget,
  BudgetScope,
  Category,
  Merchant,
  Rule,
  Transaction,
  TransactionItem,
} from './domain.types.js';

export interface StoredTransaction extends Transaction {
  userId: string;
}

export interface StoredTransactionItem extends TransactionItem {
  userId: string;
}

export interface StoredMerchant extends Merchant {
  userId: string;
}

export interface StoredAuditEvent extends AuditEvent {
  transactionId: string;
  userId: string;
}

export interface StoredCategory extends Category {
  deletedAt?: string | undefined;
  userId: string;
}

export interface StoredRule extends Rule {
  deletedAt?: string | undefined;
  userId: string;
}

export interface StoredBudget extends Budget {
  deletedAt?: string | undefined;
  userId: string;
}

export interface StoredBudgetScope extends BudgetScope {
  budgetId: string;
  userId: string;
}

interface SerializedDomainRepositoryState {
  auditEvents: StoredAuditEvent[];
  budgetScopes: StoredBudgetScope[];
  budgets: StoredBudget[];
  categories: StoredCategory[];
  merchants: StoredMerchant[];
  rules: StoredRule[];
  transactions: StoredTransaction[];
  transactionItems: StoredTransactionItem[];
  version: 1;
}

export interface CreateDomainRepositoryOptions {
  domainStoreFile: string;
}

export interface DomainRepository {
  close(): void;
  listAuditEvents(userId: string, transactionId: string): StoredAuditEvent[];
  appendAuditEvent(record: StoredAuditEvent): void;
  getBudget(userId: string, budgetId: string, includeDeleted?: boolean): StoredBudget | null;
  listBudgetScopes(userId: string, budgetId: string): StoredBudgetScope[];
  listBudgets(userId: string, includeDeleted?: boolean): StoredBudget[];
  replaceBudgetScopes(userId: string, budgetId: string, scopes: StoredBudgetScope[]): void;
  saveBudget(record: StoredBudget): void;
  getCategory(userId: string, categoryId: string, includeDeleted?: boolean): StoredCategory | null;
  listCategories(userId: string, includeDeleted?: boolean): StoredCategory[];
  saveCategory(record: StoredCategory): void;
  getMerchant(userId: string, merchantId: string, includeDeleted?: boolean): StoredMerchant | null;
  listMerchants(userId: string, includeDeleted?: boolean): StoredMerchant[];
  saveMerchant(record: StoredMerchant): void;
  getRule(userId: string, ruleId: string, includeDeleted?: boolean): StoredRule | null;
  listRules(userId: string, includeDeleted?: boolean): StoredRule[];
  saveRule(record: StoredRule): void;
  getTransaction(userId: string, transactionId: string): StoredTransaction | null;
  listTransactions(userId: string): StoredTransaction[];
  getTransactionItem(
    userId: string,
    itemId: string,
    includeDeleted?: boolean,
  ): StoredTransactionItem | null;
  listTransactionItems(
    userId: string,
    transactionId?: string,
    includeDeleted?: boolean,
  ): StoredTransactionItem[];
  replaceTransactionItems(
    userId: string,
    transactionId: string,
    items: StoredTransactionItem[],
  ): void;
  saveTransactionItem(record: StoredTransactionItem): void;
  saveTransaction(record: StoredTransaction): void;
}

const DOMAIN_STORE_VERSION = 1;

function cloneTransaction(record: StoredTransaction): StoredTransaction {
  return { ...record };
}

function cloneTransactionItem(record: StoredTransactionItem): StoredTransactionItem {
  return { ...record };
}

function cloneMerchant(record: StoredMerchant): StoredMerchant {
  return { ...record };
}

function cloneAuditEvent(record: StoredAuditEvent): StoredAuditEvent {
  return {
    ...record,
    ...(record.before ? { before: { ...record.before } } : {}),
    ...(record.after ? { after: { ...record.after } } : {}),
  };
}

function cloneCategory(record: StoredCategory): StoredCategory {
  return { ...record };
}

function cloneRule(record: StoredRule): StoredRule {
  return { ...record };
}

function cloneBudget(record: StoredBudget): StoredBudget {
  return { ...record };
}

function cloneBudgetScope(record: StoredBudgetScope): StoredBudgetScope {
  return { ...record };
}

function loadState(domainStoreFile: string): SerializedDomainRepositoryState {
  try {
    const parsed = JSON.parse(readFileSync(domainStoreFile, 'utf8')) as Partial<SerializedDomainRepositoryState>;

    if (parsed.version !== DOMAIN_STORE_VERSION) {
      throw new Error(`Unsupported domain store version in ${domainStoreFile}: ${String(parsed.version)}`);
    }

    return {
      auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
      budgetScopes: Array.isArray(parsed.budgetScopes) ? parsed.budgetScopes : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      merchants: Array.isArray(parsed.merchants) ? parsed.merchants : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      transactionItems: Array.isArray(parsed.transactionItems) ? parsed.transactionItems : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      version: DOMAIN_STORE_VERSION,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        auditEvents: [],
        budgetScopes: [],
        budgets: [],
        categories: [],
        merchants: [],
        rules: [],
        transactionItems: [],
        transactions: [],
        version: DOMAIN_STORE_VERSION,
      };
    }

    throw error;
  }
}

function writeState(
  domainStoreFile: string,
  state: SerializedDomainRepositoryState,
): void {
  mkdirSync(path.dirname(domainStoreFile), {
    recursive: true,
  });

  const tempFile = `${domainStoreFile}.${process.pid}.tmp`;

  try {
    writeFileSync(tempFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tempFile, domainStoreFile);
  } catch (error) {
    try {
      unlinkSync(tempFile);
    } catch (cleanupError) {
      if ((cleanupError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw cleanupError;
      }
    }

    throw error;
  }
}

export function createDomainRepository({
  domainStoreFile,
}: CreateDomainRepositoryOptions): DomainRepository {
  const initialState = loadState(domainStoreFile);
  const transactions = new Map(
    initialState.transactions.map((record) => [`${record.userId}:${record.id}`, cloneTransaction(record)]),
  );
  const transactionItems = new Map(
    initialState.transactionItems.map((record) => [
      `${record.userId}:${record.transactionId}:${record.id}`,
      cloneTransactionItem(record),
    ]),
  );
  const auditEvents = initialState.auditEvents.map(cloneAuditEvent);
  const categories = new Map(
    initialState.categories.map((record) => [`${record.userId}:${record.id}`, cloneCategory(record)]),
  );
  const merchants = new Map(
    initialState.merchants.map((record) => [`${record.userId}:${record.id}`, cloneMerchant(record)]),
  );
  const rules = new Map(
    initialState.rules.map((record) => [`${record.userId}:${record.id}`, cloneRule(record)]),
  );
  const budgets = new Map(
    initialState.budgets.map((record) => [`${record.userId}:${record.id}`, cloneBudget(record)]),
  );
  const budgetScopes = new Map(
    initialState.budgetScopes.map((record, index) => [
      `${record.userId}:${record.budgetId}:${index}:${record.scopeType}:${record.scopeRefId ?? record.scopeValueText ?? ''}`,
      cloneBudgetScope(record),
    ]),
  );

  function persist(): void {
    writeState(domainStoreFile, {
      auditEvents: auditEvents.map(cloneAuditEvent),
      budgetScopes: [...budgetScopes.values()].map(cloneBudgetScope),
      budgets: [...budgets.values()].map(cloneBudget),
      categories: [...categories.values()].map(cloneCategory),
      merchants: [...merchants.values()].map(cloneMerchant),
      rules: [...rules.values()].map(cloneRule),
      transactionItems: [...transactionItems.values()].map(cloneTransactionItem),
      transactions: [...transactions.values()].map(cloneTransaction),
      version: DOMAIN_STORE_VERSION,
    });
  }

  return {
    close() {},
    appendAuditEvent(record) {
      auditEvents.push(cloneAuditEvent(record));
      persist();
    },
    getBudget(userId, budgetId, includeDeleted = false) {
      const record = budgets.get(`${userId}:${budgetId}`);

      if (!record || (!includeDeleted && record.deletedAt)) {
        return null;
      }

      return cloneBudget(record);
    },
    getCategory(userId, categoryId, includeDeleted = false) {
      const record = categories.get(`${userId}:${categoryId}`);

      if (!record || (!includeDeleted && record.deletedAt)) {
        return null;
      }

      return cloneCategory(record);
    },
    getMerchant(userId, merchantId, includeDeleted = false) {
      const record = merchants.get(`${userId}:${merchantId}`);

      if (!record || (!includeDeleted && record.deletedAt)) {
        return null;
      }

      return cloneMerchant(record);
    },
    getRule(userId, ruleId, includeDeleted = false) {
      const record = rules.get(`${userId}:${ruleId}`);

      if (!record || (!includeDeleted && record.deletedAt)) {
        return null;
      }

      return cloneRule(record);
    },
    getTransaction(userId, transactionId) {
      const record = transactions.get(`${userId}:${transactionId}`);
      return record ? cloneTransaction(record) : null;
    },
    getTransactionItem(userId, itemId, includeDeleted = false) {
      for (const record of transactionItems.values()) {
        if (record.userId === userId && record.id === itemId) {
          if (!includeDeleted && record.deletedAt) {
            return null;
          }

          return cloneTransactionItem(record);
        }
      }

      return null;
    },
    listAuditEvents(userId, transactionId) {
      return auditEvents
        .filter((record) => record.userId === userId && record.transactionId === transactionId)
        .map(cloneAuditEvent)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
    listBudgetScopes(userId, budgetId) {
      return [...budgetScopes.values()]
        .filter((record) => record.userId === userId && record.budgetId === budgetId)
        .map(cloneBudgetScope);
    },
    listBudgets(userId, includeDeleted = false) {
      return [...budgets.values()]
        .filter((record) => record.userId === userId && (includeDeleted || !record.deletedAt))
        .map(cloneBudget)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
    listCategories(userId, includeDeleted = false) {
      return [...categories.values()]
        .filter((record) => record.userId === userId && (includeDeleted || !record.deletedAt))
        .map(cloneCategory)
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    listMerchants(userId, includeDeleted = false) {
      return [...merchants.values()]
        .filter((record) => record.userId === userId && (includeDeleted || !record.deletedAt))
        .map(cloneMerchant)
        .sort((left, right) => left.label.localeCompare(right.label));
    },
    listRules(userId, includeDeleted = false) {
      return [...rules.values()]
        .filter((record) => record.userId === userId && (includeDeleted || !record.deletedAt))
        .map(cloneRule)
        .sort((left, right) => left.priority - right.priority || left.createdAt.localeCompare(right.createdAt));
    },
    listTransactionItems(userId, transactionId, includeDeleted = false) {
      return [...transactionItems.values()]
        .filter(
          (record) =>
            record.userId === userId &&
            (includeDeleted || !record.deletedAt) &&
            (transactionId === undefined || record.transactionId === transactionId),
        )
        .map(cloneTransactionItem)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
    listTransactions(userId) {
      return [...transactions.values()]
        .filter((record) => record.userId === userId)
        .map(cloneTransaction)
        .sort((left, right) => right.paidAt.localeCompare(left.paidAt));
    },
    replaceBudgetScopes(userId, budgetId, scopes) {
      for (const key of [...budgetScopes.keys()]) {
        if (key.startsWith(`${userId}:${budgetId}:`)) {
          budgetScopes.delete(key);
        }
      }

      scopes.forEach((scope, index) => {
        budgetScopes.set(
          `${userId}:${budgetId}:${index}:${scope.scopeType}:${scope.scopeRefId ?? scope.scopeValueText ?? ''}`,
          cloneBudgetScope(scope),
        );
      });
      persist();
    },
    replaceTransactionItems(userId, transactionId, items) {
      for (const key of [...transactionItems.keys()]) {
        if (key.startsWith(`${userId}:${transactionId}:`)) {
          transactionItems.delete(key);
        }
      }

      for (const item of items) {
        transactionItems.set(
          `${userId}:${transactionId}:${item.id}`,
          cloneTransactionItem(item),
        );
      }
      persist();
    },
    saveBudget(record) {
      budgets.set(`${record.userId}:${record.id}`, cloneBudget(record));
      persist();
    },
    saveCategory(record) {
      categories.set(`${record.userId}:${record.id}`, cloneCategory(record));
      persist();
    },
    saveMerchant(record) {
      merchants.set(`${record.userId}:${record.id}`, cloneMerchant(record));
      persist();
    },
    saveRule(record) {
      rules.set(`${record.userId}:${record.id}`, cloneRule(record));
      persist();
    },
    saveTransactionItem(record) {
      transactionItems.set(
        `${record.userId}:${record.transactionId}:${record.id}`,
        cloneTransactionItem(record),
      );
      persist();
    },
    saveTransaction(record) {
      transactions.set(`${record.userId}:${record.id}`, cloneTransaction(record));
      persist();
    },
  };
}
