import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Label } from './Label';

function Demo() {
  return (
    <Label>
      <span>Ingredient title</span>
      <Input placeholder="CHICKEN" />
    </Label>
  );
}

const meta: Meta<typeof Demo> = { title: 'Design System/Atoms/Label', component: Demo };
export default meta;
type Story = StoryObj<typeof Demo>;
export const Default: Story = {};
