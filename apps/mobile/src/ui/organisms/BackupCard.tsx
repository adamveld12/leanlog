import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';

type Props = { onExport: () => void; onImport: () => void };

export function BackupCard({ onExport, onImport }: Props) {
  return (
    <Card title="Backup">
      <Text variant="helper">
        Your data lives only on this phone. Export a copy to keep it safe or to move to another
        phone; importing replaces everything here.
      </Text>
      <Button label="Export data" variant="secondary" onPress={onExport} />
      <Button label="Import data" variant="secondary" onPress={onImport} />
    </Card>
  );
}
