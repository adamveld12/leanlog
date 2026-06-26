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

// The most-recent COMPLETE (all four) measurement set standing for this day, used
// for the collapsed summary — the viewed day usually has none of its own.
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
  // Past days are read-only: values are shown, never editable (#68). Server-side
  // the day guard also rejects past-day writes.
  readOnly?: boolean;
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

// Each section auto-collapses to a compact summary once satisfied (weight logged /
// a complete weekly set exists) and shows an editor — a hard block — until then.
// On the current day a logged summary carries an Edit button that re-opens the
// editor (with Cancel); past days are fully read-only. The card is keyed per-day
// by the page, so editor drafts reset on day change via remount.
export function BodyTrackingCard({
  weightLbs,
  savingWeight,
  onSaveWeight,
  measurementsToday,
  latestMeasurements,
  measurementsDue,
  savingMeasurements,
  onSaveMeasurements,
  readOnly = false,
}: BodyTrackingCardProps) {
  const [weight, setWeight] = useState<{ editing: boolean; draft: number | null }>(() => ({
    editing: false,
    draft: weightLbs,
  }));
  const [meas, setMeas] = useState<{ editing: boolean; draft: MeasDraft }>(() => ({
    editing: false,
    draft: {
      shoulder: measurementsToday.shoulderInches,
      waist: measurementsToday.waistInches,
      bicep: measurementsToday.bicepInches,
      thigh: measurementsToday.thighInches,
    },
  }));

  // --- weight ---
  const wd = weight.draft;
  const canSaveWeight = !savingWeight && wd != null && wd > 0;
  const weightHardBlock = !readOnly && weightLbs == null;
  const weightShowEditor = weightHardBlock || (!readOnly && weight.editing);

  function saveWeight() {
    if (wd == null || wd <= 0) return;
    onSaveWeight(wd);
    // Editing an already-logged value doesn't flip the logged status, so collapse
    // optimistically; the required flow collapses naturally when weightLbs fills.
    setWeight((w) => ({ ...w, editing: false }));
  }

  // --- measurements ---
  const md = meas.draft;
  const allFour = [md.shoulder, md.waist, md.bicep, md.thigh].every((v) => v != null && v > 0);
  const canSaveMeas = !savingMeasurements && allFour;
  const vtaper = displayVTaper(md.shoulder, md.waist);
  const measHardBlock = !readOnly && measurementsDue;
  const measShowEditor = measHardBlock || (!readOnly && meas.editing);

  const setMeasField = (key: keyof MeasDraft) => (value: number | null) =>
    setMeas((m) => ({ ...m, draft: { ...m.draft, [key]: value } }));

  function startEditMeas() {
    // Seed from the standing set so the user edits the known four values.
    const seed: MeasDraft = latestMeasurements
      ? {
          shoulder: latestMeasurements.shoulderInches,
          waist: latestMeasurements.waistInches,
          bicep: latestMeasurements.bicepInches,
          thigh: latestMeasurements.thighInches,
        }
      : meas.draft;
    setMeas({ editing: true, draft: seed });
  }

  function saveMeas() {
    if (!allFour) return;
    const patch: MeasurementPatch = {};
    if (md.shoulder != null && md.shoulder > 0) patch.shoulderInches = md.shoulder;
    if (md.waist != null && md.waist > 0) patch.waistInches = md.waist;
    if (md.bicep != null && md.bicep > 0) patch.bicepInches = md.bicep;
    if (md.thigh != null && md.thigh > 0) patch.thighInches = md.thigh;
    onSaveMeasurements(patch);
    setMeas((m) => ({ ...m, editing: false }));
  }

  return (
    <AnalyticsScope properties={{ organism: 'BodyTrackingCard' }}>
      <SectionCard title="Measurements">
        {weightShowEditor ? (
          <div className={recipes.stack.sm}>
            {weightHardBlock ? <WarningText>Required — log today’s weight.</WarningText> : null}
            <NumberInput
              label="Weight (lbs)"
              value={wd}
              placeholder="e.g. 180"
              onChange={(v) => setWeight((w) => ({ ...w, draft: v }))}
            />
            <HelperText as="p">{WEIGHT_HINT}</HelperText>
            <div className={recipes.stack.actions}>
              {weight.editing && !weightHardBlock ? (
                <Button
                  variant="secondary"
                  onClick={() => setWeight((w) => ({ ...w, editing: false }))}
                >
                  Cancel
                </Button>
              ) : null}
              <Button variant="primary" disabled={!canSaveWeight} onClick={saveWeight}>
                {savingWeight ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className={recipes.stack.rowBetween}>
            <Text variant="meta">
              {weightLbs != null ? (
                <>
                  Weight:{' '}
                  <Text as="span" variant="body" className="font-semibold">
                    {weightLbs} lbs
                  </Text>
                </>
              ) : (
                'No weight logged'
              )}
            </Text>
            {!readOnly && weightLbs != null ? (
              <Button
                variant="secondary"
                onClick={() => setWeight({ editing: true, draft: weightLbs })}
              >
                Edit
              </Button>
            ) : null}
          </div>
        )}

        <div className="border-t border-[var(--ll-line)]" />

        {measShowEditor ? (
          <div className={recipes.stack.sm}>
            {measHardBlock ? (
              <WarningText>Required — log all four measurements (due weekly).</WarningText>
            ) : null}
            <div className={recipes.grid.two}>
              <NumberInput
                label="Shoulder (in)"
                value={md.shoulder}
                placeholder="e.g. 50"
                onChange={setMeasField('shoulder')}
              />
              <NumberInput
                label="Waist (in)"
                value={md.waist}
                placeholder="e.g. 32"
                onChange={setMeasField('waist')}
              />
              <div className={recipes.stack.xs}>
                <NumberInput
                  label="Bicep · right (in)"
                  value={md.bicep}
                  placeholder="e.g. 15"
                  onChange={setMeasField('bicep')}
                />
                <HelperText as="p">{SIDE_HINT}</HelperText>
              </div>
              <div className={recipes.stack.xs}>
                <NumberInput
                  label="Thigh · right (in)"
                  value={md.thigh}
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
            <div className={recipes.stack.actions}>
              {meas.editing && !measHardBlock ? (
                <Button
                  variant="secondary"
                  onClick={() => setMeas((m) => ({ ...m, editing: false }))}
                >
                  Cancel
                </Button>
              ) : null}
              <Button variant="primary" disabled={!canSaveMeas} onClick={saveMeas}>
                {savingMeasurements ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className={recipes.stack.sm}>
            <div className={recipes.stack.rowBetween}>
              {latestMeasurements != null ? (
                <Text variant="meta">
                  Last measured {formatShortDate(latestMeasurements.date)} · V-Taper{' '}
                  <Text as="span" variant="body" className="font-semibold">
                    {latestMeasurements.vTaper.toFixed(2)}
                  </Text>
                </Text>
              ) : (
                <Text variant="meta">No measurements logged</Text>
              )}
              {!readOnly && latestMeasurements != null ? (
                <Button variant="secondary" onClick={startEditMeas}>
                  Edit
                </Button>
              ) : null}
            </div>
            {latestMeasurements != null ? (
              <HelperText as="p">
                Shoulder {latestMeasurements.shoulderInches} · Waist{' '}
                {latestMeasurements.waistInches} · Bicep {latestMeasurements.bicepInches} · Thigh{' '}
                {latestMeasurements.thighInches} (in)
              </HelperText>
            ) : null}
          </div>
        )}
      </SectionCard>
    </AnalyticsScope>
  );
}
