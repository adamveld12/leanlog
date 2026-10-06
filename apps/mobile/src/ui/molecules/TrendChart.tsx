import { useState } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useColors } from '../theme';
import { Text } from '../atoms/Text';

type Point = { date: string; value: number };

type Props = {
  title: string;
  points: readonly Point[];
  unit: string;
  height?: number;
};

// A simple trend line. Needs 2+ points; otherwise explains what's missing.
export function TrendChart({ title, points, unit, height = 160 }: Props) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  if (points.length < 2) {
    return <Text variant="helper">{`${title}: log at least two entries to see a trend.`}</Text>;
  }
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <View
      accessible
      accessibilityLabel={`${title} trend, ${first.value} to ${last.value} ${unit}, ${first.date} to ${last.date}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <LineChart
          data={points.map((p) => ({ value: p.value, label: p.date.slice(5) }))}
          width={width - 48}
          height={height}
          color={c.text}
          thickness={2}
          hideRules
          yAxisTextStyle={{ color: c.textMuted, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 10 }}
          dataPointsColor={c.text}
          adjustToWidth
          disableScroll
        />
      ) : null}
    </View>
  );
}
