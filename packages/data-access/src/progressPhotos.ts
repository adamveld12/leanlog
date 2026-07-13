// Private progress photos (#69).
//
// Three fixed pose slots — front, side, back — each holding at most one R2 object
// key per day, pinned to that day's weight and v-taper. Unlike the public,
// content-addressed nutrition photos (`nutritionPhotos.ts`), progress photos are
// private: keyed `progress/<userId>/<uuid>.jpg` with a random filename (no
// content-addressing, no cross-user dedupe, R7) and served only through an
// authenticated proxy that checks the `<userId>` prefix (R8/R9).
//
// This module is pure: key validation/ownership, single-slot reconciliation for
// the day record, and the latest-vs-baseline comparison shown in Statistics. The
// R2 byte plumbing and storage live in the app's Pages Functions.

// The three fixed poses (R1). Fixed slots keep comparisons aligned (front-to-front).
export const PROGRESS_POSES = ['front', 'side', 'back'] as const;
export type ProgressPose = (typeof PROGRESS_POSES)[number];

// The per-day photo-key slots, mirrored as nullable columns on the day record.
export type DayProgressPhotoKeys = {
  frontPhotoKey: string | null;
  sidePhotoKey: string | null;
  backPhotoKey: string | null;
};

// Maps a pose to its day-record column so callers never hardcode the mapping.
export const POSE_TO_KEY: Record<ProgressPose, keyof DayProgressPhotoKeys> = {
  front: 'frontPhotoKey',
  side: 'sidePhotoKey',
  back: 'backPhotoKey',
};

// Private R2 key shape: `progress/<userId>/<uuid>.jpg`. The UUID is a random v4
// filename (R7) — no content-addressing. `<userId>` is the Clerk subject and may
// contain letters, digits, and underscores but never a slash, so it is matched
// as a single path segment.
const KEY_RE =
  /^progress\/([^/]+)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

/** True when `key` is a well-formed private progress-photo key (guards the proxy route). */
export function isValidProgressPhotoKey(key: string): boolean {
  return KEY_RE.test(key);
}

/** The `<userId>` segment that owns a key, or null when the key is malformed. */
export function progressPhotoKeyOwner(key: string): string | null {
  const match = KEY_RE.exec(key);
  return match ? match[1] : null;
}

/**
 * The access check enforced by the photo proxy (R8/R9): the key must be
 * well-formed AND owned by the authenticated user. A user can never read another
 * user's photo, and a malformed key is always rejected.
 */
export function isOwnedProgressPhotoKey(key: string, userId: string): boolean {
  return progressPhotoKeyOwner(key) === userId;
}

export type SetDayPhotoResult = {
  next: DayProgressPhotoKeys;
  /** The previous key this slot held, when replaced or cleared — released for R2 cleanup (R18). */
  releasedKey: string | null;
};

/**
 * Sets (or clears, with `key === null`) a single pose slot for a day. Because
 * each pose holds exactly one photo per day (R3), recapturing replaces the
 * existing object; the old key is released for best-effort cleanup. Keys are
 * per-user and never deduped, so a released key is always safe to delete (no
 * cross-entry refcount needed, unlike nutrition photos).
 */
export function setDayPhoto(
  current: DayProgressPhotoKeys,
  pose: ProgressPose,
  key: string | null,
): SetDayPhotoResult {
  const column = POSE_TO_KEY[pose];
  const previous = current[column];
  const next: DayProgressPhotoKeys = { ...current, [column]: key };
  const releasedKey = previous && previous !== key ? previous : null;
  return { next, releasedKey };
}

