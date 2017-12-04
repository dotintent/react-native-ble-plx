// jest.config.js
module.exports = {
  verbose: true,
  preset: "react-native",
  // Only include files directly in __tests__, not in nested folders.
  testRegex: '/__tests__/[^/]*(\\.js|\\.coffee|[^d]\\.ts)$',
  "modulePathIgnorePatterns": ["<rootDir>/examples/ReactBLEScanner/noode_modules/*"]
}
