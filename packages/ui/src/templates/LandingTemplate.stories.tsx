import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { LandingTemplate } from './LandingTemplate';

const meta: Meta<typeof LandingTemplate> = {
  title: 'Design System/Templates/LandingTemplate',
  component: LandingTemplate,
  args: {
    cta: (
      <Button fullWidth className="md:w-auto">
        Sign in / Sign up
      </Button>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof LandingTemplate>;
export const Default: Story = {};
