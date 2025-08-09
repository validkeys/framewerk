// .eslintrc.js
module.exports = {
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
          from: './packages/feat-*',
          message: 'Infrastructure cannot depend on features'
        },
        {
          target: './packages/feat-*',
          from: './packages/app-*',
          message: 'Features cannot depend on apps'
        }
      ]
    }]
  }
};