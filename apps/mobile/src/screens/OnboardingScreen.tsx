import { useEffect, useState } from 'react';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { BodyFatCalculatorCard } from '../ui/organisms/BodyFatCalculatorCard';
import { OnboardingHealthConnectCard } from '../ui/organisms/OnboardingHealthConnectCard';
import { OnboardingBodyFatOfferCard } from '../ui/organisms/OnboardingBodyFatOfferCard';
import {
  OnboardingProfileCard,
  type OnboardingProfile,
} from '../ui/organisms/OnboardingProfileCard';
import { useMobileStore } from '../state/MobileStore';
import { useRunAction } from './useRunAction';

type Hints = { weightLbs: number | null; heightIn: number | null };

type Step =
  | { name: 'checking' }
  | { name: 'health' }
  | { name: 'profile'; hints?: Hints }
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
  const { state, actions, healthConnect } = useMobileStore();
  const [step, setStep] = useState<Step>({ name: 'checking' });
  const { error, run } = useRunAction();

  // Offer Health Connect first, but only where it exists: no point asking on a
  // device without it.
  const service = healthConnect?.service;
  useEffect(() => {
    let current = true;
    void (async () => {
      const available = service ? (await service.status()) === 'available' : false;
      if (current) setStep(available ? { name: 'health' } : { name: 'profile' });
    })().catch(() => {
      if (current) setStep({ name: 'profile' });
    });
    return () => {
      current = false;
    };
  }, [service]);

  if (state.status !== 'ready') {
    return (
      <Screen>
        <Text variant="helper">Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {step.name === 'health' && healthConnect ? (
        <OnboardingHealthConnectCard
          onConnect={() =>
            void run(async () => {
              const connected = await healthConnect.connect();
              const hints = connected
                ? await healthConnect.service.readProfileHints()
                : { weightLbs: null, heightIn: null };
              setStep({ name: 'profile', hints });
            })
          }
          onSkip={() => setStep({ name: 'profile' })}
        />
      ) : null}
      {step.name === 'profile' ? (
        <OnboardingProfileCard
          key={`${step.hints?.weightLbs}|${step.hints?.heightIn}`}
          prefill={step.hints}
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
