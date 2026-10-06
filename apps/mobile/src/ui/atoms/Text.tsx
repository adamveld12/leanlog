import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { useColors, type Colors } from '../theme';

export type TextVariant = 'title' | 'heading' | 'body' | 'helper' | 'warning' | 'unit';

function variantStyle(variant: TextVariant, c: Colors): TextStyle {
  switch (variant) {
    case 'title':
      return { fontSize: 22, fontWeight: '700', color: c.text };
    case 'heading':
      return {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.96,
        textTransform: 'uppercase',
        color: c.textMuted,
      };
    case 'helper':
      return { fontSize: 13, color: c.textMuted };
    case 'warning':
      return { fontSize: 13, color: c.warn };
    case 'unit':
      return { fontSize: 13, color: c.textMuted };
    case 'body':
    default:
      return { fontSize: 16, color: c.text };
  }
}

type Props = {
  variant?: TextVariant;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
  numberOfLines?: number;
};

export function Text({ variant = 'body', children, style, testID, numberOfLines }: Props) {
  const colors = useColors();
  return (
    <RNText
      testID={testID}
      numberOfLines={numberOfLines}
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      style={[variantStyle(variant, colors), style]}
    >
      {children}
    </RNText>
  );
}
