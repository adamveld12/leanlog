import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
import { AuthLanding } from './AuthLanding';

const meta: Meta<typeof AuthLanding> = {
  title: 'Design System/Organisms/AuthLanding',
  component: AuthLanding,
  args: {
    appName: 'LeanLog',
    subtitle: 'A quiet, fast nutrition tracker for meals, calories, and macros.',
    highlights: ['Log meals quickly', 'Track calories and macros', 'Keep your data portable'],
    cta: <Button variant="primary">Sign in with Google</Button>,
  },
};

export default meta;
type Story = StoryObj<typeof AuthLanding>;

export const Default: Story = {};

export const WithPricing: Story = {
  args: {
    pricing: (
      <div className="flex flex-col gap-2">
        <Text as="p">Free during beta. No credit card required.</Text>
      </div>
    ),
  },
};

export const CustomApp: Story = {
  args: {
    appName: 'NutriTrack',
    subtitle: 'Simple, fast, and private nutrition tracking.',
    highlights: ['Fast logging', 'Macro breakdown', 'Export your data'],
    cta: <Button variant="primary">Get started</Button>,
  },
};
