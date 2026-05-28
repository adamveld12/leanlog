import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

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
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message: 'Use <Button> from @leanlog/ui instead of raw <button>',
        },
        {
          selector: 'JSXOpeningElement[name.name="input"]',
          message:
            'Use <Input>, <NumberInput>, or <IntegerInput> from @leanlog/ui instead of raw <input>',
        },
        {
          selector: 'JSXOpeningElement[name.name="select"]',
          message: 'Use <Select> from @leanlog/ui instead of raw <select>',
        },
        {
          selector: 'JSXOpeningElement[name.name="textarea"]',
          message: 'Use a design system atom instead of raw <textarea>',
        },
        {
          selector: 'JSXOpeningElement[name.name="label"]',
          message: 'Use <Label> from @leanlog/ui instead of raw <label>',
        },
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
      ],
    },
  },
]);
