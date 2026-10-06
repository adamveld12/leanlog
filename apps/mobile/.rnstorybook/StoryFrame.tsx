import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useColors } from '../src/ui/theme';

export function StoryFrame({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <View style={{ flex: 1, padding: 16, backgroundColor: colors.bg }}>{children}</View>;
}
