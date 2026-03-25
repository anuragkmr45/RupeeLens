import { Storage } from 'expo-sqlite/kv-store';

import { type CategoryId, type Transaction } from './domain';

export type NotificationAccessState = 'not_started' | 'settings_opened';

export interface PersistedSpendTrackerState {
  notificationAccessState: NotificationAccessState;
  onboardingCompleted: boolean;
  transactions: Transaction[];
}

const STORAGE_KEY = 'spend_tracker_demo_state_v1';

export async function clearStoredSpendTrackerState(): Promise<void> {
  await Storage.removeItem(STORAGE_KEY);
}

export async function loadStoredSpendTrackerState(): Promise<PersistedSpendTrackerState | null> {
  try {
    const storedValue = await Storage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    return isPersistedSpendTrackerState(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export async function saveStoredSpendTrackerState(
  state: PersistedSpendTrackerState,
): Promise<void> {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isPersistedSpendTrackerState(
  value: unknown,
): value is PersistedSpendTrackerState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedSpendTrackerState>;

  return (
    typeof candidate.onboardingCompleted === 'boolean' &&
    isNotificationAccessState(candidate.notificationAccessState) &&
    isTransactionList(candidate.transactions)
  );
}

function isNotificationAccessState(
  value: unknown,
): value is NotificationAccessState {
  return value === 'not_started' || value === 'settings_opened';
}

function isTransactionList(value: unknown): value is Transaction[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return false;
    }

    const candidate = transaction as Partial<Transaction>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.amountMinor === 'number' &&
      typeof candidate.capturedAt === 'string' &&
      typeof candidate.merchant === 'string' &&
      typeof candidate.sourceApp === 'string' &&
      (candidate.status === 'classified' || candidate.status === 'uncategorized') &&
      Array.isArray(candidate.items) &&
      candidate.items.every((item) => isTransactionItem(item))
    );
  });
}

function isTransactionItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    amountMinor?: unknown;
    categoryId?: unknown;
    id?: unknown;
    label?: unknown;
  };

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.amountMinor === 'number' &&
    isCategoryId(candidate.categoryId)
  );
}

function isCategoryId(value: unknown): value is CategoryId {
  return (
    value === 'bills' ||
    value === 'food_drink' ||
    value === 'groceries' ||
    value === 'shopping' ||
    value === 'transport'
  );
}
