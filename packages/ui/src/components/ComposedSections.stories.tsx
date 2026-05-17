import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { NumberInput } from './NumberInput';
import { SectionCard } from './SectionCard';

function TargetsSection() {
  return (
    <SectionCard title="Targets" saved>
      <NumberInput label="Calories" value="2200" onChange={() => undefined} />
      <NumberInput label="Protein" value="180" onChange={() => undefined} />
      <Button>Save</Button>
    </SectionCard>
  );
}

const meta: Meta<typeof TargetsSection> = {
  title: 'Composed/Sections',
  component: TargetsSection,
};

export default meta;
type Story = StoryObj<typeof TargetsSection>;

export const Targets: Story = {};
