import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DayWeightCard } from './DayWeightCard';

function DayWeightDemo({ initial, saved }: { initial: number | null; saved?: boolean }) {
  const [weight, setWeight] = useState<number | null>(initial);
  return (
    <DayWeightCard
      saved={saved}
      weightLbs={weight}
      onWeightChange={(n) => setWeight(n)}
      onWeightBlur={() => undefined}
    />
  );
}

const meta: Meta<typeof DayWeightCard> = {
  title: 'Design System/Organisms/DayWeightCard',
  component: DayWeightCard,
};

export default meta;
type Story = StoryObj<typeof DayWeightCard>;

export const Empty: Story = { render: () => <DayWeightDemo initial={null} /> };
export const WithWeight: Story = { render: () => <DayWeightDemo initial={182} /> };
export const Saved: Story = { render: () => <DayWeightDemo initial={182} saved /> };
