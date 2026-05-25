import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const rawElementRules = [
  {
    selector: 'JSXOpeningElement[name.name="small"]',
    message: 'Use <WarningText> or <HelperText> instead of raw <small>',
  },
  {
    selector: 'JSXOpeningElement[name.name="h3"]',
    message: 'Use <SectionHeading> instead of raw <h3>',
  },
  {
    selector: 'JSXOpeningElement[name.name="h4"]',
    message: 'Use <SectionHeading as="h4"> instead of raw <h4>',
  },
  {
    selector: 'JSXOpeningElement[name.name="p"]',
    message: 'Use <HelperText>, <Text>, or a design system component instead of raw <p>',
  },
  {
    selector: 'JSXOpeningElement[name.name="span"]',
    message: 'Use <UnitText>, <Text>, or a design system component instead of raw <span>',
  },
  {
    selector: 'JSXOpeningElement[name.name="a"]',
    message: 'Use <Button> with as="a" or a router Link component instead of raw <a>',
  },
];

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Outside atoms/analytics, raw typography elements are banned — use design system atoms instead
    // Stories files are exempt: they're demo scaffolding, not production components
    files: ['src/molecules/**/*.tsx', 'src/organisms/**/*.tsx', 'src/templates/**/*.tsx'],
    ignores: ['**/*.stories.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...rawElementRules],
    },
  },
]);
