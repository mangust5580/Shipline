
import js from '@eslint/js'
import globals from 'globals'

export default [
  
  {
    ignores: ['dist/**', 'public/**', 'node_modules/**'],
  },

  
  js.configs.recommended,

  
  {
    files: ['src/**/*.{js,mjs,cjs}'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },

    rules: {
      
      'no-console': 'off', 
    },
  },

  
  {
    files: ['gulp/**/*.{js,mjs}', 'config/**/*.{js,mjs}', 'scripts/**/*.{js,mjs}', '*.js', '*.mjs'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
]
