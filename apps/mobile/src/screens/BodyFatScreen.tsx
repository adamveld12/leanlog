import { useRouter } from 'expo-router';
import { FALLBACK_WEIGHT_LBS } from '@leanlog/data-access';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { BodyFatCalculatorCard } from '../ui/organisms/BodyFatCalculatorCard';
import { useMobileStore } from '../state/MobileStore';
import { latestWeight } from '../state/selectors';
import { useRunAction } from './useRunAction';

export function BodyFatScreen() {
  const { state, actions } = useMobileStore();
  const router = useRouter();
  const { error, run } = useRunAction();

  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }
  const { data, today } = state;
  const { profile } = data;

  // Pre-fill each measurement from today, else the most recent day that has it.
  const latestOf = (key: 'neckIn' | 'waistIn' | 'hipIn') => {
    const rows = data.days.filter((d) => d.date <= today && d[key] != null);
    return rows[rows.length - 1]?.[key] ?? null;
  };

  return (
    <Screen>
      <BodyFatCalculatorCard
        todayIso={today}
        profile={{ sex: profile.sex, heightIn: profile.heightIn, birthDate: profile.birthDate }}
        measurements={{
          neckIn: latestOf('neckIn'),
          waistIn: latestOf('waistIn'),
          hipIn: latestOf('hipIn'),
        }}
        targetContext={{
          weightLbs:
            latestWeight(data, today) ?? profile.onboardingWeightLbs ?? FALLBACK_WEIGHT_LBS,
          activityLevel: profile.activityLevel,
          calorieDelta: profile.calorieDelta,
          macroFats: profile.macroFats,
          macroCarbs: profile.macroCarbs,
          macroProtein: profile.macroProtein,
        }}
        onSave={(result) =>
          void run(async () => {
            await actions.saveBodyFat(result);
            if (router.canGoBack()) router.back();
            else router.replace('/');
          })
        }
      />
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
