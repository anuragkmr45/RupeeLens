jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

function getKvStoreMock() {
  return jest.requireMock('expo-sqlite/kv-store') as {
    Storage: {
      getItem: jest.Mock<Promise<string | null>, [string]>;
      removeItem: jest.Mock<Promise<void>, [string]>;
      setItem: jest.Mock<Promise<void>, [string, string]>;
    };
  };
}

describe('kv storage wrapper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('serializes queued storage operations to avoid concurrent sqlite access', async () => {
    const executionOrder: string[] = [];
    let releaseFirstTask: (() => void) | null = null;
    const firstTaskFinished = new Promise<void>((resolve) => {
      releaseFirstTask = resolve;
    });

    const { Storage } = getKvStoreMock();

    Storage.getItem.mockImplementationOnce(async () => {
      executionOrder.push('first:start');
      await firstTaskFinished;
      executionOrder.push('first:end');
      return 'first-value';
    });
    Storage.getItem.mockImplementationOnce(async () => {
      executionOrder.push('second:start');
      executionOrder.push('second:end');
      return 'second-value';
    });

    let kvStorageModule = {} as typeof import('../src/lib/kv-storage');

    jest.isolateModules(() => {
      kvStorageModule = jest.requireActual(
        '../src/lib/kv-storage',
      ) as typeof import('../src/lib/kv-storage');
    });

    const firstRequest = kvStorageModule.getKvItem('first');
    const secondRequest = kvStorageModule.getKvItem('second');

    await Promise.resolve();
    expect(executionOrder).toEqual(['first:start']);

    const release = releaseFirstTask as (() => void) | null;

    if (!release) {
      throw new Error('Expected the first queued task to be pending');
    }

    release();

    await expect(firstRequest).resolves.toBe('first-value');
    await expect(secondRequest).resolves.toBe('second-value');
    expect(executionOrder).toEqual([
      'first:start',
      'first:end',
      'second:start',
      'second:end',
    ]);
  });
});
