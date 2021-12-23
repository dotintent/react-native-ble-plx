module.exports = {
  root: true,
  extends: '@react-native-community',
  rules: {
    semi: [1, 'never'],
    'react-native/no-inline-styles': 0,
    quotes: [1, 'single', { avoidEscape: true, allowTemplateLiterals: true }],
  },
}
