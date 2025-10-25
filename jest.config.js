/**
 * Jest Configuration for Job Creation Wizard Test Suite
 *
 * Comprehensive testing setup with:
 * - TypeScript support
 * - React Testing Library
 * - MSW for API mocking
 * - Coverage reporting
 * - Accessibility testing (jest-axe)
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Root directory
  rootDir: '.',

  // Module paths
  modulePaths: ['<rootDir>/src'],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@tests/(.*)$': '<rootDir>/src/__tests__/$1',

    // CSS/Style mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Image/Asset mocks
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.ts',
    '<rootDir>/src/__tests__/setup/msw.setup.ts'
  ],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx'
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__tests__/setup/',
    '/__tests__/utils/',
    '/__tests__/__mocks__/'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/jobs/**/*.{ts,tsx}',
    'src/hooks/useJobCreationWizard.ts',
    'src/services/JobServiceExtensions.ts',
    'src/types/job-wizard*.ts',
    '!**/*.d.ts',
    '!**/*.stories.tsx',
    '!**/*.test.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/hooks/useJobCreationWizard.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/services/JobServiceExtensions.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Global test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: false,

  // Force exit after tests
  forceExit: false,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
