import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Collapsible } from './Collapsible';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';

function Demo({
  initialOpen = false,
  locked = false,
}: {
  initialOpen?: boolean;
  locked?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Collapsible
      open={open}
      onToggle={() => setOpen((o) => !o)}
      locked={locked}
      summary={<Text variant="meta">Weight: 182 lbs</Text>}
      editLabel="Edit"
    >
      <HelperText as="p">Expanded content goes here — inputs, a Save button, etc.</HelperText>
    </Collapsible>
  );
}

const meta: Meta<typeof Collapsible> = {
  title: 'Design System/Molecules/Collapsible',
  component: Collapsible,
};

export default meta;
type Story = StoryObj<typeof Collapsible>;

export const Collapsed: Story = { render: () => <Demo /> };
export const Expanded: Story = { render: () => <Demo initialOpen /> };
export const Locked: Story = { render: () => <Demo initialOpen locked /> };
