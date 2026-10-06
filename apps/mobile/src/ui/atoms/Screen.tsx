import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { spacing, useColors } from '../theme';

// Scrolling page container: themed background, standard gutter, vertical rhythm.
export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
