module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  clearMocks: true,
  modulePaths: ['<rootDir>/node_modules'],
  transform: { '\\.mjs$': require('jest-expo/jest-preset').transform['\\.[jt]sx?$'] },
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
};
