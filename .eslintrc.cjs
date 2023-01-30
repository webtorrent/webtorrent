module.exports = {
  env: {
    es2022: true,
    browser: true,
    node: true,
    serviceworker: true
  },
  extends: ['standard'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    requireConfigFile: false,
    babelOptions: {
      parserOpts: {
        plugins: ['importAssertions']
      }
    }
  },
  ignorePatterns: ['node_modules', 'dist']
}
