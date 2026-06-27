import { useState } from 'react';
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
};

// The v1 north star (#68): current v-taper vs the 1.6 target. null until a day
// has both shoulder and waist, so the readout shows a prompt rather than a
// zero/broken ratio (R9).
export type NorthStarData = {
  currentVTaper: number; // already rounded to 2 decimals
  target: number;
  gapToTarget: number;
  met: boolean;
} | null;

export type WeeklyStatsCardProps = {
  weekly: StatsData;
  overall: StatsData;
  hasWeeklyData: boolean;
  hasOverallData: boolean;
  // North star + measured weekly weight delta are global "are you progressing?"
  // signals (#68 R8/R10), independent of the Weekly/Overall toggle below.
  northStar: NorthStarData;
  // avg(last 7 logged days) − avg(prior 7); null when there aren't enough
  // weigh-ins yet (R12). The Weight Trend week-over-week headline shows the same
  // number (R13).
  weeklyWeightChangeLbs: number | null;
};

const TABS = [
  { key: 'weekly', label: 'Weekly', panelId: 'weekly-stats-panel' },
  { key: 'overall', label: 'Overall', panelId: 'overall-stats-panel' },
];

// Current v-taper against the 1.6 north star (R7/R8). The progress bar tracks how
// close the ratio is to the target; "met" turns it the saved/positive color.
function NorthStarMetric({ data }: { data: NorthStarData }) {
  if (data == null) {
    return (
      <StatMetric
        label="V-Taper · North Star"
        value="--"
        progress={0}
        hint="Log shoulder and waist on the day page to track your v-taper toward 1.6."
      />
    );
  }
  const pct = Math.min(100, Math.round((data.currentVTaper / data.target) * 100));
  const detail = data.met
    ? `Target ${data.target.toFixed(2)} reached 🎯`
    : `Target ${data.target.toFixed(2)} · ${data.gapToTarget.toFixed(2)} to go`;
  return (
    <StatMetric
      label="V-Taper · North Star"
      value={data.currentVTaper.toFixed(2)}
      progress={pct}
      progressColor={data.met ? 'var(--ll-saved)' : undefined}
      detail={detail}
    />
  );
}

// The measured week-over-week weight number (R10) — a barless signed delta that
// replaces the old modeled "Est. Weight Lost" + certainty.
function WeeklyWeightMetric({ deltaLbs }: { deltaLbs: number | null }) {
  if (deltaLbs == null) {
    return (
      <StatMetric
        label="Weekly Weight Change"
        value="--"
        hint="Needs more weigh-ins across the last two weeks to measure your trend."
      />
    );
  }
  const sign = deltaLbs > 0 ? '+' : '';
  return (
    <StatMetric
      label="Weekly Weight Change"
      value={`${sign}${deltaLbs.toFixed(1)} lb`}
      detail="avg last 7 days vs prior 7 days"
    />
  );
}

export function WeeklyStatsCard({
  weekly,
  overall,
  hasWeeklyData,
  hasOverallData,
  northStar,
  weeklyWeightChangeLbs,
}: WeeklyStatsCardProps) {
  const [tab, setTab] = useState('weekly');
  const stats = tab === 'weekly' ? weekly : overall;
  const hasDays = tab === 'weekly' ? hasWeeklyData : hasOverallData;

  return (
    <AnalyticsScope properties={{ organism: 'WeeklyStatsCard' }}>
      <SectionCard title="Statistics">
        <div className={recipes.stack.lg}>
          <NorthStarMetric data={northStar} />
          <WeeklyWeightMetric deltaLbs={weeklyWeightChangeLbs} />
        </div>

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
                ? `Cal ${stats.accuracyCalories}%  P ${stats.accuracyProtein}%  C ${stats.accuracyCarbs}%  F ${stats.accuracyFat}%`
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
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
