import type { ReactNode } from 'react';
import { View } from 'react-native';
import { radius, spacing, useColors } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

type Props = {
  title?: string;
  // Muted note at the end of the header row, e.g. a total.
  headerNote?: string;
  // A small action at the end of the header row.
  headerAction?: { label: string; onPress: () => void };
  children: ReactNode;
  testID?: string;
};

// Controls live inside cards (see AGENTS.md): give a card a slot rather than
// floating buttons between cards.
export function Card({ title, headerNote, headerAction, children, testID }: Props) {
  const c = useColors();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: c.surface,
        borderColor: c.line,
        borderWidth: 1,
        borderRadius: radius.card,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {title || headerNote || headerAction ? (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {title ? <Text variant="heading">{title}</Text> : <View />}
          {headerNote ? <Text variant="helper">{headerNote}</Text> : null}
          {headerAction ? (
            <Button label={headerAction.label} variant="secondary" onPress={headerAction.onPress} />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
