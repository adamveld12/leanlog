import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { SectionCard } from '../molecules/SectionCard';

export type DayWeightCardProps = {
  saved?: boolean;
  saving?: boolean;
  weightLbs: number | null;
  onSave: (weightLbs: number) => void;
};

const HELPER_TEXT =
  'Weigh in first thing in the morning, after the bathroom, before eating or drinking.';

export function DayWeightCard({ saved, saving, weightLbs, onSave }: DayWeightCardProps) {
  // Reset the draft whenever the saved weight changes from outside (e.g. after a save
  // completes or the user navigates to a different day). Derived state during render
  // — see https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  const [lastSeenWeight, setLastSeenWeight] = useState<number | null>(weightLbs);
  const [draft, setDraft] = useState<number | null>(weightLbs);
  if (lastSeenWeight !== weightLbs) {
    setLastSeenWeight(weightLbs);
    setDraft(weightLbs);
  }

  const canSave = draft != null && draft > 0 && draft !== weightLbs && !saving;

  return (
    <AnalyticsScope properties={{ organism: 'DayWeightCard' }}>
      <SectionCard title="Body Weight" saved={saved}>
        <div className="flex items-end gap-2">
          <NumberInput
            label="Weight (lbs)"
            value={draft}
            placeholder="e.g. 180"
            onChange={setDraft}
            labelClassName="flex-1"
          />
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() => {
              if (draft != null && draft > 0) onSave(draft);
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <HelperText as="p">{HELPER_TEXT}</HelperText>
      </SectionCard>
    </AnalyticsScope>
  );
}
