import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
  initialGlobals: {
    colorMode: 'system',
  },
  globalTypes: {
    colorMode: {
      name: 'Theme',
      toolbar: {
        icon: 'mirror',
        items: ['system', 'light', 'dark'],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const colorMode = (context.globals.colorMode as 'system' | 'light' | 'dark') ?? 'system';
      if (colorMode === 'system') {
        delete document.documentElement.dataset.theme;
        delete document.body.dataset.theme;
      } else {
        document.documentElement.dataset.theme = colorMode;
        document.body.dataset.theme = colorMode;
      }
      return Story();
    },
  ],
};

export default preview;
