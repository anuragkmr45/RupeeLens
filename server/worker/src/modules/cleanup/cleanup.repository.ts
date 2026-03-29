import { rmSync } from 'node:fs';

import { readJsonFile, writeJsonFile } from '../../lib/file-store.js';
import type {
  ExportJobStoreState,
  WorkerSessionStoreState,
} from '../../lib/store-shapes.js';

export interface CleanupRepository {
  deleteArtifact(filePath: string): void;
  readExportJobState(): ExportJobStoreState;
  readSessionState(): WorkerSessionStoreState;
  writeExportJobState(state: ExportJobStoreState): void;
  writeSessionState(state: WorkerSessionStoreState): void;
}

export interface CleanupRepositoryOptions {
  exportJobStoreFile: string;
  sessionStoreFile: string;
}

const EMPTY_EXPORT_JOB_STATE: ExportJobStoreState = {
  jobs: [],
  version: 1,
};

const EMPTY_SESSION_STATE: WorkerSessionStoreState = {
  accessTokens: [],
  devices: [],
  pairingCodes: [],
  refreshTokens: [],
  users: [],
  version: 1,
};

export function createCleanupRepository({
  exportJobStoreFile,
  sessionStoreFile,
}: CleanupRepositoryOptions): CleanupRepository {
  return {
    deleteArtifact(filePath) {
      rmSync(filePath, {
        force: true,
      });
    },
    readExportJobState() {
      return readJsonFile(exportJobStoreFile, EMPTY_EXPORT_JOB_STATE);
    },
    readSessionState() {
      return readJsonFile(sessionStoreFile, EMPTY_SESSION_STATE);
    },
    writeExportJobState(state) {
      writeJsonFile(exportJobStoreFile, state);
    },
    writeSessionState(state) {
      writeJsonFile(sessionStoreFile, state);
    },
  };
}
