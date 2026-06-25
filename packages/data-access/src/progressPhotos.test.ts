import { describe, expect, it } from 'vitest';
import {
  computePoseComparison,
  computeProgressComparisons,
  dayProgressPhotoKeys,
  formatElapsed,
  formatVTaper,
  formatVTaperDelta,
  formatWeight,
  formatWeightDelta,
  isOwnedProgressPhotoKey,
  isValidProgressPhotoKey,
  PROGRESS_POSES,
  progressPhotoKeyOwner,
  setDayPhoto,
  type ProgressPhotoDay,
} from './progressPhotos';

const KEY = (userId: string) => `progress/${userId}/2f1c8a3b-4d5e-4f6a-8b9c-0d1e2f3a4b5c.jpg`;

const emptyKeys = { frontPhotoKey: null, sidePhotoKey: null, backPhotoKey: null };

// A day with a chosen pose photo + stats, the rest empty.
function day(
  date: string,
  pose: 'front' | 'side' | 'back',
  key: string | null,
  weightLbs: number | null = null,
  vTaper: number | null = null,
): ProgressPhotoDay {
  const column = { front: 'frontPhotoKey', side: 'sidePhotoKey', back: 'backPhotoKey' }[pose];
  return { ...emptyKeys, [column]: key, date, weightLbs, vTaper };
}

describe('progress-photo keys', () => {
  it('accepts a well-formed private key and reads its owner', () => {
    expect(isValidProgressPhotoKey(KEY('user_abc'))).toBe(true);
    expect(progressPhotoKeyOwner(KEY('user_abc'))).toBe('user_abc');
  });

  it('rejects malformed / public-style keys', () => {
    expect(isValidProgressPhotoKey('nutrition/abc.jpg')).toBe(false);
    expect(isValidProgressPhotoKey('progress/user_abc/not-a-uuid.jpg')).toBe(false);
    expect(
      isValidProgressPhotoKey('progress/user_abc/2f1c8a3b-4d5e-4f6a-8b9c-0d1e2f3a4b5c.png'),
    ).toBe(false);
    expect(progressPhotoKeyOwner('garbage')).toBeNull();
  });

  it('only authorizes a key for its own owner (R8/R9)', () => {
    const key = KEY('user_owner');
    expect(isOwnedProgressPhotoKey(key, 'user_owner')).toBe(true);
    expect(isOwnedProgressPhotoKey(key, 'user_other')).toBe(false);
    // A malformed key is never owned by anyone.
    expect(isOwnedProgressPhotoKey('progress/user_owner/x.jpg', 'user_owner')).toBe(false);
  });

  it('does not let one user read a key sitting under another prefix', () => {
    // Two users uploading byte-identical photos still get distinct, prefix-scoped keys.
    expect(isOwnedProgressPhotoKey(KEY('user_a'), 'user_b')).toBe(false);
  });
});

describe('setDayPhoto', () => {
  it('sets a slot and releases nothing when it was empty', () => {
    const { next, releasedKey } = setDayPhoto(emptyKeys, 'front', KEY('u'));
    expect(next.frontPhotoKey).toBe(KEY('u'));
    expect(releasedKey).toBeNull();
  });

  it('releases the previous key when a same-day slot is replaced (R3/R18)', () => {
    const current = {
      ...emptyKeys,
      backPhotoKey: 'progress/u/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.jpg',
    };
    const fresh = KEY('u');
    const { next, releasedKey } = setDayPhoto(current, 'back', fresh);
    expect(next.backPhotoKey).toBe(fresh);
    expect(releasedKey).toBe(current.backPhotoKey);
  });

  it('clears a slot and releases the old key on delete', () => {
    const current = { ...emptyKeys, sidePhotoKey: KEY('u') };
    const { next, releasedKey } = setDayPhoto(current, 'side', null);
    expect(next.sidePhotoKey).toBeNull();
    expect(releasedKey).toBe(KEY('u'));
  });

  it('lists the distinct keys a day holds', () => {
    expect(
      dayProgressPhotoKeys({ frontPhotoKey: KEY('u'), sidePhotoKey: null, backPhotoKey: KEY('u') }),
    ).toEqual([KEY('u')]);
  });
});

