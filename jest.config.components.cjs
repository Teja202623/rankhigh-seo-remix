module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/components/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/build/', '/dist/', '/e2e/'],
  collectCoverageFrom: [
    'app/**/*.{tsx}',
    '!app/**/*.d.ts',
    '!app/routes/**',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  bail: false,
  maxWorkers: '50%',
  transformIgnorePatterns: ['/node_modules/']
};
