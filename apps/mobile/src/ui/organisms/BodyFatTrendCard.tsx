import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';
import { TrendChart } from '../molecules/TrendChart';

type Props = {
  results: readonly { date: string; pct: number; method: 'navy' | 'jp3' }[];
  onCalculate: () => void;
};

const METHOD_LABEL = { navy: 'Navy tape', jp3: 'Skinfold' } as const;

export function BodyFatTrendCard({ results, onCalculate }: Props) {
  const latest = results[results.length - 1];
  return (
    <Card title="Body fat">
      {latest ? (
        <Text>{`Latest: ${latest.pct}% (${METHOD_LABEL[latest.method]})`}</Text>
      ) : (
        <Text variant="helper">No body fat results yet.</Text>
      )}
      <TrendChart
        title="Body fat"
        points={results.map((r) => ({ date: r.date, value: r.pct }))}
        unit="%"
      />
      <Button label="Calculate body fat" variant="secondary" onPress={onCalculate} />
    </Card>
  );
}
