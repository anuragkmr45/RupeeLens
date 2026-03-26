module.exports = {
  moduleNameMapper: {
    '^@upi-spend-tracker/mobile-ui$': '<rootDir>/../packages/mobile-ui/src/index.ts',
  },
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
};
