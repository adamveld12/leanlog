import type { Preview } from '@storybook/react-native';
import { UnitsProvider } from '../src/ui/units';
import { StoryFrame } from './StoryFrame';

const preview: Preview = {
  decorators: [
    (Story) => (
      <UnitsProvider unitSystem="imperial">
        <StoryFrame>
          <Story />
        </StoryFrame>
      </UnitsProvider>
    ),
  ],
};

export default preview;
