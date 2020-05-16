module.exports = {
    // preset: 'ts-jest',
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