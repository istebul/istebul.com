module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  globals: {
    lucide: 'readonly'
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['warn', 'multi-line'],
    'prefer-const': ['warn'],
    'semi': ['error', 'always'],
    'quotes': 'off'
  },
  overrides: [
    {
      files: ['scripts/**/*.js', 'tests/**/*.js'],
      rules: {
        'no-console': 'off',
        'curly': 'off'
      }
    },
    {
      files: ['sw.js'],
      env: {
        serviceworker: true
      },
      rules: {
        'curly': 'off',
        'no-console': 'off'
      }
    },
    {
      files: ['server.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
