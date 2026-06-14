import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { HelperText } from '../atoms/HelperText';
import { Spinner } from '../atoms/Spinner';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type LoadingStateProps = { label?: string; size?: 'sm' | 'md' | 'lg' };

export function LoadingState({ label, size = 'lg' }: LoadingStateProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'LoadingState' }}>
      <div className={cn(recipes.stack.sm, 'items-center py-6')}>
        <Spinner size={size} />
        {label ? <HelperText as="p">{label}</HelperText> : null}
      </div>
    </AnalyticsScope>
  );
}
