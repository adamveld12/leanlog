import type { Meta, StoryObj } from '@storybook/react';
import { SilhouetteGuide } from './SilhouetteGuide';

const meta: Meta<typeof SilhouetteGuide> = {
  title: 'Design System/Molecules/SilhouetteGuide',
  component: SilhouetteGuide,
};

export default meta;
type Story = StoryObj<typeof SilhouetteGuide>;

// The guide is positioned absolutely over a viewfinder; the dark box stands in
// for the live camera feed so the translucent outline is visible.
export const OverViewfinder: Story = {
  render: () => (
    <div style={{ position: 'relative', width: 240, height: 320, background: '#1f2937' }}>
      <SilhouetteGuide />
    </div>
  ),
};
