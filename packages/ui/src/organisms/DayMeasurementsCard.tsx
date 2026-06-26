import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { Text } from '../atoms/Text';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

// The four optional sites a user can log for the current day (#68). Bicep/thigh
// are supplementary single-value (right-side by convention) and don't feed the
// ratio; only shoulder + waist derive the v-taper.
export type MeasurementPatch = {
  shoulderInches?: number;
  waistInches?: number;
  bicepInches?: number;
  thighInches?: number;
};

export type DayMeasurementsCardProps = {
  saved?: boolean;
  saving?: boolean;
  shoulderInches: number | null;
  waistInches: number | null;
  bicepInches: number | null;
  thighInches: number | null;
  // Receives only the sites that carry a positive value, so a partial entry
  // saves just what was filled in (R2). Clearing a previously-logged site is not
  // supported in v1 (consistent with weight).
  onSave: (measurements: MeasurementPatch) => void;
};

type Draft = {
  shoulder: number | null;
  waist: number | null;
  bicep: number | null;
  thigh: number | null;
};

const SIDE_HINT = 'Measure your right side — consistency matters more than which side.';

// Two decimals, matching roundVTaper in @leanlog/data-access (packages/ui stays
// dependency-free, so the trivial shoulder ÷ waist is inlined here for the live
// readout). Returns null unless both sites are positive (R6).
function displayVTaper(shoulder: number | null, waist: number | null): string | null {
  if (shoulder == null || waist == null || shoulder <= 0 || waist <= 0) return null;
  return (Math.round((shoulder / waist) * 100) / 100).toFixed(2);
}

export function DayMeasurementsCard({
  saved,
  saving,
  shoulderInches,
  waistInches,
  bicepInches,
  thighInches,
  onSave,
}: DayMeasurementsCardProps) {
  // The four sites are one logical draft, so they live in a single state object
  // (one render per edit) rather than five useState calls. Reset whenever the
  // saved measurements change from outside (a save completes, or the user
  // switches days) — same derived-state-on-prop-change pattern as DayWeightCard;
  // `signature` is the previous-prop sentinel.
  const signature = `${shoulderInches}|${waistInches}|${bicepInches}|${thighInches}`;
  const propDraft = (): Draft => ({
    shoulder: shoulderInches,
    waist: waistInches,
    bicep: bicepInches,
    thigh: thighInches,
  });
  // react-doctor-disable-next-line react-doctor/no-derived-useState, react-doctor/rerender-state-only-in-handlers
  const [lastSeen, setLastSeen] = useState(signature);
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState<Draft>(propDraft);
  if (lastSeen !== signature) {
    setLastSeen(signature);
    setDraft(propDraft());
  }

  const setField = (key: keyof Draft) => (value: number | null) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const changed =
    draft.shoulder !== shoulderInches ||
    draft.waist !== waistInches ||
    draft.bicep !== bicepInches ||
    draft.thigh !== thighInches;
  const hasAny = [draft.shoulder, draft.waist, draft.bicep, draft.thigh].some(
    (v) => v != null && v > 0,
  );
  const canSave = changed && hasAny && !saving;

  const vtaper = displayVTaper(draft.shoulder, draft.waist);

  function handleSave() {
    const patch: MeasurementPatch = {};
    if (draft.shoulder != null && draft.shoulder > 0) patch.shoulderInches = draft.shoulder;
    if (draft.waist != null && draft.waist > 0) patch.waistInches = draft.waist;
    if (draft.bicep != null && draft.bicep > 0) patch.bicepInches = draft.bicep;
    if (draft.thigh != null && draft.thigh > 0) patch.thighInches = draft.thigh;
    onSave(patch);
  }

  return (
    <AnalyticsScope properties={{ organism: 'DayMeasurementsCard' }}>
      <SectionCard title="Body Measurements" saved={saved}>
        <div className={recipes.grid.two}>
          <NumberInput
            label="Shoulder (in)"
            value={draft.shoulder}
            placeholder="e.g. 50"
            onChange={setField('shoulder')}
          />
          <NumberInput
            label="Waist (in)"
            value={draft.waist}
            placeholder="e.g. 32"
            onChange={setField('waist')}
          />
          <div className={recipes.stack.xs}>
            <NumberInput
              label="Bicep · right (in)"
              value={draft.bicep}
              placeholder="e.g. 15"
              onChange={setField('bicep')}
            />
            <HelperText as="p">{SIDE_HINT}</HelperText>
          </div>
          <div className={recipes.stack.xs}>
            <NumberInput
              label="Thigh · right (in)"
              value={draft.thigh}
              placeholder="e.g. 23"
              onChange={setField('thigh')}
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
          <Button variant="primary" disabled={!canSave} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
