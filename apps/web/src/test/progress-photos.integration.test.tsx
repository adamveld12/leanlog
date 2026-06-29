import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import { todayIso } from '../lib';
import type { DailyMealLog } from '@leanlog/data-access';

// The capture path optimizes the blob via canvas, which jsdom can't run; pass the
// blob through so the upload flow is exercised without a real canvas.
vi.mock('../image', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../image')>();
  return { ...actual, optimizeImage: async (blob: Blob) => blob };
});
vi.mock('react-chartjs-2', () => ({ Line: () => null }));

const apiMock = api as unknown as {
  days: { list: Mock; get: Mock };
  mealTemplates: { list: Mock };
  progressPhotos: { uploadImage: Mock; setDayPhoto: Mock; setBaseline: Mock; fetchBlob: Mock };
};

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

const now = new Date().toISOString();
const TODAY = todayIso();
const KEY = (n: number) => `progress/user_test/2f1c8a3b-4d5e-4f6a-8b9c-0d1e2f3a4b5${n}.jpg`;

function makeDay(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'day-1',
    userId: 'user_test',
    date: TODAY,
    targetCalories: 2000,
    targetFat: 70,
    targetCarbs: 250,
    targetProtein: 140,
    mealCountTarget: 0,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

afterEach(() => {
  cleanup();
  apiMock.days.list.mockReset();
  apiMock.days.list.mockResolvedValue({ days: [] });
  apiMock.days.get.mockReset();
  apiMock.mealTemplates.list.mockResolvedValue({ templates: [] });
  apiMock.progressPhotos.uploadImage.mockReset();
  apiMock.progressPhotos.setDayPhoto.mockReset();
  apiMock.progressPhotos.setBaseline.mockReset();
  apiMock.progressPhotos.fetchBlob.mockReset();
  apiMock.progressPhotos.fetchBlob.mockResolvedValue(new Blob([], { type: 'image/jpeg' }));
});

describe('progress photo comparison (Statistics area)', () => {
  it('headlines elapsed time and weight delta for the latest-vs-baseline front pose', async () => {
    apiMock.days.list.mockResolvedValue({
      days: [
        makeDay({ id: 'a', date: '2026-04-09', weightLbs: 207, frontPhotoKey: KEY(0) }),
        makeDay({ id: 'b', date: '2026-06-25', weightLbs: 199, frontPhotoKey: KEY(1) }),
      ],
    });
    renderApp('/track/goals');

    await waitFor(() => expect(screen.getByText('11 weeks')).toBeInTheDocument());
    expect(screen.getByText('-8 lb')).toBeInTheDocument();
    // Absolute weights under each photo. These days carry no shoulder/waist, so
    // each stat line is the bare weight ("207 lb", not "207 lb · v-taper …") —
    // v-taper is omitted rather than zeroed (R11).
    expect(screen.getByText('207 lb')).toBeInTheDocument();
    expect(screen.getByText('199 lb')).toBeInTheDocument();
    // The bytes were fetched through the authenticated proxy, never a public <img>.
    await waitFor(() => expect(apiMock.progressPhotos.fetchBlob).toHaveBeenCalled());
  });

  it('headlines the v-taper delta when the photo days carry shoulder + waist (#68)', async () => {
    // Baseline 50/32 → 1.56, latest 51/31 → 1.65, so the comparison reads +0.09.
    apiMock.days.list.mockResolvedValue({
      days: [
        makeDay({
          id: 'a',
          date: '2026-04-09',
          weightLbs: 207,
          shoulderInches: 50,
          waistInches: 32,
          frontPhotoKey: KEY(0),
        }),
        makeDay({
          id: 'b',
          date: '2026-06-25',
          weightLbs: 199,
          shoulderInches: 51,
          waistInches: 31,
          frontPhotoKey: KEY(1),
        }),
      ],
    });
    renderApp('/track/goals');

    await waitFor(() => expect(screen.getByText('v-taper +0.09')).toBeInTheDocument());
    // Absolute v-taper accompanies the weight beneath each photo.
    expect(screen.getByText('207 lb · v-taper 1.56')).toBeInTheDocument();
    expect(screen.getByText('199 lb · v-taper 1.65')).toBeInTheDocument();
  });

  it('shows an empty prompt for poses with no photos', async () => {
    apiMock.days.list.mockResolvedValue({
      days: [makeDay({ id: 'a', date: '2026-06-25', frontPhotoKey: KEY(0) })],
    });
    renderApp('/track/goals');
    await waitFor(() =>
      expect(screen.getByText(/Log a side photo on the day page/)).toBeInTheDocument(),
    );
  });

  it('re-picks the baseline through the selector (R15)', async () => {
    apiMock.progressPhotos.setBaseline.mockResolvedValue({
      id: 'p1',
      clerkUserId: 'user_test',
      weightLbs: 180,
      heightInches: 72,
      calorieMode: 'maintenance',
      targetCalories: null,
      macroMode: 'percentage',
      macroFats: 25,
      macroCarbs: 35,
      macroProtein: 40,
      goalWeightLbs: null,
      goalBodyFatPct: null,
      frontBaselineDate: '2026-04-09',
      sideBaselineDate: null,
      backBaselineDate: null,
      createdAt: now,
      updatedAt: now,
    });
    apiMock.days.list.mockResolvedValue({
      days: [
        makeDay({ id: 'a', date: '2026-04-09', weightLbs: 207, frontPhotoKey: KEY(0) }),
        makeDay({ id: 'b', date: '2026-05-21', weightLbs: 203, frontPhotoKey: KEY(1) }),
        makeDay({ id: 'c', date: '2026-06-25', weightLbs: 199, frontPhotoKey: KEY(2) }),
      ],
    });
    renderApp('/track/goals');

    const select = await screen.findByRole('combobox');
    await userEvent.selectOptions(select, 'May 21');
    expect(apiMock.progressPhotos.setBaseline).toHaveBeenCalledWith('test-token', {
      pose: 'front',
      date: '2026-05-21',
    });
  });
});

describe('progress photo capture (day page)', () => {
  it('imports a front photo and pins it to the day', async () => {
    const day = makeDay({ id: 'day-1', date: TODAY });
    apiMock.days.list.mockResolvedValue({ days: [day] });
    apiMock.days.get.mockResolvedValue(day);
    apiMock.progressPhotos.uploadImage.mockResolvedValue({
      key: KEY(7),
      contentType: 'image/jpeg',
    });
    apiMock.progressPhotos.setDayPhoto.mockResolvedValue(
      makeDay({ id: 'day-1', frontPhotoKey: KEY(7) }),
    );

    renderApp('/track/day/day-1');

    // Three pose slots, each offering camera + import (current day).
    const importButtons = await screen.findAllByRole('button', { name: 'Import' });
    expect(importButtons).toHaveLength(3);

    // Importing into the first (front) slot routes the upload to that pose.
    await userEvent.click(importButtons[0]);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'front.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(apiMock.progressPhotos.uploadImage).toHaveBeenCalled());
    await waitFor(() =>
      expect(apiMock.progressPhotos.setDayPhoto).toHaveBeenCalledWith('test-token', 'day-1', {
        pose: 'front',
        key: KEY(7),
      }),
    );
  });

  it('locks capture on past days (R4/R17)', async () => {
    const pastDay = makeDay({ id: 'past', date: '2000-01-01' });
    apiMock.days.list.mockResolvedValue({ days: [pastDay] });
    apiMock.days.get.mockResolvedValue(pastDay);
    renderApp('/track/day/past');

    // Day loaded, but no capture controls on a past day.
    await waitFor(() => expect(screen.getByText(/Meals/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Camera' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument();
  });
});
