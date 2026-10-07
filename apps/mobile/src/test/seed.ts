import { ensureSeeded } from '../db/repos/base';
import { updateProfile } from '../db/repos/profile';
import type { Db } from '../db/types';

// A profile that has finished onboarding (sex, height, birth date), so the app
// opens on the tabs instead of the first-launch flow. Today is 2026-10-06.
export async function seedOnboarded(db: Db): Promise<void> {
  await ensureSeeded(db);
  await updateProfile(db, '2026-10-06', { sex: 'male', heightIn: 72, birthDate: '1991-01-01' });
}
