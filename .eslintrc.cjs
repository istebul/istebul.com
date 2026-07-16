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
      files: [
        'src/ai-core/**/*.ts',
        'src/restaurant-knowledge/**/*.ts',
        'src/ai-concierge/**/*.ts',
        'src/ai-actions/**/*.ts',
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-undef': 'off',
      },
    },
    {
      files: [
        'apps/restaurant-admin-erp/**/*.{ts,tsx}',
        'apps/restaurant-customer-cx/**/*.{ts,tsx}',
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'react', 'react-hooks'],
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-undef': 'off',
      },
    },
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
