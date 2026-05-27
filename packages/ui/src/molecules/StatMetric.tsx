import type { ReactNode } from 'react';
import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';

export type StatMetricProps = {
  label: string;
  value: string;
  progress: number;
  detail?: ReactNode;
  progressColor?: string;
  hint?: string;
};

export function StatMetric({
  label,
  value,
  progress,
  detail,
  progressColor,
  hint,
}: StatMetricProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <SectionHeading as="h4" noMargin>
          {label}
        </SectionHeading>
        <Text as="span" variant="body" className="font-semibold">
          {value}
        </Text>
      </div>
      <ProgressBar value={progress} max={100} color={progressColor} />
      {hint ? (
        <HelperText as="p">{hint}</HelperText>
      ) : detail ? (
        <Text as="span" variant="meta">
          {detail}
        </Text>
      ) : null}
    </div>
  );
}
