module.exports = [
  {
    ignores: ['node_modules', 'docs'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-undef': 'error',
      'no-implied-eval': 'error',
    },
  },
];
