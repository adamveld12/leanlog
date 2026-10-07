import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type Props = { onConnect: () => void; onSkip: () => void };

export function OnboardingHealthConnectCard({ onConnect, onSkip }: Props) {
  return (
    <Card title="Health Connect (optional)">
      <Text variant="helper">
        Connect Health Connect to start with your weight and height from other apps, and to share
        your weigh-ins, body fat and meals with them. Everything works without it, and you can
        change this later in Me.
      </Text>
      <Button label="Connect Health Connect" onPress={onConnect} />
      <Button label="Skip for now" variant="ghost" onPress={onSkip} />
    </Card>
  );
}
