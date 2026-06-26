import type { ReactNode } from 'react';
import { HelperText } from '../atoms/HelperText';
import { ProgressBar } from '../atoms/ProgressBar';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type StatMetricProps = {
  label: string;
  value: string;
  // Omit to render a barless stat (e.g. a measured weekly weight delta, which has
  // no natural 0–100 scale). When present, drives the progress bar.
  progress?: number;
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
    <div className={cn(recipes.stack.xs)}>
      <div className={recipes.stack.rowBetween}>
        <SectionHeading as="h4" noMargin>
          {label}
        </SectionHeading>
        <Text as="span" variant="body" className="font-semibold">
          {value}
        </Text>
      </div>
      {progress != null ? <ProgressBar value={progress} max={100} color={progressColor} /> : null}
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
