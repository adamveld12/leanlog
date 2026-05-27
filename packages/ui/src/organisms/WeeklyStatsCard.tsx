import { useState } from 'react';
import { WarningText } from '../atoms/WarningText';
import { AnalyticsScope } from '../analytics';
import { SectionCard } from '../molecules/SectionCard';
import { StatMetric } from '../molecules/StatMetric';
import { Tabs } from '../molecules/Tabs';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type StatsData = {
  accuracyOverall: number;
  accuracyProtein: number;
  accuracyCarbs: number;
  accuracyFat: number;
  coverage: number;
  mealsTracked: number;
  mealsExpected: number;
  estimatedWeightLost: number;
  certainty: number;
};

export type WeeklyStatsCardProps = {
  weekly: StatsData;
  overall: StatsData;
  hasDays: boolean;
};

const TABS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'overall', label: 'Overall' },
];

export function WeeklyStatsCard({ weekly, overall, hasDays }: WeeklyStatsCardProps) {
  const [tab, setTab] = useState('weekly');
  const stats = tab === 'weekly' ? weekly : overall;

  return (
    <AnalyticsScope properties={{ organism: 'WeeklyStatsCard' }}>
      <SectionCard title="Statistics">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        <div className={cn(recipes.stack.lg, 'mt-3')}>
          <StatMetric
            label="Macro Accuracy"
            value={hasDays ? `${stats.accuracyOverall}%` : '--'}
            progress={hasDays ? stats.accuracyOverall : 0}
            detail={
              hasDays
                ? `P ${stats.accuracyProtein}%  C ${stats.accuracyCarbs}%  F ${stats.accuracyFat}%`
                : undefined
            }
            hint={
              !hasDays ? 'Track meals to see how accurately you hit your macro targets.' : undefined
            }
          />

          <StatMetric
            label="Coverage"
            value={hasDays ? `${stats.coverage}%` : '--'}
            progress={hasDays ? stats.coverage : 0}
            detail={
              hasDays ? `${stats.mealsTracked} / ${stats.mealsExpected} meals tracked` : undefined
            }
            hint={!hasDays ? 'Log all your meals to improve data accuracy.' : undefined}
          />

          <StatMetric
            label="Est. Weight Lost"
            value={hasDays ? `${stats.estimatedWeightLost} lb` : '--'}
            progress={hasDays ? stats.certainty : 0}
            detail={hasDays ? `~${stats.certainty}% certainty` : undefined}
            hint={!hasDays ? 'Track consistently to estimate weight change.' : undefined}
          />

          {hasDays && stats.certainty < 75 && (
            <WarningText>Track more consistently to get this number up!</WarningText>
          )}
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
