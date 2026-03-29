import { getCurrentUtcTimestamp } from '@upi-spend-tracker/shared-utils';

import type {
  ExportJobStoreState,
  WorkerSessionStoreState,
} from '../../lib/store-shapes.js';
import type { CleanupRepository } from './cleanup.repository.js';

export interface CleanupService {
  runCleanup(): CleanupSummary;
}

export interface CleanupServiceDependencies {
  exportFailureRetentionMs: number;
  maxExportAttempts: number;
  now?: () => string;
  repository: CleanupRepository;
}

export interface CleanupSummary {
  deadLetterCount: number;
  failedJobCount: number;
  pendingJobCount: number;
  prunedAccessTokenCount: number;
  prunedArtifactCount: number;
  prunedCompletedExportCount: number;
  prunedFailedExportCount: number;
  prunedPairingCodeCount: number;
  prunedRefreshTokenCount: number;
}

export function createCleanupService({
  exportFailureRetentionMs,
  maxExportAttempts,
  now = getCurrentUtcTimestamp,
  repository,
}: CleanupServiceDependencies): CleanupService {
  return {
    runCleanup() {
      const nowIso = now();
      const nowMs = Date.parse(nowIso);
      const sessionState = repository.readSessionState();
      const exportJobState = repository.readExportJobState();
      const nextSessionState = pruneSessionState(sessionState, nowMs);
      const nextExportState = pruneExportJobs(
        exportJobState,
        nowMs,
        exportFailureRetentionMs,
        maxExportAttempts,
      );

      repository.writeSessionState(nextSessionState.state);
      repository.writeExportJobState(nextExportState.state);

      for (const artifactPath of nextExportState.prunedArtifactPaths) {
        repository.deleteArtifact(artifactPath);
      }

      return {
        deadLetterCount: nextExportState.deadLetterCount,
        failedJobCount: nextExportState.failedJobCount,
        pendingJobCount: nextExportState.pendingJobCount,
        prunedAccessTokenCount: nextSessionState.prunedAccessTokenCount,
        prunedArtifactCount: nextExportState.prunedArtifactPaths.length,
        prunedCompletedExportCount: nextExportState.prunedCompletedExportCount,
        prunedFailedExportCount: nextExportState.prunedFailedExportCount,
        prunedPairingCodeCount: nextSessionState.prunedPairingCodeCount,
        prunedRefreshTokenCount: nextSessionState.prunedRefreshTokenCount,
      };
    },
  };
}

function pruneSessionState(
  state: WorkerSessionStoreState,
  nowMs: number,
): {
  prunedAccessTokenCount: number;
  prunedPairingCodeCount: number;
  prunedRefreshTokenCount: number;
  state: WorkerSessionStoreState;
} {
  const accessTokens = state.accessTokens.filter((record) => !isExpired(record.expiresAt, nowMs));
  const refreshTokens = state.refreshTokens.filter(
    (record) =>
      !isExpired(record.expiresAt, nowMs) &&
      !(record.revokedAt && Date.parse(record.revokedAt) <= nowMs),
  );
  const pairingCodes = state.pairingCodes.filter(
    (record) =>
      !isExpired(record.expiresAt, nowMs) &&
      !(record.consumedAt && Date.parse(record.consumedAt) <= nowMs),
  );

  return {
    prunedAccessTokenCount: state.accessTokens.length - accessTokens.length,
    prunedPairingCodeCount: state.pairingCodes.length - pairingCodes.length,
    prunedRefreshTokenCount: state.refreshTokens.length - refreshTokens.length,
    state: {
      ...state,
      accessTokens,
      pairingCodes,
      refreshTokens,
    },
  };
}

function pruneExportJobs(
  state: ExportJobStoreState,
  nowMs: number,
  exportFailureRetentionMs: number,
  maxExportAttempts: number,
): {
  deadLetterCount: number;
  failedJobCount: number;
  pendingJobCount: number;
  prunedArtifactPaths: string[];
  prunedCompletedExportCount: number;
  prunedFailedExportCount: number;
  state: ExportJobStoreState;
} {
  const prunedArtifactPaths: string[] = [];
  let prunedCompletedExportCount = 0;
  let prunedFailedExportCount = 0;
  const jobs = state.jobs.filter((job) => {
    if (job.status === 'completed' && job.expiresAt && Date.parse(job.expiresAt) <= nowMs) {
      if (job.artifactPath) {
        prunedArtifactPaths.push(job.artifactPath);
      }

      prunedCompletedExportCount += 1;
      return false;
    }

    const isDeadLetter =
      job.status === 'failed' &&
      job.attemptCount >= maxExportAttempts &&
      Date.parse(job.nextAttemptAt) + exportFailureRetentionMs <= nowMs;

    if (isDeadLetter) {
      prunedFailedExportCount += 1;
      return false;
    }

    return true;
  });
  const deadLetterCount = jobs.filter(
    (job) => job.status === 'failed' && job.attemptCount >= maxExportAttempts,
  ).length;
  const failedJobCount = jobs.filter((job) => job.status === 'failed').length;
  const pendingJobCount = jobs.filter(
    (job) => job.status === 'queued' || job.status === 'processing',
  ).length;

  return {
    deadLetterCount,
    failedJobCount,
    pendingJobCount,
    prunedArtifactPaths,
    prunedCompletedExportCount,
    prunedFailedExportCount,
    state: {
      ...state,
      jobs,
    },
  };
}

function isExpired(value: string | undefined, nowMs: number): boolean {
  return value ? Date.parse(value) <= nowMs : false;
}
