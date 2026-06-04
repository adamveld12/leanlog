import type { Meta, StoryObj } from '@storybook/react';
import { HelperText } from '../atoms/HelperText';
import { ErrorTemplate } from './ErrorTemplate';

const meta: Meta<typeof ErrorTemplate> = {
  title: 'Design System/Templates/ErrorTemplate',
  component: ErrorTemplate,
  args: {
    title: 'Unable to load LeanLog',
    message: 'API returned invalid payload (Not JSON) for /api/days',
    homeHref: '/',
    retryLabel: 'Refresh page',
    onRetry: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof ErrorTemplate>;

export const Default: Story = {};

export const WithDetails: Story = {
  args: {
    details: <HelperText as="p">Local API may be serving the Vite app instead of JSON.</HelperText>,
  },
};
