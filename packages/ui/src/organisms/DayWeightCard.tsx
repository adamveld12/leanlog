import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { SectionCard } from '../molecules/SectionCard';

export type DayWeightCardProps = {
  saved?: boolean;
  weightLbs: number | null;
  onWeightChange: (n: number) => void;
  onWeightBlur: () => void;
};

const HELPER_TEXT =
  'For best results, weigh yourself naked, first thing in the morning, after using the bathroom and before eating or drinking anything.';

export function DayWeightCard({
  saved,
  weightLbs,
  onWeightChange,
  onWeightBlur,
}: DayWeightCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'DayWeightCard' }}>
      <SectionCard title="Body Weight" saved={saved}>
        <NumberInput
          label="Weight (lbs)"
          value={weightLbs ?? 0}
          onChange={onWeightChange}
          onBlur={onWeightBlur}
        />
        <HelperText as="p">{HELPER_TEXT}</HelperText>
      </SectionCard>
    </AnalyticsScope>
  );
}
