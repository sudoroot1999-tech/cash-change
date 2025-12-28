import type { Config } from 'jest';

const config: Config = {
  displayName: 'user-service',
  rootDir: '.',
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Module resolution
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@exchange/common$': '<rootDir>/../../libs/common/src',
  },
  
  // Test patterns
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
  ],
  coverageDirectory: './coverage',
  
  // Transform settings
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  
  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  
  // Performance
  maxWorkers: '50%',
  testTimeout: 10000,
};

export default config;
