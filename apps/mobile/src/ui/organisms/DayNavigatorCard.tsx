import { View } from 'react-native';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type Props = {
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled: boolean;
};

export function DayNavigatorCard({ title, onPrevious, onNext, nextDisabled }: Props) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          label="‹"
          variant="secondary"
          onPress={onPrevious}
          accessibilityLabel="Previous day"
        />
        <Text variant="title">{title}</Text>
        <Button
          label="›"
          variant="secondary"
          onPress={onNext}
          disabled={nextDisabled}
          accessibilityLabel="Next day"
        />
      </View>
    </Card>
  );
}
