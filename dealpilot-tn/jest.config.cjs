module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>'],
  moduleDirectories: ['web/node_modules', 'node_modules'],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/web/src/$1",
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
