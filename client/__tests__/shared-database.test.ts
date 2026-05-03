jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../src/features/spend-tracker/db/migration-runner', () => ({
  applyMobileMigrations: jest.fn(),
}));

interface DatabaseMock {
  execAsync: jest.Mock<Promise<void>, [string]>;
  getAllAsync: jest.Mock<Promise<unknown[]>, [string]>;
  getFirstAsync: jest.Mock<Promise<unknown>, [string]>;
  runAsync: jest.Mock<Promise<unknown>, [string, ...unknown[]]>;
  withTransactionAsync: jest.Mock<Promise<void>, [() => Promise<void>]>;
}

function createDatabaseMock(): DatabaseMock {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => {
      await task();
    }),
  };
}

function getExpoSqliteMock() {
  return jest.requireMock('expo-sqlite') as {
    openDatabaseAsync: jest.Mock<Promise<DatabaseMock>, [string]>;
  };
}

function getMigrationRunnerMock() {
  return jest.requireMock('../src/features/spend-tracker/db/migration-runner') as {
    applyMobileMigrations: jest.Mock<Promise<void>, [DatabaseMock]>;
  };
}

describe('shared spend-tracker database bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('opens the database and applies migrations only once for concurrent callers', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();
    const { applyMobileMigrations } = getMigrationRunnerMock();

    openDatabaseAsync.mockResolvedValue(database);
    applyMobileMigrations.mockResolvedValue(undefined);

    let sharedDatabaseModule =
      {} as typeof import('../src/features/spend-tracker/db/shared-database');

    jest.isolateModules(() => {
      sharedDatabaseModule = jest.requireActual(
        '../src/features/spend-tracker/db/shared-database',
      ) as typeof import('../src/features/spend-tracker/db/shared-database');
    });

    const [firstDatabase, secondDatabase] = await Promise.all([
      sharedDatabaseModule.getSpendTrackerDatabase(),
      sharedDatabaseModule.getSpendTrackerDatabase(),
    ]);

    expect(firstDatabase).toBe(database);
    expect(secondDatabase).toBe(database);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(openDatabaseAsync).toHaveBeenCalledWith('spend-tracker.db');
    expect(applyMobileMigrations).toHaveBeenCalledTimes(1);
    expect(applyMobileMigrations).toHaveBeenCalledWith(database);
  });

  it('serializes concurrent shared-database write tasks', async () => {
    const database = createDatabaseMock();
    const { openDatabaseAsync } = getExpoSqliteMock();
    const { applyMobileMigrations } = getMigrationRunnerMock();
    const executionOrder: string[] = [];
    let releaseFirstTask: (() => void) | null = null;
    const firstTaskFinished = new Promise<void>((resolve) => {
      releaseFirstTask = resolve;
    });

    openDatabaseAsync.mockResolvedValue(database);
    applyMobileMigrations.mockResolvedValue(undefined);

    let sharedDatabaseModule =
      {} as typeof import('../src/features/spend-tracker/db/shared-database');

    jest.isolateModules(() => {
      sharedDatabaseModule = jest.requireActual(
        '../src/features/spend-tracker/db/shared-database',
      ) as typeof import('../src/features/spend-tracker/db/shared-database');
    });

    const firstWrite = sharedDatabaseModule.runSpendTrackerDatabaseWrite(
      async (writeDatabase) => {
        expect(writeDatabase).toBe(database);
        executionOrder.push('first:start');
        await firstTaskFinished;
        executionOrder.push('first:end');
        return 'first-result';
      },
    );
    const secondWrite = sharedDatabaseModule.runSpendTrackerDatabaseWrite(
      async (writeDatabase) => {
        expect(writeDatabase).toBe(database);
        executionOrder.push('second:start');
        executionOrder.push('second:end');
        return 'second-result';
      },
    );

    const release = releaseFirstTask as (() => void) | null;

    if (!release) {
      throw new Error('Expected the first queued database write to be pending');
    }

    release();

    await expect(firstWrite).resolves.toBe('first-result');
    await expect(secondWrite).resolves.toBe('second-result');
    expect(executionOrder).toEqual([
      'first:start',
      'first:end',
      'second:start',
      'second:end',
    ]);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(applyMobileMigrations).toHaveBeenCalledTimes(1);
  });
});
