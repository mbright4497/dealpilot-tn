module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>'],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/web/src/$1"
  }
};
