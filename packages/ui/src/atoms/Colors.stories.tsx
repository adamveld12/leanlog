import type { Meta, StoryObj } from '@storybook/react';

function Colors() {
  const tokens = [
    '--ll-bg',
    '--ll-surface',
    '--ll-text',
    '--ll-text-muted',
    '--ll-line',
    '--ll-line-strong',
    '--ll-danger',
    '--ll-warn',
    '--ll-saved',
    '--ll-focus',
  ];
  return (
    <div className="grid min-w-[320px] gap-2">
      {tokens.map((token) => (
        <div
          key={token}
          className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--ll-line)] bg-[var(--ll-surface)] p-3 text-sm text-[var(--ll-text)]"
        >
          <span>{token}</span>
          <span
            className="h-6 w-12 rounded-[10px] border border-[var(--ll-line)]"
            style={{ background: `var(${token})` }}
          />
        </div>
      ))}
    </div>
  );
}

const meta: Meta<typeof Colors> = {
  title: 'Design System/Atoms/Colors',
  component: Colors,
};
export default meta;
type Story = StoryObj<typeof Colors>;
export const Default: Story = {};
