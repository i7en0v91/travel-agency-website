import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'no-console': 'off', // terser drop_console in production used
      semi: ['warn', 'always'],
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/unified-signatures': ['warn']
    }
  }
)