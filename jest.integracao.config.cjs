module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integracao'],
  testMatch: ['**/*.test.js'],
  setupFiles: ['<rootDir>/tests/integracao/setup-banco.js'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};
