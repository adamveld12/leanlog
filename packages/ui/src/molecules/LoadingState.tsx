import { AnalyticsScope } from '../analytics';
import { HelperText } from '../atoms/HelperText';
import { Spinner } from '../atoms/Spinner';

type LoadingStateProps = { label?: string; size?: 'sm' | 'md' | 'lg' };

export function LoadingState({ label, size = 'lg' }: LoadingStateProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'LoadingState' }}>
      <div className="flex flex-col items-center gap-2.5 py-8">
        <Spinner size={size} />
        {label ? <HelperText as="p">{label}</HelperText> : null}
      </div>
    </AnalyticsScope>
  );
}
