import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type Props = { onCalculate: () => void; onSkip: () => void };

export function OnboardingBodyFatOfferCard({ onCalculate, onSkip }: Props) {
  return (
    <Card title="Body fat (optional)">
      <Text variant="helper">
        With a body fat estimate, your targets use Katch-McArdle instead of a bodyweight estimate.
        You can do this any time from the Body tab.
      </Text>
      <Button label="Calculate body fat" onPress={onCalculate} />
      <Button label="Skip for now" variant="ghost" onPress={onSkip} />
    </Card>
  );
}
