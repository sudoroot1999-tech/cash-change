import type { Config } from 'jest';

const config: Config = {
  displayName: 'wallet-service',
  rootDir: '.',
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@exchange/common$': '<rootDir>/../../libs/common/src',
  },
  
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
  ],
  coverageDirectory: './coverage',
  
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

    // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  

  maxWorkers: '50%',
  testTimeout: 10000,
};

export default config;
