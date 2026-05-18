import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      defaultValue: 'system',
      toolbar: {
        icon: 'mirror',
        items: ['system', 'light', 'dark'],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as 'system' | 'light' | 'dark';
      document.documentElement.dataset.theme = theme;
      return Story();
    },
  ],
};

export default preview;
