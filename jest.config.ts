import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // dist/ holds compiled copies of the tests; running them duplicates the
  // suite against stale build output.
  testPathIgnorePatterns: ['/dist/'],
  // tsconfig.json's explicit "types" list omits jest, which makes ts-jest
  // fail on test globals (Cannot find name 'it'/'expect'/'jest'). Supply the
  // test-time type set here instead of touching the production tsconfig.
  globals: {
    'ts-jest': {
      tsconfig: {
        types: ['node', 'jest'],
      },
    },
  },
};

export default config;
