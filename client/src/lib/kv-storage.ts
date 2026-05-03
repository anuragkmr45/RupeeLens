import { Storage } from 'expo-sqlite/kv-store';

let storageQueue: Promise<void> = Promise.resolve();

export function getKvItem(key: string): Promise<string | null> {
  return enqueueStorageTask(() => Storage.getItem(key));
}

export function removeKvItem(key: string): Promise<void> {
  return enqueueStorageTask(() => Storage.removeItem(key));
}

export function setKvItem(key: string, value: string): Promise<void> {
  return enqueueStorageTask(() => Storage.setItem(key, value));
}

function enqueueStorageTask<T>(task: () => Promise<T>): Promise<T> {
  const nextTask = storageQueue.then(task, task);
  storageQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );
  return nextTask;
}

export function resetKvStorageQueueForTests(): void {
  storageQueue = Promise.resolve();
}
