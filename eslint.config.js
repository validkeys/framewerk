// eslint.config.js (ESLint v9+)
import eslintPluginImport from 'eslint-plugin-import';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      import: eslintPluginImport,
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'import/no-restricted-paths': ['error', {
        zones: [
          {
            target: './packages/core-*',
            from: './packages/!(core-*)',
            message: 'Core packages cannot import from other layers'
          },
          {
            target: './packages/infra-*',
            from: './packages/domain-*',
            message: 'Infrastructure cannot depend on features'
          },
          {
            target: './packages/domain-*',
            from: './packages/app-*',
            message: 'Features cannot depend on apps'
          }
        ]
      }]
    }
  },
  {
    files: ["**/*.js"],
    plugins: {
      import: eslintPluginImport
    },
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: [
          {
            target: './packages/core-*',
            from: './packages/!(core-*)',
            message: 'Core packages cannot import from other layers'
          },
          {
            target: './packages/infra-*',
            from: './packages/domain-*',
            message: 'Infrastructure cannot depend on features'
          },
          {
            target: './packages/domain-*',
            from: './packages/app-*',
            message: 'Features cannot depend on apps'
          }
        ]
      }]
    }
  }
];
