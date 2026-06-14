import { useState } from 'react';
import { WarningText } from '../atoms/WarningText';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { SectionCard } from '../molecules/SectionCard';
import { StatMetric } from '../molecules/StatMetric';
import { Tabs } from '../molecules/Tabs';
import { recipes } from '../styles/recipes';

export type StatsData = {
  accuracyOverall: number;
  accuracyCalories: number;
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
  hasWeeklyData: boolean;
  hasOverallData: boolean;
};

const TABS = [
  { key: 'weekly', label: 'Weekly', panelId: 'weekly-stats-panel' },
  { key: 'overall', label: 'Overall', panelId: 'overall-stats-panel' },
];

export function WeeklyStatsCard({
  weekly,
  overall,
  hasWeeklyData,
  hasOverallData,
}: WeeklyStatsCardProps) {
  const [tab, setTab] = useState('weekly');
  const stats = tab === 'weekly' ? weekly : overall;
  const hasDays = tab === 'weekly' ? hasWeeklyData : hasOverallData;

  return (
    <AnalyticsScope properties={{ organism: 'WeeklyStatsCard' }}>
      <SectionCard title="Statistics">
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Stats period" />

        <div
          role="tabpanel"
          id={tab === 'weekly' ? 'weekly-stats-panel' : 'overall-stats-panel'}
          aria-labelledby={tab === 'weekly' ? 'weekly-stats-panel-tab' : 'overall-stats-panel-tab'}
          className={recipes.stack.lg}
        >
          <StatMetric
            label="Macro Accuracy"
            value={hasDays ? `${stats.accuracyOverall}%` : '--'}
            progress={hasDays ? stats.accuracyOverall : 0}
            detail={
              hasDays
                ? `Cal ${stats.accuracyCalories}%  P ${stats.accuracyProtein}%  Net C ${stats.accuracyCarbs}%  F ${stats.accuracyFat}%`
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