/** Every progress-photo key a day holds, for cleanup when the whole day is removed. */
export function dayProgressPhotoKeys(day: DayProgressPhotoKeys): string[] {
  return [
    ...new Set(
      [day.frontPhotoKey, day.sidePhotoKey, day.backPhotoKey].filter((k): k is string => !!k),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Latest-vs-baseline comparison (Statistics area)
// ---------------------------------------------------------------------------

// A day's data needed for the comparison: its date, the three pose photo keys,
// and the stats pinned to it. `vTaper` is the shoulder ÷ waist ratio from #68;
// it is null until that day has both measurements, and the comparison omits it
// rather than showing zero (R10/R11).
export type ProgressPhotoDay = DayProgressPhotoKeys & {
  date: string;
  weightLbs: number | null;
  vTaper: number | null;
};

// One photo plus the stats pinned to its day.
export type PhotoStats = {
  date: string;
  photoKey: string;
  weightLbs: number | null;
  vTaper: number | null;
};

export type PoseComparison = {
  pose: ProgressPose;
  /** null when the pose has no photos yet — the empty/prompt state (R16). */
  latest: PhotoStats | null;
  baseline: PhotoStats | null;
  /** True when only one photo exists (latest === baseline): show it without a delta (R16). */
  single: boolean;
  /** Deltas exist only across two distinct photos (R13); a missing stat yields null (R11). */
  elapsedDays: number | null;
  weightDelta: number | null;
  vTaperDelta: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

// Whole-day difference between two ISO dates, in days. UTC-anchored so DST never
// shifts the count.
function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/**
 * The automatic latest-vs-baseline comparison for one pose (R12–R16).
 *
 * - No photos → empty state (`latest === null`).
 * - One photo → `single`, shown without a misleading "zero change" delta.
 * - The baseline defaults to the earliest photo, or the user's chosen
 *   `baselineDate` when that day still has a photo for this pose (R15). A stale
 *   choice (no photo on that day) falls back to the earliest.
 * - Deltas are computed only across two distinct photos, and each is null when
 *   either side lacks that stat (R11).
 */
export function computePoseComparison(
  pose: ProgressPose,
  days: ProgressPhotoDay[],
  baselineDate: string | null,
): PoseComparison {
  const column = POSE_TO_KEY[pose];
  const withPhoto = days.filter((day) => day[column]).sort((a, b) => a.date.localeCompare(b.date));

  const empty: PoseComparison = {
    pose,
    latest: null,
    baseline: null,
    single: false,
    elapsedDays: null,
    weightDelta: null,
    vTaperDelta: null,
  };
  if (withPhoto.length === 0) return empty;

  const toStats = (day: ProgressPhotoDay): PhotoStats => ({
    date: day.date,
    photoKey: day[column] as string,
    weightLbs: day.weightLbs,
    vTaper: day.vTaper,
  });

  const latestDay = withPhoto[withPhoto.length - 1];
  const chosen = baselineDate ? withPhoto.find((day) => day.date === baselineDate) : undefined;
  const baselineDay = chosen ?? withPhoto[0];

  const latest = toStats(latestDay);
  const baseline = toStats(baselineDay);

  if (latestDay.date === baselineDay.date) {
    return { ...empty, latest, baseline, single: true };
  }

  return {
    pose,
    latest,
    baseline,
    single: false,
    elapsedDays: daysBetween(baseline.date, latest.date),
    weightDelta:
      latest.weightLbs != null && baseline.weightLbs != null
        ? round1(latest.weightLbs - baseline.weightLbs)
        : null,
    vTaperDelta:
      latest.vTaper != null && baseline.vTaper != null
        ? Math.round((latest.vTaper - baseline.vTaper) * 100) / 100
        : null,
  };
}

/** The comparison for all three poses, in display order. */
export function computeProgressComparisons(
  days: ProgressPhotoDay[],
  baselineDates: Record<ProgressPose, string | null>,
): PoseComparison[] {
  return PROGRESS_POSES.map((pose) => computePoseComparison(pose, days, baselineDates[pose]));
}

// ---------------------------------------------------------------------------
// Delta + stat formatting (shared so every surface presents the same numbers)
// ---------------------------------------------------------------------------

const AVG_DAYS_PER_MONTH = 30.44;

/** Headline elapsed-time label, e.g. "11 weeks" for 77 days (R13). */
export function formatElapsed(days: number): string {
  if (days <= 0) return 'same day';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.round(days / 7)} weeks`;
  const months = Math.round(days / AVG_DAYS_PER_MONTH);
  return `${months} months`;
}

// A signed number trimmed of a trailing ".0", e.g. -8 → "-8", -2.4 → "-2.4".
function signedTrim(value: number, decimals: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '±';
  const abs = Math.abs(value);
  const fixed = abs.toFixed(decimals);
  const trimmed = decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
  return `${sign}${trimmed}`;
}

/** Headline weight delta, e.g. "-8 lb" (R13). */
export function formatWeightDelta(delta: number): string {
  return `${signedTrim(delta, 1)} lb`;
}

/** Headline v-taper delta, e.g. "+0.09" (R13). Always two decimals. */
export function formatVTaperDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '-';
  return `${sign}${Math.abs(delta).toFixed(2)}`;
}

/** Absolute weight under a photo, e.g. "207 lb" (R14). */
export function formatWeight(weightLbs: number): string {
  const rounded = Math.round(weightLbs * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} lb`;
}

/** Absolute v-taper under a photo, e.g. "1.52" (R14). Always two decimals. */
export function formatVTaper(vTaper: number): string {
  return vTaper.toFixed(2);
}
