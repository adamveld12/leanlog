import type { Meta, StoryObj } from '@storybook/react';
import { Text } from '../atoms/Text';
import { recipes } from '../styles/recipes';
import { Tabs } from './Tabs';

const tabs = [
  { key: 'overview', label: 'Overview', panelId: 'story-overview-panel' },
  { key: 'meals', label: 'Meals', panelId: 'story-meals-panel' },
  { key: 'macros', label: 'Macros', panelId: 'story-macros-panel' },
];

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Molecules/Tabs',
  component: Tabs,
  args: {
    tabs,
    active: 'overview',
    onChange: () => {},
    label: 'Day summary section',
  },
  // Render the active tab's panel so aria-controls resolves to a real element.
  render: (args) => {
    const active = args.tabs.find((tab) => tab.key === args.active) ?? args.tabs[0];
    return (
      <div className={recipes.stack.sm}>
        <Tabs {...args} />
        <div
          role="tabpanel"
          id={active.panelId}
          aria-labelledby={active.panelId ? `${active.panelId}-tab` : undefined}
        >
          <Text as="p" variant="body">
            {active.label} panel content
          </Text>
        </div>
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {};

export const SecondActive: Story = {
  args: { active: 'meals' },
};

export const ThirdActive: Story = {
  args: { active: 'macros' },
};
