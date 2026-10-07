import { Modal, View } from 'react-native';
import { radius, spacing, useColors } from '../theme';
import { Button, type ButtonVariant } from '../atoms/Button';
import { Text } from '../atoms/Text';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

// A modal confirmation for destructive actions (never a bare system alert).
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: '#00000066',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            backgroundColor: c.surface,
            borderRadius: radius.card,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text variant="title">{title}</Text>
          <Text>{message}</Text>
          <Button label={confirmLabel} variant={confirmVariant} onPress={onConfirm} />
          <Button label="Cancel" variant="ghost" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
