module.exports = {
  roots: ['<rootDir>/__tests__'],
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(.*react-native.*))/'
  ]
}
