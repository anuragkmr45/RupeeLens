import type { IsoUtcDateTimeString } from '@upi-spend-tracker/shared-types';

export type SyncEntityType =
  | 'transaction'
  | 'transaction_item'
  | 'category'
  | 'merchant'
  | 'merchant_alias'
  | 'rule'
  | 'budget'
  | 'budget_scope';

export type SyncOperationType = 'upsert' | 'delete';
export type SyncAckStatus = 'accepted' | 'idempotent_replay';

export interface FieldError {
  field: string;
  message: string;
}

export interface OutboxOperation {
  entityId: string;
  entityType: SyncEntityType;
  entityVersion: number;
  occurredAt?: IsoUtcDateTimeString;
  opId: string;
  opType: SyncOperationType;
  payload: Record<string, unknown>;
}

export interface SyncPushRequest {
  baseCursor?: string;
  deviceId: string;
  operations: OutboxOperation[];
}

export interface OperationAck {
  entityId: string;
  entityType: SyncEntityType;
  opId: string;
  serverVersion: number;
  status?: SyncAckStatus;
}

export interface OperationRejection {
  code: string;
  fieldErrors?: FieldError[];
  message: string;
  opId: string;
}

export interface ConflictRecord {
  clientVersion: number;
  conflictReason?: string;
  entityId: string;
  entityType: SyncEntityType;
  serverState: Record<string, unknown>;
  serverVersion: number;
}

export interface SyncPushResponse {
  accepted: OperationAck[];
  conflicts?: ConflictRecord[];
  newCursor: string;
  rejected: OperationRejection[];
}

export interface EntityChange {
  changeType: SyncOperationType;
  data: Record<string, unknown>;
  entityId: string;
  entityType: SyncEntityType;
  updatedAt?: IsoUtcDateTimeString;
  version: number;
}

export interface SyncPullResponse {
  changes: EntityChange[];
  cursor: string;
  hasMore: boolean;
}
