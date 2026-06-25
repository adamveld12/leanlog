import { useEffect, useState, type PropsWithChildren } from 'react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { cn, ErrorTemplate, LoadingState, recipes, ThemeToggle } from '@leanlog/ui';
import type { SaveSections } from '../types';

export function useSavedSections() {
  const [saved, setSaved] = useState<SaveSections>({});
  const markSaved = (key: keyof SaveSections) => setSaved((s) => ({ ...s, [key]: true }));
  const markDirty = (key: keyof SaveSections) => setSaved((s) => ({ ...s, [key]: false }));
  return { saved, markSaved, markDirty };
}

const THEME_KEY = 'leanlog.theme';

function useTheme() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(
    () => (localStorage.getItem(THEME_KEY) as 'system' | 'light' | 'dark') ?? 'system',
  );
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return [theme, setTheme] as const;
}

// Shared render-prop helper passed to template `renderNavLink` slots (not a
// component invoked as <X/>), intentionally co-located with the other route
// helpers; Fast Refresh state preservation does not apply.
// react-doctor-disable-next-line react-doctor/only-export-components
export const renderRouterNavLink = ({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) => (
  // NavLink underlines the link for the current page. `end` keeps "/track"
  // (Execute) from matching its nested day/goal/nutrition routes.
  <NavLink
    to={href}
    end={href === '/track'}
    className={({ isActive }) =>
      cn(className, isActive && 'text-[var(--ll-text)] underline decoration-2 underline-offset-4')
    }
  >
    {label}
  </NavLink>
);

// Theme toggle (left) + Clerk user control (right), shown in every page header
// in place of the old Settings page (#56, R5).
export function HeaderControls() {
  const [theme, setTheme] = useTheme();
  return (
    <>
      <ThemeToggle value={theme} onChange={setTheme} />
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}

export type RouteLoadStatus = 'loading' | 'not_found' | 'error';
export type RouteLoadState = { dayId: string; status: RouteLoadStatus; error: string };

export function PageLoadingState({ label }: { label: string }) {
  return (
    <div className={cn(recipes.stack.centerFull, 'min-h-screen')}>
      <LoadingState label={label} />
    </div>
  );
}

export function RouteLoadingState({ title }: { title: string }) {
  return <PageLoadingState label={title} />;
}

export function RouteErrorState({ message }: { message: string }) {
  const nav = useNavigate();

  return (
    <ErrorTemplate
      title="Unable to load tracker data"
      message={message}
      homeHref="/"
      retryLabel="Back to days"
      onRetry={() => nav('/track')}
    />
  );
}

export function TrackerErrorState({ message }: { message: string }) {
  return <ErrorTemplate title="Unable to load LeanLog" message={message} homeHref="/" />;
}

export function RequireSignedIn({ children }: PropsWithChildren) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
}
