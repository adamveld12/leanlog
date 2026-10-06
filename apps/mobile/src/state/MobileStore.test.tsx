import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, Pressable, Text } from 'react-native';
import { saveBodyFatResult } from '../db/repos/body';
import { ensureSeeded } from '../db/repos/base';
import { setWeight } from '../db/repos/days';
import { createTestDb } from '../test/db';
import type { Db } from '../db/types';
import { MobileStoreProvider, useMobileStore } from './MobileStore';
import { selectDayView } from './selectors';

const YESTERDAY = '2026-10-05';
const TODAY = '2026-10-06';
const TOMORROW = '2026-10-07';

// Test harness: shows today's and yesterday's view and exposes a few actions.
function Probe() {
  const { state, actions } = useMobileStore();
  if (state.status !== 'ready') return <Text>loading</Text>;
  const { data, today } = state;
  const now = selectDayView(data, today, today);
  const prev = selectDayView(data, YESTERDAY, today);
  return (
    <>
      <Text testID="today">{today}</Text>
      <Text testID="today-kcal">{String(now.targets?.calories)}</Text>
      <Text testID="yesterday-kcal">{String(prev.targets?.calories)}</Text>
      <Text testID="oct6-editable">{String(selectDayView(data, TODAY, today).editable)}</Text>
      <Pressable onPress={() => actions.updateProfile({ activityLevel: 'moderate' })}>
        <Text>set moderate</Text>
      </Pressable>
      <Pressable onPress={() => actions.logWeight(170)}>
        <Text>log 170</Text>
      </Pressable>
    </>
  );
}

let appStateListener: ((s: string) => void) | undefined;

beforeEach(() => {
  appStateListener = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, l: never) => {
    appStateListener = l;
    return { remove: jest.fn() };
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

// Yesterday ended at 1869 kcal: 180 lb at 15% body fat, no activity.
async function dbWithFrozenYesterday(): Promise<Db> {
  const db = createTestDb();
  await ensureSeeded(db);
  await setWeight(db, YESTERDAY, YESTERDAY, { weightLbs: 180, source: 'manual', at: 'a' });
  await saveBodyFatResult(db, YESTERDAY, { method: 'navy', pct: 15, inputs: {} });
  return db;
}

describe('MobileStore', () => {
  it('AE8: changing activity today re-derives today and leaves yesterday at 1869', async () => {
    const db = await dbWithFrozenYesterday();
    await render(
      <MobileStoreProvider db={db} clock={() => new Date(2026, 9, 6, 9, 0)}>
        <Probe />
      </MobileStoreProvider>,
    );
    expect((await screen.findByTestId('today-kcal')).props.children).toBe('1869');
    await fireEvent.press(screen.getByText('set moderate'));
    expect(await screen.findByText('2897')).toBeTruthy();
    expect(screen.getByTestId('yesterday-kcal').props.children).toBe('1869');
  });

  it('logging a weight re-derives today from the new weight', async () => {
    const db = await dbWithFrozenYesterday();
    await render(
      <MobileStoreProvider db={db} clock={() => new Date(2026, 9, 6, 9, 0)}>
        <Probe />
      </MobileStoreProvider>,
    );
    await fireEvent.press(await screen.findByText('log 170'));
    // 170 lb at 15% → LBM 65.55 kg → BMR 1786.
    expect(await screen.findByText('1786')).toBeTruthy();
    expect(screen.getByTestId('yesterday-kcal').props.children).toBe('1869');
  });

  it('rolls over at local midnight: the old today becomes read-only', async () => {
    const db = await dbWithFrozenYesterday();
    let now = new Date(2026, 9, 6, 23, 50);
    await render(
      <MobileStoreProvider db={db} clock={() => now}>
        <Probe />
      </MobileStoreProvider>,
    );
    expect((await screen.findByTestId('today')).props.children).toBe(TODAY);
    expect(screen.getByTestId('oct6-editable').props.children).toBe('true');

    now = new Date(2026, 9, 7, 0, 5);
    await act(async () => appStateListener?.('active'));

    expect((await screen.findByText(TOMORROW)).props.children).toBe(TOMORROW);
    // Oct 6 is now a past day: read-only, and its targets stay as they were.
    expect(screen.getByTestId('oct6-editable').props.children).toBe('false');
  });
});
