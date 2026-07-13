import { useMemo } from 'react';
import {
  ProgressComparisonCard,
  type ProgressPhotoView,
  type ProgressPosePanel,
} from '@leanlog/ui';
import {
  formatElapsed,
  formatVTaper,
  formatVTaperDelta,
  formatWeight,
  formatWeightDelta,
  POSE_TO_KEY,
  PROGRESS_POSES,
  type PhotoStats,
  type PoseComparison,
  type ProgressPose,
} from '@leanlog/data-access';
import { prettyDate } from '../../lib';
import {
  selectProgressBaselines,
  selectProgressComparisons,
  selectProgressPhotoDays,
} from '../../selectors';
import { useStore } from '../../state';
import { useProgressPhotoUrl } from './useProgressPhotoUrl';

const POSE_LABEL: Record<ProgressPose, string> = { front: 'Front', side: 'Side', back: 'Back' };

function toView(
  stats: PhotoStats,
  src: string | null,
  captionPrefix: string,
  alt: string,
): ProgressPhotoView {
  const date = prettyDate(stats.date);
  return {
    src,
    alt,
    caption: captionPrefix ? `${captionPrefix} · ${date}` : date,
    weight: stats.weightLbs != null ? formatWeight(stats.weightLbs) : null,
    vTaper: stats.vTaper != null ? formatVTaper(stats.vTaper) : null,
  };
}

function buildPanel(
  pose: ProgressPose,
  comparison: PoseComparison,
  baselineSrc: string | null,
  latestSrc: string | null,
  baselineOptions: { value: string; label: string }[],
  selectedBaseline: string | null,
  onPickBaseline: (date: string | null) => void,
): ProgressPosePanel {
  const label = POSE_LABEL[pose];
  const state: ProgressPosePanel['state'] =
    comparison.latest == null ? 'empty' : comparison.single ? 'single' : 'compared';

  return {
    pose,
    poseLabel: label,
    state,
    emptyPrompt: `Log a ${label.toLowerCase()} photo on the day page to start tracking.`,
    baseline: comparison.baseline
      ? toView(comparison.baseline, baselineSrc, 'Baseline', `${label} baseline photo`)
      : null,
    latest: comparison.latest
      ? toView(
          comparison.latest,
          latestSrc,
          comparison.single ? '' : 'Latest',
          `${label} latest photo`,
        )
      : null,
    headline:
      state === 'compared'
        ? {
            elapsed: formatElapsed(comparison.elapsedDays ?? 0),
            weightDelta:
              comparison.weightDelta != null ? formatWeightDelta(comparison.weightDelta) : null,
            vTaperDelta:
              comparison.vTaperDelta != null ? formatVTaperDelta(comparison.vTaperDelta) : null,
          }
        : undefined,
    baselineOptions,
    selectedBaseline,
    onPickBaseline,
  };
}

// Wires the per-pose latest-vs-baseline comparison into the Statistics area (#69).
// Resolves each pose's baseline + latest photo to an auth-proxied object URL
// (a fixed six hook calls, one per slot) and pre-formats every stat, so the
// presentational card never touches storage or numbers.
export function ProgressComparisonSection() {
  const { days, profile, setProgressBaseline } = useStore();

  const comparisons = useMemo(() => selectProgressComparisons(days, profile), [days, profile]);
  const baselines = useMemo(() => selectProgressBaselines(profile), [profile]);
  const photoDays = useMemo(() => selectProgressPhotoDays(days), [days]);

  const byPose = useMemo(() => {
    const map = {} as Record<ProgressPose, PoseComparison>;
    for (const comparison of comparisons) map[comparison.pose] = comparison;
    return map;
  }, [comparisons]);

  // Fixed hook calls per slot (poses are a fixed set of three).
  const frontBaseUrl = useProgressPhotoUrl(byPose.front.baseline?.photoKey ?? null);
  const frontLatestUrl = useProgressPhotoUrl(byPose.front.latest?.photoKey ?? null);
  const sideBaseUrl = useProgressPhotoUrl(byPose.side.baseline?.photoKey ?? null);
  const sideLatestUrl = useProgressPhotoUrl(byPose.side.latest?.photoKey ?? null);
  const backBaseUrl = useProgressPhotoUrl(byPose.back.baseline?.photoKey ?? null);
  const backLatestUrl = useProgressPhotoUrl(byPose.back.latest?.photoKey ?? null);

  const srcs: Record<ProgressPose, { baseline: string | null; latest: string | null }> = {
    front: { baseline: frontBaseUrl, latest: frontLatestUrl },
    side: { baseline: sideBaseUrl, latest: sideLatestUrl },
    back: { baseline: backBaseUrl, latest: backLatestUrl },
  };

  const panels = PROGRESS_POSES.map((pose) => {
    const column = POSE_TO_KEY[pose];
    const options = photoDays.reduce<{ value: string; label: string }[]>((acc, d) => {
      if (d[column]) acc.push({ value: d.date, label: prettyDate(d.date) });
      return acc;
    }, []);
    return buildPanel(
      pose,
      byPose[pose],
      srcs[pose].baseline,
      srcs[pose].latest,
      options,
      baselines[pose],
      (date) => void setProgressBaseline(pose, date),
    );
  });

  return <ProgressComparisonCard panels={panels} />;
}
