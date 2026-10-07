import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { FALLBACK_WEIGHT_LBS } from '@leanlog/data-access';
import type { HcStatus } from '../health/HealthConnectService';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';
import { HealthConnectCard } from '../ui/organisms/HealthConnectCard';
import { ProfileCard } from '../ui/organisms/ProfileCard';
import { SettingsCard } from '../ui/organisms/SettingsCard';
import { TargetsCard } from '../ui/organisms/TargetsCard';
import { useMobileStore } from '../state/MobileStore';
import { latestBodyFat, latestWeight } from '../state/selectors';
import { useRunAction } from './useRunAction';

const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

type HealthConnectInfo = { status: HcStatus; connected: boolean; pending: number };

export function MeScreen() {
  const { state, actions, healthConnect } = useMobileStore();
  const router = useRouter();
  const { error, saved, run } = useRunAction();
  const [hcInfo, setHcInfo] = useState<HealthConnectInfo | null>(null);

  const service = healthConnect?.service;
  const loadHcInfo = useCallback(async () => {
    if (!service) return;
    const [status, connected, pending] = await Promise.all([
      service.status(),
      service.isConnected(),
      service.pendingCount(),
    ]);
    setHcInfo({ status, connected, pending });
  }, [service]);

  // Re-read Health Connect's status whenever the stored data reloads (and after
  // connecting or stopping, below).
  useEffect(() => {
    void loadHcInfo().catch(() => undefined);
  }, [loadHcInfo, state]);

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
      {healthConnect ? (
        <HealthConnectCard
          status={hcInfo?.status ?? null}
          connected={hcInfo?.connected ?? false}
          pending={hcInfo?.pending ?? 0}
          onConnect={() =>
            void run(async () => {
              const connected = await healthConnect.connect();
              await loadHcInfo();
              if (!connected) throw new Error('Health Connect permission was not granted.');
            })
          }
          onStop={() =>
            void run(async () => {
              await healthConnect.disconnect();
              await loadHcInfo();
            })
          }
          onManage={() => healthConnect.service.openSettings()}
          onGetHealthConnect={() => {
            void Linking.openURL(`market://details?id=${HEALTH_CONNECT_PACKAGE}`).catch(() =>
              Linking.openURL(
                `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`,
              ),
            );
          }}
          onWhy={() => router.push('/health-rationale')}
        />
      ) : null}
      {saved ? <Text variant="helper">Saved</Text> : null}
      {error ? <Text variant="warning">{error}</Text> : null}
    </Screen>
  );
}
