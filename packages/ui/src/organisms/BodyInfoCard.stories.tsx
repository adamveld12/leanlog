import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BodyInfoCard } from './BodyInfoCard';

function BodyInfoDemo() {
  const [weight, setWeight] = useState<number | null>(180);
  const [height, setHeight] = useState<number | null>(70);
  return (
    <BodyInfoCard
      saved
      weightLbs={weight}
      heightInches={height}
      weightError=""
      onWeightChange={setWeight}
      onHeightChange={setHeight}
      onWeightBlur={() => undefined}
      onHeightBlur={() => undefined}
    />
  );
}

const meta: Meta<typeof BodyInfoCard> = {
  title: 'Design System/Organisms/BodyInfoCard',
  component: BodyInfoCard,
};

export default meta;
type Story = StoryObj<typeof BodyInfoCard>;

export const Default: Story = { render: () => <BodyInfoDemo /> };
