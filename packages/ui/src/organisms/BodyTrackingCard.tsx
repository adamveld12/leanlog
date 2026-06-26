import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { SectionHeading } from '../atoms/SectionHeading';
import { SuccessText } from '../atoms/SuccessText';
import { Text } from '../atoms/Text';
import { WarningText } from '../atoms/WarningText';
import { Collapsible } from '../molecules/Collapsible';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

// Only the sites carrying a positive value are sent, so a partial touch-up saves
// just what changed. Clearing a logged site is unsupported (consistent with weight).
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
// collapsed weekly summary — today's day is usually null mid-week.
export type LatestMeasurements = {
  shoulderInches: number;
  waistInches: number;
  bicepInches: number;
  thighInches: number;
  vTaper: number; // pre-rounded by the selector
  date: string; // ISO YYYY-MM-DD it was logged
};

export type BodyTrackingCardProps = {
  // Weight (daily)
  weightLbs: number | null;
  savingWeight?: boolean;
  savedWeight?: boolean;
  onSaveWeight: (weightLbs: number) => void;
  // Measurements (weekly)
  measurementsToday: TodayMeasurements;
  latestMeasurements: LatestMeasurements | null;
  measurementsDue: boolean; // overdue → hard block (force-expanded, all four required)
  savingMeasurements?: boolean;
  savedMeasurements?: boolean;
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

export function BodyTrackingCard({
  weightLbs,
  savingWeight,
  savedWeight,
  onSaveWeight,
  measurementsToday,
  latestMeasurements,
  measurementsDue,
  savingMeasurements,
  savedMeasurements,
  onSaveMeasurements,
}: BodyTrackingCardProps) {
  const seedMeas = (): MeasDraft => ({
    shoulder: measurementsToday.shoulderInches,
    waist: measurementsToday.waistInches,
    bicep: measurementsToday.bicepInches,
    thigh: measurementsToday.thighInches,
  });

  const weightSig = `${weightLbs}`;
  const measSig = `${measurementsToday.shoulderInches}|${measurementsToday.waistInches}|${measurementsToday.bicepInches}|${measurementsToday.thighInches}|${measurementsDue}|${latestMeasurements?.date ?? ''}`;

  // Each sub-section keeps its disclosure + draft + a prop sentinel in one state
  // object, so the two derived-state resets stay local without fanning out into
  // many useState calls. Weight re-collapses once today's weight is logged;
  // measurements once a complete set is logged for the week (which also clears
  // `measurementsDue`). Resetting them independently means saving one half never
  // disturbs an in-progress edit of the other.
  // react-doctor-disable-next-line react-doctor/no-derived-useState, react-doctor/rerender-state-only-in-handlers
  const [weight, setWeight] = useState(() => ({
    open: weightLbs == null,
    sig: weightSig,
    draft: weightLbs,
  }));
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [meas, setMeas] = useState(() => ({ open: false, sig: measSig, draft: seedMeas() }));
  if (weight.sig !== weightSig)
    setWeight({ open: weightLbs == null, sig: weightSig, draft: weightLbs });
  if (meas.sig !== measSig) setMeas({ open: false, sig: measSig, draft: seedMeas() });

  // --- weight ---
  const canSaveWeight =
    weight.draft != null && weight.draft > 0 && weight.draft !== weightLbs && !savingWeight;
  const weightSummary =
    weightLbs != null ? (
      <Text variant="meta">
        Logged today:{' '}
        <Text as="span" variant="body" className="font-semibold">
          {weightLbs} lbs
        </Text>
      </Text>
    ) : (
      <Text variant="meta">Not logged today</Text>
    );

  // --- measurements ---
  const md = meas.draft;
  const allFour = [md.shoulder, md.waist, md.bicep, md.thigh].every((v) => v != null && v > 0);
  const hasAny = [md.shoulder, md.waist, md.bicep, md.thigh].some((v) => v != null && v > 0);
  const changed =
    md.shoulder !== measurementsToday.shoulderInches ||
    md.waist !== measurementsToday.waistInches ||
    md.bicep !== measurementsToday.bicepInches ||
    md.thigh !== measurementsToday.thighInches;
  // Overdue (hard block) requires a complete four-site set; otherwise a partial
  // touch-up patch is allowed (the optional weekly-correction path).
  const canSaveMeas = !savingMeasurements && (measurementsDue ? allFour : changed && hasAny);
  const vtaper = displayVTaper(md.shoulder, md.waist);

  const setMeasField = (key: keyof MeasDraft) => (value: number | null) =>
    setMeas((m) => ({ ...m, draft: { ...m.draft, [key]: value } }));

  function handleSaveMeas() {
    const patch: MeasurementPatch = {};
    if (md.shoulder != null && md.shoulder > 0) patch.shoulderInches = md.shoulder;
    if (md.waist != null && md.waist > 0) patch.waistInches = md.waist;
    if (md.bicep != null && md.bicep > 0) patch.bicepInches = md.bicep;
    if (md.thigh != null && md.thigh > 0) patch.thighInches = md.thigh;
    onSaveMeasurements(patch);
  }

  const measSummary = latestMeasurements ? (
    <div className={recipes.stack.xs}>
      <Text variant="meta">
        Last measured {formatShortDate(latestMeasurements.date)} · V-Taper{' '}
        <Text as="span" variant="body" className="font-semibold">
          {latestMeasurements.vTaper.toFixed(2)}
        </Text>
      </Text>
      <HelperText as="p">
        Shoulder {latestMeasurements.shoulderInches} · Waist {latestMeasurements.waistInches} ·
        Bicep {latestMeasurements.bicepInches} · Thigh {latestMeasurements.thighInches} (in)
      </HelperText>
    </div>
  ) : (
    <Text variant="meta">No measurements logged yet</Text>
  );

  return (
    <AnalyticsScope properties={{ organism: 'BodyTrackingCard' }}>
      <SectionCard title="Measurements">
        <div className={recipes.stack.xs}>
          <SectionHeading as="h4" noMargin>
            Weight · daily
          </SectionHeading>
          <Collapsible
            open={weight.open}
            onToggle={() => setWeight((w) => ({ ...w, open: !w.open }))}
            // summary is a disclosure slot (like children); recreating it per render is cheap.
            // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
            summary={weightSummary}
          >
            <div className={recipes.stack.rowEnd}>
              <NumberInput
                label="Weight (lbs)"
                value={weight.draft}
                placeholder="e.g. 180"
                onChange={(v) => setWeight((w) => ({ ...w, draft: v }))}
                labelClassName="flex-1"
              />
              <Button
                variant="primary"
                disabled={!canSaveWeight}
                onClick={() => {
                  if (weight.draft != null && weight.draft > 0) onSaveWeight(weight.draft);
                }}
              >
                {savingWeight ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <HelperText as="p">{WEIGHT_HINT}</HelperText>
            {savedWeight ? <SuccessText>Saved</SuccessText> : null}
          </Collapsible>
        </div>

        <div className={recipes.stack.xs}>
          <SectionHeading as="h4" noMargin>
            Measurements · weekly
          </SectionHeading>
          <Collapsible
            open={meas.open}
            locked={measurementsDue}
            onToggle={() => setMeas((m) => ({ ...m, open: !m.open }))}
            // summary is a disclosure slot (like children); recreating it per render is cheap.
            // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
            summary={measSummary}
          >
            {measurementsDue ? (
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
            <div className={recipes.stack.rowEnd}>
              <Button variant="primary" disabled={!canSaveMeas} onClick={handleSaveMeas}>
                {savingMeasurements ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {savedMeasurements ? <SuccessText>Saved</SuccessText> : null}
          </Collapsible>
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
