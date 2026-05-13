module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|js)'
  ],
  setupFiles: [
    '<rootDir>/tests/setup.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/unit',
      outputName: 'test-results.xml'
    }]
  ],
};