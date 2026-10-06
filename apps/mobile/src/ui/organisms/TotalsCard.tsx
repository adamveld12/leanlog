import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { MacroTotals } from '../molecules/MacroTotals';

type Macros = { calories: number; protein: number; carbs: number; fat: number };

type Props = {
  consumed: Macros;
  targets: Macros | null;
  // e.g. "Katch · BF 15% · Moderate" or "Bodyweight × 15".
  basisCaption: string | null;
  locked: boolean;
  // Shown on the bodyweight fallback so the user can switch to Katch targets.
  onCalculateBodyFat?: () => void;
};

export function TotalsCard({ consumed, targets, basisCaption, locked, onCalculateBodyFat }: Props) {
  return (
    <Card title="Totals">
      <MacroTotals consumed={consumed} targets={targets} />
      {basisCaption ? <Text variant="helper">{basisCaption}</Text> : null}
      {locked ? <Text variant="helper">This day is locked. Only today can be edited.</Text> : null}
      {onCalculateBodyFat ? (
        <>
          <Text variant="helper">
            Calculate your body fat to switch from the bodyweight estimate to Katch-McArdle targets.
          </Text>
          <Button label="Calculate body fat" variant="secondary" onPress={onCalculateBodyFat} />
        </>
      ) : null}
    </Card>
  );
}
