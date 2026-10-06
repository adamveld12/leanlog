import { FALLBACK_WEIGHT_LBS } from '@leanlog/data-access';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { ProfileCard } from '../ui/organisms/ProfileCard';
import { SettingsCard } from '../ui/organisms/SettingsCard';
import { TargetsCard } from '../ui/organisms/TargetsCard';
import { useMobileStore } from '../state/MobileStore';
import { latestBodyFat, latestWeight } from '../state/selectors';
import { useRunAction } from './useRunAction';

export function MeScreen() {
  const { state, actions } = useMobileStore();
  const { error, saved, run } = useRunAction();

  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  const { data, today } = state;
  const { profile, settings } = data;

  return (
    <Screen>
      <TargetsCard
        key={`targets:${profile.activityLevel}|${profile.calorieDelta}|${profile.macroFats}|${profile.macroCarbs}|${profile.macroProtein}`}
        initial={{
          activityLevel: profile.activityLevel,
          calorieDelta: profile.calorieDelta,
          macroFats: profile.macroFats,
          macroCarbs: profile.macroCarbs,
          macroProtein: profile.macroProtein,
        }}
        weightLbs={latestWeight(data, today) ?? profile.onboardingWeightLbs ?? FALLBACK_WEIGHT_LBS}
        bodyFatPct={latestBodyFat(data, today)?.pct ?? null}
        onSave={(draft) => void run(() => actions.updateProfile(draft))}
      />
      <ProfileCard
        key={`profile:${profile.sex}|${profile.heightIn}|${profile.birthDate}`}
        initial={{ sex: profile.sex, heightIn: profile.heightIn, birthDate: profile.birthDate }}
        onSave={(draft) => void run(() => actions.updateProfile(draft))}
      />
      <SettingsCard
        units={settings.units}
        onChangeUnits={(units) => void run(() => actions.updateSettings({ units }))}
      />
      {saved ? <Text variant="helper">Saved</Text> : null}
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
