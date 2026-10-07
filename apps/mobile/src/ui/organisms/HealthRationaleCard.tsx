import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

// Android requires an in-app explanation of what each Health Connect permission is for.
export function HealthRationaleCard() {
  return (
    <>
      <Card title="What Leanlog reads">
        <Text>Smart-scale weight</Text>
        <Text variant="helper">
          Your weight from other apps becomes today&apos;s weight, so you don&apos;t type it twice.
          The latest reading of the day wins.
        </Text>
        <Text>Height</Text>
        <Text variant="helper">Used once to pre-fill your profile.</Text>
      </Card>
      <Card title="What Leanlog writes">
        <Text>Meals, weigh-ins and body fat</Text>
        <Text variant="helper">
          Each meal&apos;s nutrition, your weigh-ins, body fat results and height, so other health
          apps can see them. Editing or deleting a meal today updates or removes its record.
        </Text>
      </Card>
      <Card title="Your data">
        <Text variant="helper">
          Everything else in Leanlog stays on this phone. Records Leanlog writes are never read back
          as new data. You can change or remove access any time in Health Connect.
        </Text>
      </Card>
    </>
  );
}
