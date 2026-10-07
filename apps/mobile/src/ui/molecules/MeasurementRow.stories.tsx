import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { MeasurementRow } from './MeasurementRow';

const meta = {
  title: 'Design System/Molecules/MeasurementRow',
  component: MeasurementRow,
  args: { label: 'Waist', value: 34, onChangeValue: () => {} },
} satisfies Meta<typeof MeasurementRow>;
export default meta;
type Story = StoryObj<typeof meta>;

function Interactive() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <MeasurementRow
      label="Waist"
      value={value}
      onChangeValue={setValue}
      previous={{ value: 34, date: '2026-10-03' }}
    />
  );
}

export const WithPrevious: Story = { render: () => <Interactive /> };
