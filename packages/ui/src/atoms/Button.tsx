import type { AnchorHTMLAttributes, ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { useAnalytics } from '../analytics/AnalyticsProvider';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type ButtonSize = 'md' | 'sm';
type AnalyticsValue = string | number | readonly string[] | undefined;

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  analyticsName?: string;
};

type NativeButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> &
  ButtonOwnProps & { as?: 'button' };

type AnchorButtonProps = PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>> &
  ButtonOwnProps & {
    as: 'a';
    name?: string;
    value?: AnalyticsValue;
  };

type ButtonProps = NativeButtonProps | AnchorButtonProps;

function buttonClassName({
  className,
  fullWidth,
  size,
  variant,
}: {
  className: string;
  fullWidth?: boolean;
  size: ButtonSize;
  variant: ButtonVariant;
}) {
  return cn(
    recipes.control.base,
    recipes.control.size[size],
    recipes.radius.control,
    recipes.transition,
    recipes.focusRing,
    'active:scale-[0.98]',
    recipes.button[variant],
    fullWidth && 'w-full',
    className,
  );
}

function analyticsValue(value: AnalyticsValue): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

export function Button(props: ButtonProps) {
  const track = useAnalytics();

  if (props.as === 'a') {
    const {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      fullWidth,
      analyticsName,
      name,
      value,
      onClick,
      href,
      as,
      ...anchorProps
    } = props;
    void as;

    return (
      <a
        className={buttonClassName({ className, fullWidth, size, variant })}
        href={href}
        onClick={(event) => {
          track('ui.button.click', {
            atom: 'Button',
            name: analyticsName ?? name,
            value: analyticsValue(value),
            variant,
            // Best-effort analytics label only; not a render branch on children type.
            // react-doctor-disable-next-line react-doctor/no-polymorphic-children
            text: typeof children === 'string' ? children : undefined,
          });
          onClick?.(event);
        }}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  const {
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    fullWidth,
    analyticsName,
    name,
    value,
    onClick,
    type = 'button',
    ...buttonProps
  } = props;

  return (
    <button
      type={type}
      className={buttonClassName({ className, fullWidth, size, variant })}
      name={name}
      value={value}
      onClick={(event) => {
        track('ui.button.click', {
          atom: 'Button',
          name: analyticsName ?? name,
          value: analyticsValue(value),
          variant,
          // Best-effort analytics label only; not a render branch on children type.
          // react-doctor-disable-next-line react-doctor/no-polymorphic-children
          text: typeof children === 'string' ? children : undefined,
        });
        onClick?.(event);
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
