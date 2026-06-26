import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { Text } from '../atoms/Text';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

// Only the sites carrying a positive value are sent. Clearing a logged site is
// unsupported (consistent with weight).
export type MeasurementPatch = {
  shoulderInches?: number;
  waistInches?: number;
  bicepInches?: number;
  thighInches?: number;
};

type TodayMeasurements = {
  shoulderInches: number | null;
  waistInches: number | null;
  bicepInches: number | null;
  thighInches: number | null;
};

// The most-recent COMPLETE (all four) measurement set across days, used for the
// auto-collapsed weekly summary — today's day is usually null mid-week.
export type LatestMeasurements = {
  shoulderInches: number;
  waistInches: number;
  bicepInches: number;
  thighInches: number;
  vTaper: number; // pre-rounded by the selector
  date: string; // ISO YYYY-MM-DD it was logged
};

export type BodyTrackingCardProps = {
  // Weight (daily) — a hard block until today's weight is logged.
  weightLbs: number | null;
  savingWeight?: boolean;
  onSaveWeight: (weightLbs: number) => void;
  // Measurements (weekly) — a hard block when overdue (all four required).
  measurementsToday: TodayMeasurements;
  latestMeasurements: LatestMeasurements | null;
  measurementsDue: boolean;
  savingMeasurements?: boolean;
  onSaveMeasurements: (patch: MeasurementPatch) => void;
};

type MeasDraft = {
  shoulder: number | null;
  waist: number | null;
  bicep: number | null;
  thigh: number | null;
};

const WEIGHT_HINT =
  'Weigh in first thing in the morning, after the bathroom, before eating or drinking.';
const SIDE_HINT = 'Measure your right side — consistency matters more than which side.';

// Inlined shoulder ÷ waist to 2 decimals, matching roundVTaper in
// @leanlog/data-access (packages/ui stays dependency-free). Null unless both > 0.
function displayVTaper(shoulder: number | null, waist: number | null): string | null {
  if (shoulder == null || waist == null || shoulder <= 0 || waist <= 0) return null;
  return (Math.round((shoulder / waist) * 100) / 100).toFixed(2);
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Each sub-section collapses automatically: it shows a compact summary once its
// requirement is satisfied (weight logged today / a complete measurement set this
// week) and the editor — a hard block — until then. No manual toggle. The card is
// keyed per-day by the page, so the editor drafts reset on day change via remount.
export function BodyTrackingCard({
  weightLbs,
  savingWeight,
  onSaveWeight,
  measurementsToday,
  latestMeasurements,
  measurementsDue,
  savingMeasurements,
  onSaveMeasurements,
}: BodyTrackingCardProps) {
  // Seeded once from the prop; the editor unmounts the moment weight is logged
  // (and the page keys the card per-day), so it never holds a stale copy.
  const [weightDraft, setWeightDraft] = useState<number | null>(() => weightLbs);
  const [meas, setMeas] = useState<MeasDraft>(() => ({
    shoulder: measurementsToday.shoulderInches,
    waist: measurementsToday.waistInches,
    bicep: measurementsToday.bicepInches,
    thigh: measurementsToday.thighInches,
  }));

  const canSaveWeight = !savingWeight && weightDraft != null && weightDraft > 0;

  const allFour = [meas.shoulder, meas.waist, meas.bicep, meas.thigh].every(
    (v) => v != null && v > 0,
  );
  const canSaveMeas = !savingMeasurements && allFour;
  const vtaper = displayVTaper(meas.shoulder, meas.waist);

  const setMeasField = (key: keyof MeasDraft) => (value: number | null) =>
    setMeas((m) => ({ ...m, [key]: value }));

  function handleSaveMeas() {
    const patch: MeasurementPatch = {};
    if (meas.shoulder != null && meas.shoulder > 0) patch.shoulderInches = meas.shoulder;
    if (meas.waist != null && meas.waist > 0) patch.waistInches = meas.waist;
    if (meas.bicep != null && meas.bicep > 0) patch.bicepInches = meas.bicep;
    if (meas.thigh != null && meas.thigh > 0) patch.thighInches = meas.thigh;
    onSaveMeasurements(patch);
  }

  return (
    <AnalyticsScope properties={{ organism: 'BodyTrackingCard' }}>
      <SectionCard title="Measurements">
        {weightLbs != null ? (
          <Text variant="meta">
            Weight today:{' '}
            <Text as="span" variant="body" className="font-semibold">
              {weightLbs} lbs
            </Text>
          </Text>
        ) : (
          <div className={recipes.stack.sm}>
            <WarningText>Required — log today’s weight.</WarningText>
            <div className={recipes.stack.rowEnd}>
              <NumberInput
                label="Weight (lbs)"
                value={weightDraft}
                placeholder="e.g. 180"
                onChange={setWeightDraft}
                labelClassName="flex-1"
              />
              <Button
                variant="primary"
                disabled={!canSaveWeight}
                onClick={() => {
                  if (weightDraft != null && weightDraft > 0) onSaveWeight(weightDraft);
                }}
              >
                {savingWeight ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <HelperText as="p">{WEIGHT_HINT}</HelperText>
          </div>
        )}

        <div className="border-t border-[var(--ll-line)]" />

        {measurementsDue ? (
          <div className={recipes.stack.sm}>
            <WarningText>Required — log all four measurements (due weekly).</WarningText>
            <div className={recipes.grid.two}>
              <NumberInput
                label="Shoulder (in)"
                value={meas.shoulder}
                placeholder="e.g. 50"
                onChange={setMeasField('shoulder')}
              />
              <NumberInput
                label="Waist (in)"
                value={meas.waist}
                placeholder="e.g. 32"
                onChange={setMeasField('waist')}
              />
              <div className={recipes.stack.xs}>
                <NumberInput
                  label="Bicep · right (in)"
                  value={meas.bicep}
                  placeholder="e.g. 15"
                  onChange={setMeasField('bicep')}
                />
                <HelperText as="p">{SIDE_HINT}</HelperText>
              </div>
              <div className={recipes.stack.xs}>
                <NumberInput
                  label="Thigh · right (in)"
                  value={meas.thigh}
                  placeholder="e.g. 23"
                  onChange={setMeasField('thigh')}
                />
                <HelperText as="p">{SIDE_HINT}</HelperText>
              </div>
            </div>
            {vtaper != null ? (
              <Text as="p" variant="meta">
                V-Taper today:{' '}
                <Text as="span" variant="body" className="font-semibold">
                  {vtaper}
                </Text>{' '}
                (shoulder ÷ waist)
              </Text>
            ) : (
              <HelperText as="p">Log shoulder and waist to see today’s v-taper.</HelperText>
            )}
            <div className={recipes.stack.rowEnd}>
              <Button variant="primary" disabled={!canSaveMeas} onClick={handleSaveMeas}>
                {savingMeasurements ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : latestMeasurements != null ? (
          <div className={recipes.stack.xs}>
            <Text variant="meta">
              Last measured {formatShortDate(latestMeasurements.date)} · V-Taper{' '}
              <Text as="span" variant="body" className="font-semibold">
                {latestMeasurements.vTaper.toFixed(2)}
              </Text>
            </Text>
            <HelperText as="p">
              Shoulder {latestMeasurements.shoulderInches} · Waist {latestMeasurements.waistInches}{' '}
              · Bicep {latestMeasurements.bicepInches} · Thigh {latestMeasurements.thighInches} (in)
            </HelperText>
          </div>
        ) : (
          <Text variant="meta">No measurements logged yet</Text>
        )}
      </SectionCard>
    </AnalyticsScope>
  );
}
