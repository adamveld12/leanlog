import { lazy, Suspense } from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './LandingPage';
import DayListPage from './DayListPage';
import { PageLoadingState, RequireSignedIn } from './_shared';

// Deeper signed-in routes are code-split: each becomes its own lazy chunk so the
// initial bundle stays small (#70). Landing + DayList load eagerly since they are
// the first paint for anonymous and signed-in users respectively.
const DayDetailPage = lazy(() => import('./DayDetailPage'));
const MealEditPage = lazy(() => import('./MealEditPage'));
const NutritionFactsDatabasePage = lazy(() => import('./NutritionFactsDatabasePage'));
const GoalsPage = lazy(() => import('./GoalsPage'));
const StatsPage = lazy(() => import('./StatsPage'));

export default function App() {
  return (
    <Suspense fallback={<PageLoadingState label="Loading…" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/track"
          element={
            <RequireSignedIn>
              <DayListPage />
            </RequireSignedIn>
          }
        />
        <Route
          path="/track/day/:dayId"
          element={
            <RequireSignedIn>
              <DayDetailPage />
            </RequireSignedIn>
          }
        />
        <Route
          path="/track/day/:dayId/meal/:mealId"
          element={
            <RequireSignedIn>
              <MealEditPage />
            </RequireSignedIn>
          }
        />
        <Route
          path="/track/nutrition-facts"
          element={
            <RequireSignedIn>
              <NutritionFactsDatabasePage />
            </RequireSignedIn>
          }
        />
        <Route
          path="/track/stats"
          element={
            <RequireSignedIn>
              <StatsPage />
            </RequireSignedIn>
          }
        />
        <Route
          path="/track/goals"
          element={
            <RequireSignedIn>
              <GoalsPage />
            </RequireSignedIn>
          }
        />
        <Route
          path="*"
          element={
            <>
              <SignedIn>
                <Navigate to="/track" replace />
              </SignedIn>
              <SignedOut>
                <Navigate to="/" replace />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </Suspense>
  );
}
