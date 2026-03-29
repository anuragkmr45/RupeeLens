import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { readJsonFile, writeJsonFile } from '../../lib/file-store.js';
import type {
  ExportJobStoreState,
  WorkerDomainStoreState,
} from '../../lib/store-shapes.js';

export interface ExportJobsRepository {
  readDomainState(): WorkerDomainStoreState;
  readExportJobState(): ExportJobStoreState;
  writeArtifact(userId: string, jobId: string, content: string): string;
  writeExportJobState(state: ExportJobStoreState): void;
}

export interface ExportJobsRepositoryOptions {
  domainStoreFile: string;
  exportArtifactsDir: string;
  exportJobStoreFile: string;
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

const EMPTY_EXPORT_JOB_STATE: ExportJobStoreState = {
  jobs: [],
  version: 1,
};

export function createExportJobsRepository({
  domainStoreFile,
  exportArtifactsDir,
  exportJobStoreFile,
}: ExportJobsRepositoryOptions): ExportJobsRepository {
  return {
    readDomainState() {
      return readJsonFile(domainStoreFile, EMPTY_DOMAIN_STATE);
    },
    readExportJobState() {
      return readJsonFile(exportJobStoreFile, EMPTY_EXPORT_JOB_STATE);
    },
    writeArtifact(userId, jobId, content) {
      const artifactPath = path.resolve(exportArtifactsDir, userId, `${jobId}.csv`);

      mkdirSync(path.dirname(artifactPath), {
        recursive: true,
      });
      writeFileSync(artifactPath, content, 'utf8');

      return artifactPath;
    },
    writeExportJobState(state) {
      writeJsonFile(exportJobStoreFile, state);
    },
  };
}
