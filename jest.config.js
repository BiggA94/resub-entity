/**
 * @jest-environment jsdom
 */

module.exports = {
    // preset: 'ts-jest',
    testEnvironment: 'jsdom',
    rootDir: '.',
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js"
    ],
    setupFilesAfterEnv: [
        "<rootDir>/src/setupTests.js"
    ],
    testMatch: [
        "**/?(*.)(test|spec).(ts|tsx|js)"
    ]
}
