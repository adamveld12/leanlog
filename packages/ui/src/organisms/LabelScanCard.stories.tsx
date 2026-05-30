import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { LabelScanCard, type LabelScanValue } from './LabelScanCard';

const meta: Meta<typeof LabelScanCard> = {
  title: 'Design System/Organisms/LabelScanCard',
  component: LabelScanCard,
};

export default meta;
type Story = StoryObj<typeof LabelScanCard>;

function Demo(initial: Partial<LabelScanValue> & { loading?: boolean; error?: string }) {
  const [value, setValue] = useState<LabelScanValue>({
    name: '',
    checkForServings: false,
    entirePackage: false,
    amount: 0,
    ...initial,
  });
  return (
    <LabelScanCard
      value={value}
      loading={initial.loading}
      error={initial.error}
      onChange={setValue}
      onScan={() => {}}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const ServingsMode: Story = { render: () => <Demo checkForServings amount={2} /> };
export const EntirePackage: Story = { render: () => <Demo entirePackage /> };
export const Loading: Story = { render: () => <Demo name="Granola" amount={30} loading /> };
export const Error: Story = {
  render: () => <Demo name="Granola" error="Scan failed. Try again with a clearer label photo." />,
};
