module.exports = {
  extends: [
    '@nuxtjs/eslint-config-typescript'
  ],
  rules: {
    'no-console': 'off', // terser drop_console in production used
    semi: ['warn', 'always'],
    '@typescript-eslint/semi': ['warn']
  }
};
