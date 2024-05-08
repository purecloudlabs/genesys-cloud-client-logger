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
    './jest.setup.js'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};