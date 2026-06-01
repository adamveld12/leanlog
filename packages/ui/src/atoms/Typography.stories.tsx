import type { Meta, StoryObj } from '@storybook/react';
import { HelperText } from './HelperText';
import { PageTitle } from './PageTitle';
import { SectionHeading } from './SectionHeading';
import { Text } from './Text';
import { UnitText } from './UnitText';
import { WarningText } from './WarningText';

function Typography() {
  return (
    <div className="flex min-w-[320px] flex-col gap-4">
      <PageTitle>Page title</PageTitle>
      <PageTitle hero>Hero title</PageTitle>
      <SectionHeading>Section heading</SectionHeading>
      <HelperText>Helper text explains a constraint without competing with totals.</HelperText>
      <WarningText>Warning text explains a validation issue.</WarningText>
      <Text as="p" variant="body">
        Calories<UnitText> kcal</UnitText>
      </Text>
    </div>
  );
}

const meta: Meta<typeof Typography> = {
  title: 'Design System/Atoms/Typography',
  component: Typography,
};
export default meta;
type Story = StoryObj<typeof Typography>;
export const Default: Story = {};