describe('computePoseComparison', () => {
  it('shows an empty state for a pose with no photos (R16)', () => {
    const c = computePoseComparison('side', [], null);
    expect(c.latest).toBeNull();
    expect(c.baseline).toBeNull();
    expect(c.single).toBe(false);
  });

  it('shows a single photo without a zero-change delta (R16)', () => {
    const c = computePoseComparison('back', [day('2026-06-01', 'back', KEY('u'), 200, 1.5)], null);
    expect(c.single).toBe(true);
    expect(c.latest?.date).toBe('2026-06-01');
    expect(c.baseline?.date).toBe('2026-06-01');
    expect(c.elapsedDays).toBeNull();
    expect(c.weightDelta).toBeNull();
    expect(c.vTaperDelta).toBeNull();
  });

  it('headlines elapsed time, weight delta, and v-taper delta (BDD)', () => {
    // earliest front 11 weeks ago at 207 lb / 1.52, latest today at 199 lb / 1.61.
    const days = [
      day('2026-04-09', 'front', KEY('u'), 207, 1.52),
      day('2026-06-25', 'front', KEY('u'), 199, 1.61),
    ];
    const c = computePoseComparison('front', days, null);
    expect(c.single).toBe(false);
    expect(formatElapsed(c.elapsedDays!)).toBe('11 weeks');
    expect(formatWeightDelta(c.weightDelta!)).toBe('-8 lb');
    expect(formatVTaperDelta(c.vTaperDelta!)).toBe('+0.09');
    // Absolute stats under each photo.
    expect(formatWeight(c.baseline!.weightLbs!)).toBe('207 lb');
    expect(formatVTaper(c.baseline!.vTaper!)).toBe('1.52');
    expect(formatWeight(c.latest!.weightLbs!)).toBe('199 lb');
    expect(formatVTaper(c.latest!.vTaper!)).toBe('1.61');
  });

  it('omits the v-taper delta when a photo day lacks v-taper (R11)', () => {
    const days = [
      day('2026-04-09', 'front', KEY('u'), 207, 1.52),
      day('2026-06-25', 'front', KEY('u'), 199, null),
    ];
    const c = computePoseComparison('front', days, null);
    expect(c.weightDelta).not.toBeNull();
    expect(c.vTaperDelta).toBeNull();
    expect(c.latest?.vTaper).toBeNull();
  });

  it('defaults the baseline to the earliest photo', () => {
    const days = [
      day('2026-01-01', 'front', KEY('u'), 210),
      day('2026-03-01', 'front', KEY('u'), 205),
      day('2026-06-01', 'front', KEY('u'), 200),
    ];
    const c = computePoseComparison('front', days, null);
    expect(c.baseline?.date).toBe('2026-01-01');
    expect(c.latest?.date).toBe('2026-06-01');
  });

  it('re-anchors to a chosen baseline day (R15)', () => {
    const days = [
      day('2026-01-01', 'front', KEY('u'), 210),
      day('2026-03-01', 'front', KEY('u'), 205),
      day('2026-06-01', 'front', KEY('u'), 200),
    ];
    const c = computePoseComparison('front', days, '2026-03-01');
    expect(c.baseline?.date).toBe('2026-03-01');
    expect(c.weightDelta).toBe(-5);
  });

  it('falls back to earliest when the chosen baseline day has no photo for this pose', () => {
    const days = [
      day('2026-01-01', 'front', KEY('u'), 210),
      day('2026-06-01', 'front', KEY('u'), 200),
    ];
    const c = computePoseComparison('front', days, '2026-04-15');
    expect(c.baseline?.date).toBe('2026-01-01');
  });

  it('treats only this pose photos, ignoring other poses on the same day', () => {
    const days: ProgressPhotoDay[] = [
      { ...emptyKeys, date: '2026-01-01', weightLbs: 210, vTaper: null, sidePhotoKey: KEY('u') },
      { ...emptyKeys, date: '2026-06-01', weightLbs: 200, vTaper: null, frontPhotoKey: KEY('u') },
    ];
    const front = computePoseComparison('front', days, null);
    expect(front.single).toBe(true);
    expect(front.latest?.date).toBe('2026-06-01');
  });

  it('computes all three poses in order', () => {
    const comparisons = computeProgressComparisons([], {
      front: null,
      side: null,
      back: null,
    });
    expect(comparisons.map((c) => c.pose)).toEqual([...PROGRESS_POSES]);
  });
});

describe('formatters', () => {
  it('formats elapsed time across ranges', () => {
    expect(formatElapsed(1)).toBe('1 day');
    expect(formatElapsed(5)).toBe('5 days');
    expect(formatElapsed(77)).toBe('11 weeks');
    expect(formatElapsed(400)).toBe('13 months');
  });

  it('formats weight deltas with sign, trimming trailing zeros', () => {
    expect(formatWeightDelta(-8)).toBe('-8 lb');
    expect(formatWeightDelta(2.4)).toBe('+2.4 lb');
    expect(formatWeightDelta(0)).toBe('±0 lb');
  });

  it('formats v-taper deltas to two decimals', () => {
    expect(formatVTaperDelta(0.09)).toBe('+0.09');
    expect(formatVTaperDelta(-0.1)).toBe('-0.10');
  });

  it('formats absolute weight and v-taper', () => {
    expect(formatWeight(207)).toBe('207 lb');
    expect(formatWeight(199.4)).toBe('199.4 lb');
    expect(formatVTaper(1.6)).toBe('1.60');
  });
});
