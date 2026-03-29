import { readJsonFile, writeJsonFile } from '../../lib/file-store.js';
import type {
  ReportsRollupStoreState,
  WorkerDomainStoreState,
} from '../../lib/store-shapes.js';

export interface ReportsRollupsRepository {
  readDomainState(): WorkerDomainStoreState;
  writeRollupState(state: ReportsRollupStoreState): void;
}

export interface ReportsRollupsRepositoryOptions {
  domainStoreFile: string;
  reportsRollupStoreFile: string;
}

const EMPTY_DOMAIN_STATE: WorkerDomainStoreState = {
  auditEvents: [],
  budgetScopes: [],
  budgets: [],
  categories: [],
  merchants: [],
  rules: [],
  transactionItems: [],
  transactions: [],
  version: 1,
};

export function createReportsRollupsRepository({
  domainStoreFile,
  reportsRollupStoreFile,
}: ReportsRollupsRepositoryOptions): ReportsRollupsRepository {
  return {
    readDomainState() {
      return readJsonFile(domainStoreFile, EMPTY_DOMAIN_STATE);
    },
    writeRollupState(state) {
      writeJsonFile(reportsRollupStoreFile, state);
    },
  };
}
