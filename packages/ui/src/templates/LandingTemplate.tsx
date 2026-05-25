import type { ComponentProps } from 'react';
import { AuthLanding } from '../organisms/AuthLanding';

export type LandingTemplateProps = ComponentProps<typeof AuthLanding>;
export function LandingTemplate(props: LandingTemplateProps) {
  return <AuthLanding {...props} />;
}
