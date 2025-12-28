import type { Config } from 'jest';

const config: Config = {
  // Root config for the monorepo
  projects: [
    '<rootDir>/services/*/jest.config.ts',
  ],
  
  // Global settings
  verbose: true,
  
  // Coverage settings
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/main.ts',
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/setup/global-setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',
};

export default config;
