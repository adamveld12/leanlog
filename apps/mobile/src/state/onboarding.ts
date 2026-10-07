import type { MobileProfile } from '@leanlog/data-access';

// A profile that has everything the calorie model needs from first launch (R34).
export function isOnboarded(
  profile: Pick<MobileProfile, 'sex' | 'heightIn' | 'birthDate'>,
): boolean {
  return profile.sex != null && profile.heightIn != null && profile.birthDate != null;
}
