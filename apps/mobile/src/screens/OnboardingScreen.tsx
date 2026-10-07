import { useState } from 'react';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { BodyFatCalculatorCard } from '../ui/organisms/BodyFatCalculatorCard';
import { OnboardingBodyFatOfferCard } from '../ui/organisms/OnboardingBodyFatOfferCard';
import {
  OnboardingProfileCard,
  type OnboardingProfile,
} from '../ui/organisms/OnboardingProfileCard';
import { useMobileStore } from '../state/MobileStore';
import { useRunAction } from './useRunAction';

type Step =
  | { name: 'profile' }
  | { name: 'offer'; profile: OnboardingProfile }
  | {
      name: 'calculator';
      profile: OnboardingProfile;
    };

// The profile fields the onboarding form collects, as a profile patch.
const toProfilePatch = (p: OnboardingProfile) => ({
  sex: p.sex,
  heightIn: p.heightIn,
  birthDate: p.birthDate,
  onboardingWeightLbs: p.weightLbs,
});

// First launch (R34). Nothing is saved until the last step: saving the profile is
// what marks the user onboarded, and doing it early would skip the body fat offer.
export function OnboardingScreen() {
  const { state, actions } = useMobileStore();
  const [step, setStep] = useState<Step>({ name: 'profile' });
  const { error, run } = useRunAction();

  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {step.name === 'profile' ? (
        <OnboardingProfileCard
          todayIso={state.today}
          onNext={(profile) => setStep({ name: 'offer', profile })}
        />
      ) : null}
      {step.name === 'offer' ? (
        <OnboardingBodyFatOfferCard
          onCalculate={() => setStep({ name: 'calculator', profile: step.profile })}
          onSkip={() =>
            void run(async () => {
              await actions.logWeight(step.profile.weightLbs);
              await actions.updateProfile(toProfilePatch(step.profile));
            })
          }
        />
      ) : null}
      {step.name === 'calculator' ? (
        <BodyFatCalculatorCard
          todayIso={state.today}
          profile={{
            sex: step.profile.sex,
            heightIn: step.profile.heightIn,
            birthDate: step.profile.birthDate,
          }}
          measurements={{ neckIn: null, waistIn: null, hipIn: null }}
          targetContext={{
            weightLbs: step.profile.weightLbs,
            activityLevel: null,
            calorieDelta: 0,
            macroFats: 30,
            macroCarbs: 40,
            macroProtein: 30,
          }}
          onSave={(result) =>
            void run(async () => {
              await actions.logWeight(step.profile.weightLbs);
              await actions.saveBodyFat({
                ...result,
                profilePatch: { ...result.profilePatch, ...toProfilePatch(step.profile) },
              });
            })
          }
        />
      ) : null}
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
