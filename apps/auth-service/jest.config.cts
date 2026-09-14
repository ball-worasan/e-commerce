/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'auth-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  transformIgnorePatterns: [
    'node_modules/(?!.*@nestjs)',
    'libs/prisma-client-auth/src/generated',
  ],
  // The generated Prisma client isn't a real workspace package (no
  // node_modules symlink) — it's reached only via the tsconfig.app.json
  // path mapping. Jest's default resolver can't see tsconfig paths, and
  // its TS-based fallback resolves to the .d.ts (types) file instead of
  // the runtime .js, so map it explicitly here.
  moduleNameMapper: {
    '^@ecommerce/prisma-client-auth$':
      '<rootDir>/../../libs/prisma-client-auth/src/generated/index.js',
  },
  coverageDirectory: 'test-output/jest/coverage',
};
