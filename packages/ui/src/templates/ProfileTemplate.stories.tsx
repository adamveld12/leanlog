import type { Meta, StoryObj } from '@storybook/react';
import { BodyInfoCard } from '../organisms/ProfileSectionCards';
import { ProfileTemplate } from './ProfileTemplate';

const meta: Meta<typeof ProfileTemplate> = {
  title: 'Design System/Templates/ProfileTemplate',
  component: ProfileTemplate,
  args: {
    heading: { title: 'Profile', profileHref: '/profile' },
    children: (
      <BodyInfoCard
        weightLbs={180}
        heightInches={70}
        weightError=""
        onWeightChange={() => undefined}
        onHeightChange={() => undefined}
        onWeightBlur={() => undefined}
        onHeightBlur={() => undefined}
      />
    ),
  },
};
export default meta;
type Story = StoryObj<typeof ProfileTemplate>;
export const Default: Story = {};
