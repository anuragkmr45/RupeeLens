module.exports = {
  moduleNameMapper: {
    '^@upi-spend-tracker/contracts$': '<rootDir>/../packages/contracts/src/index.ts',
    '^@upi-spend-tracker/mobile-ui$': '<rootDir>/../packages/mobile-ui/src/index.ts',
    '^@upi-spend-tracker/shared-utils$': '<rootDir>/../packages/shared-utils/src/index.ts',
    '^\\./integrity\\.js$': '<rootDir>/../packages/shared-utils/src/integrity.ts',
    '^\\./time\\.js$': '<rootDir>/../packages/shared-utils/src/time.ts',
    '^\\./version\\.js$': '<rootDir>/../packages/shared-utils/src/version.ts',
  },
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
};
