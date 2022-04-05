/**
 * @jest-environment jsdom
 */

module.exports = {
    // preset: 'ts-jest',
    testEnvironment: 'jsdom',
    rootDir: '.',
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testMatch: ['**/?(*.)(test|spec).(ts|tsx|js)'],
    moduleNameMapper: {
        '@eslint/eslintrc/universal': '@eslint/eslintrc/dist/eslintrc-universal.cjs',
    },
};
