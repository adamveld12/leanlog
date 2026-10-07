import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type Props = {
  // null while the status is still being read.
  status: 'unavailable' | 'update_required' | 'available' | null;
  connected: boolean;
  // Queued writes not yet in Health Connect.
  pending: number;
  onConnect: () => void;
  onStop: () => void;
  onManage: () => void;
  onGetHealthConnect: () => void;
  onWhy: () => void;
};

// Health Connect is optional: the copy always says everything works without it.
export function HealthConnectCard({
  status,
  connected,
  pending,
  onConnect,
  onStop,
  onManage,
  onGetHealthConnect,
  onWhy,
}: Props) {
  return (
    <Card title="Health Connect">
      {status === null ? <Text variant="helper">Checking Health Connect…</Text> : null}
      {status === 'unavailable' ? (
        <>
          <Text variant="helper">
            {"Health Connect isn't available on this device. Leanlog works fully without it."}
          </Text>
          <Button label="Get Health Connect" variant="secondary" onPress={onGetHealthConnect} />
        </>
      ) : null}
      {status === 'update_required' ? (
        <>
          <Text variant="helper">
            Health Connect needs an update before Leanlog can use it. Leanlog works fully without
            it.
          </Text>
          <Button label="Update Health Connect" variant="secondary" onPress={onGetHealthConnect} />
        </>
      ) : null}
      {status === 'available' && !connected ? (
        <>
          <Text variant="helper">
            Import weight from a smart scale, and share your weigh-ins, body fat and meals with
            other health apps. Everything in Leanlog works without it.
          </Text>
          <Button label="Connect Health Connect" onPress={onConnect} />
        </>
      ) : null}
      {status === 'available' && connected ? (
        <>
          <Text>Connected</Text>
          {pending > 0 ? <Text variant="helper">{`${pending} waiting to sync`}</Text> : null}
          <Button label="Manage in Health Connect" variant="secondary" onPress={onManage} />
          <Button label="Stop syncing" variant="ghost" onPress={onStop} />
        </>
      ) : null}
      <Button label="Why Leanlog asks for this" variant="ghost" onPress={onWhy} />
    </Card>
  );
}
