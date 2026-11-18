module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integracao/'],
};
