import { useMemo } from 'react';
import { APP_NAV_LINKS, MeasurementTrendCard, StatsTemplate, WeightTrendCard } from '@leanlog/ui';
import {
  selectBicepEntries,
  selectShoulderEntries,
  selectThighEntries,
  selectVTaperEntries,
  selectWaistEntries,
  selectWeeklyWeightDelta,
  selectWeeklyWeightEntries,
  selectWeightEntries,
} from '../selectors';
import { useStore } from '../state';
import {
  HeaderControls,
  PageLoadingState,
  renderRouterNavLink,
  TrackerErrorState,
} from './_shared';

export default function StatsPage() {
  const { days, profile, loading, error } = useStore();

  const weightEntries = useMemo(() => selectWeightEntries(days), [days]);
  const weeklyWeightEntries = useMemo(() => selectWeeklyWeightEntries(days), [days]);
  const weeklyWeightDelta = useMemo(() => selectWeeklyWeightDelta(days), [days]);
  const vTaperEntries = useMemo(() => selectVTaperEntries(days), [days]);
  const shoulderEntries = useMemo(() => selectShoulderEntries(days), [days]);
  const waistEntries = useMemo(() => selectWaistEntries(days), [days]);
  const bicepEntries = useMemo(() => selectBicepEntries(days), [days]);
  const thighEntries = useMemo(() => selectThighEntries(days), [days]);

  if (loading) return <PageLoadingState label="Loading your stats…" />;
  if (error) return <TrackerErrorState message={error} />;

  return (
    <StatsTemplate
      heading={{
        title: 'Stats',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      weightTrend={
        <WeightTrendCard
          entries={weightEntries}
          weeklyEntries={weeklyWeightEntries}
          weekOverWeekDeltaLbs={weeklyWeightDelta?.deltaLbs ?? null}
          goalWeightLbs={profile?.goalWeightLbs ?? null}
        />
      }
      // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
      measurementTrend={
        <MeasurementTrendCard
          vTaperEntries={vTaperEntries}
          shoulderEntries={shoulderEntries}
          waistEntries={waistEntries}
          bicepEntries={bicepEntries}
          thighEntries={thighEntries}
        />
      }
    />
  );
}
