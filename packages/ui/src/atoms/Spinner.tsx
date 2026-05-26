import { cn } from '../styles/cn';

type SpinnerProps = { size?: 'sm' | 'md' | 'lg'; className?: string };

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn(sizes[size], 'animate-ll-spin motion-reduce:animate-none', className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="var(--ll-line)" strokeWidth="2.5" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="var(--ll-text)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
