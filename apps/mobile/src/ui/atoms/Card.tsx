import type { ReactNode } from 'react';
import { View } from 'react-native';
import { radius, spacing, useColors } from '../theme';
import { Text } from './Text';

type Props = {
  title?: string;
  // Trailing slot in the header row, e.g. a total or a small action.
  headerEnd?: ReactNode;
  children: ReactNode;
  testID?: string;
};

// Controls live inside cards (see AGENTS.md): give a card a slot rather than
// floating buttons between cards.
export function Card({ title, headerEnd, children, testID }: Props) {
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
      {title || headerEnd ? (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {title ? <Text variant="heading">{title}</Text> : <View />}
          {headerEnd}
        </View>
      ) : null}
      {children}
    </View>
  );
}
