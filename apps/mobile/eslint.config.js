const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      'android',
      'ios',
      '.expo',
      'dist',
      'node_modules',
      'src/db/migrations/**',
      '.rnstorybook/storybook.requires.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
  {
    // Design system: screens and molecules build from atoms in src/ui/atoms.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', '.rnstorybook/**/*.{ts,tsx}'],
    ignores: ['src/ui/atoms/**', '**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['Text', 'TextInput', 'Pressable', 'TouchableOpacity'].map((name) => ({
            name: 'react-native',
            importNames: [name],
            message: `Use the mobile design system atom instead of react-native's ${name} (see src/ui/atoms).`,
          })),
        },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
