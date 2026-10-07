import { V_TAPER_TARGET, roundVTaper, vTaperGapToTarget } from '@leanlog/data-access';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type Props = {
  // Raw shoulder ÷ waist, or null when either measurement is missing.
  ratio: number | null;
};

export function VTaperCard({ ratio }: Props) {
  return (
    <Card title="V-taper">
      {ratio == null ? (
        <Text variant="helper">Log shoulder and waist to see your v-taper.</Text>
      ) : (
        <>
          <Text>{`Shoulder ÷ waist: ${roundVTaper(ratio).toFixed(2)}`}</Text>
          {/* "Met" compares the raw ratio, so a 1.595 that displays as 1.60 never reads as reached. */}
          {ratio >= V_TAPER_TARGET ? (
            <Text variant="helper">{`Target of ${V_TAPER_TARGET} reached.`}</Text>
          ) : (
            <Text variant="helper">{`${vTaperGapToTarget(ratio).toFixed(2)} to go to reach ${V_TAPER_TARGET}`}</Text>
          )}
        </>
      )}
    </Card>
  );
}
