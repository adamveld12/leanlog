import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DayMeasurementsCard, type MeasurementPatch } from './DayMeasurementsCard';

function Demo({
  shoulder = null,
  waist = null,
  bicep = null,
  thigh = null,
  saved,
  saving,
}: {
  shoulder?: number | null;
  waist?: number | null;
  bicep?: number | null;
  thigh?: number | null;
  saved?: boolean;
  saving?: boolean;
}) {
  const [m, setM] = useState({ shoulder, waist, bicep, thigh });
  return (
    <DayMeasurementsCard
      saved={saved}
      saving={saving}
      shoulderInches={m.shoulder}
      waistInches={m.waist}
      bicepInches={m.bicep}
      thighInches={m.thigh}
      onSave={(patch: MeasurementPatch) =>
        setM((prev) => ({
          shoulder: patch.shoulderInches ?? prev.shoulder,
          waist: patch.waistInches ?? prev.waist,
          bicep: patch.bicepInches ?? prev.bicep,
          thigh: patch.thighInches ?? prev.thigh,
        }))
      }
    />
  );
}

const meta: Meta<typeof DayMeasurementsCard> = {
  title: 'Design System/Organisms/DayMeasurementsCard',
  component: DayMeasurementsCard,
};

export default meta;
type Story = StoryObj<typeof DayMeasurementsCard>;

export const Empty: Story = { render: () => <Demo /> };
export const ShoulderAndWaist: Story = { render: () => <Demo shoulder={50} waist={32} /> };
export const AllSites: Story = {
  render: () => <Demo shoulder={51} waist={31} bicep={15.5} thigh={23} />,
};
export const WaistOnly: Story = { render: () => <Demo waist={33} /> };
export const Saved: Story = { render: () => <Demo shoulder={50} waist={32} saved /> };
export const Saving: Story = { render: () => <Demo shoulder={50} waist={32} saving /> };
