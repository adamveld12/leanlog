import { useEffect, useReducer, useState, type PropsWithChildren } from 'react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import type { UserProfile } from '@leanlog/data-access';
import {
  cn,
  ErrorTemplate,
  LoadingState,
  recipes,
  Text,
  ThemeToggle,
  useAnalytics,
} from '@leanlog/ui';
import { useStore } from '../state';
import type { SaveSections } from '../types';

type AppMode = UserProfile['appMode'];

// Each mode's home route (#102).
const MODE_HOME: Record<AppMode, string> = { full: '/track', simple: '/simple' };

export type ApplyPlanState = {
  applying: boolean;
  result: { filled: number; skipped: number } | null;
};

type ApplyPlanAction =
  | { type: 'start' }
  | { type: 'succeeded'; filled: number; skipped: number }
  | { type: 'settled' };

function applyPlanReducer(state: ApplyPlanState, action: ApplyPlanAction): ApplyPlanState {
  switch (action.type) {
    case 'start':
      return { ...state, applying: true };
    case 'succeeded':
      return {
        applying: state.applying,
        result: { filled: action.filled, skipped: action.skipped },
      };
    case 'settled':
      return { ...state, applying: false };
  }
}

// Groups the "apply a plan" lifecycle (in-flight + last result) into one
// reducer instead of two separate useState atoms; shared by DayDetailPage and
// PlanEditPage. `result` persists across a later failed re-attempt, matching
// the original try/finally behavior (only `applying` resets on failure).
export function useApplyPlanState() {
  return useReducer(applyPlanReducer, { applying: false, result: null });
}

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
    end={href === '/track' || href === '/simple'}
    className={({ isActive }) =>
      cn(className, isActive && 'text-[var(--ll-text)] underline decoration-2 underline-offset-4')
    }
  >
    {label}
  </NavLink>
);

// Theme toggle (left) + Clerk user control (right), shown in every page header
// in place of the old Settings page (#56, R5). The user menu carries the
// simple/full mode switch (#102).
export function HeaderControls() {
  const [theme, setTheme] = useTheme();
  const { profile, setAppMode } = useStore();
  const nav = useNavigate();
  const track = useAnalytics();
  const target: AppMode | null = profile
    ? profile.appMode === 'simple'
      ? 'full'
      : 'simple'
    : null;

  async function switchMode(to: AppMode) {
    try {
      await setAppMode(to);
      track('simple.mode.switched', { to });
      nav(MODE_HOME[to]);
    } catch (e) {
      posthog.captureException(e, { context: 'simple_mode_switch' });
    }
  }

  return (
    <>
      <ThemeToggle value={theme} onChange={setTheme} />
      <SignedIn>
        <UserButton afterSignOutUrl="/">
          {target ? (
            <UserButton.MenuItems>
              <UserButton.Action
                label={target === 'simple' ? 'Switch to simple mode' : 'Switch to full LeanLog'}
                labelIcon={<Text aria-hidden="true">⇄</Text>}
                onClick={() => void switchMode(target)}
              />
            </UserButton.MenuItems>
          ) : null}
        </UserButton>
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

// Keeps each account on its own mode's pages (#102): a simple-mode account is
// sent from full-mode routes to /simple, and vice versa. Waits for the profile
// so nobody briefly sees the wrong app; with no profile (load failed) the page
// renders and shows its own error state.
function RequireMode({ mode, children }: PropsWithChildren<{ mode: AppMode }>) {
  const { profile, loading } = useStore();
  if (loading) return <PageLoadingState label="Loading…" />;
  if (profile && profile.appMode !== mode)
    return <Navigate to={MODE_HOME[profile.appMode]} replace />;
  return <>{children}</>;
}

export function RequireSignedIn({
  children,
  mode = 'full',
}: PropsWithChildren<{ mode?: AppMode }>) {
  return (
    <>
      <SignedIn>
        <RequireMode mode={mode}>{children}</RequireMode>
      </SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
}
