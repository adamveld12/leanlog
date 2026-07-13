import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ProgressComparisonCard,
  type ProgressPosePanel,
} from '../organisms/ProgressComparisonCard';

const SRC = 'data:image/svg+xml;utf8,<svg/>';

const compared: ProgressPosePanel = {
  pose: 'front',
  poseLabel: 'Front',
  state: 'compared',
  emptyPrompt: 'Log a front photo.',
  headline: { elapsed: '11 weeks', weightDelta: '-8 lb', vTaperDelta: '+0.09' },
  baseline: {
    src: SRC,
    alt: 'Front baseline',
    caption: 'Baseline · Apr 9',
    weight: '207 lb',
    vTaper: '1.52',
  },
  latest: {
    src: SRC,
    alt: 'Front latest',
    caption: 'Latest · Jun 25',
    weight: '199 lb',
    vTaper: '1.61',
  },
  baselineOptions: [
    { value: '2026-04-09', label: 'Apr 9' },
    { value: '2026-05-21', label: 'May 21' },
  ],
  selectedBaseline: null,
  onPickBaseline: vi.fn(),
};

describe('ProgressComparisonCard', () => {
  it('headlines elapsed time, weight delta, and v-taper delta with absolute stats', () => {
    render(<ProgressComparisonCard panels={[compared]} />);
    expect(screen.getByText('11 weeks')).toBeInTheDocument();
    expect(screen.getByText('-8 lb')).toBeInTheDocument();
    expect(screen.getByText('v-taper +0.09')).toBeInTheDocument();
    // Absolute stats under each photo.
    expect(screen.getByText('207 lb · v-taper 1.52')).toBeInTheDocument();
    expect(screen.getByText('199 lb · v-taper 1.61')).toBeInTheDocument();
    // Both photos rendered.
    expect(screen.getByAltText('Front baseline')).toBeInTheDocument();
    expect(screen.getByAltText('Front latest')).toBeInTheDocument();
  });

  it('omits a missing v-taper delta rather than showing zero (R11)', () => {
    const panel: ProgressPosePanel = {
      ...compared,
      headline: { elapsed: '4 weeks', weightDelta: '-3 lb', vTaperDelta: null },
      latest: { ...compared.latest!, vTaper: null },
    };
    render(<ProgressComparisonCard panels={[panel]} />);
    expect(screen.getByText('-3 lb')).toBeInTheDocument();
    expect(screen.queryByText(/v-taper \+/)).not.toBeInTheDocument();
    // Latest stat line shows weight only, no v-taper.
    expect(screen.getByText('199 lb')).toBeInTheDocument();
  });

  it('shows an empty prompt and no deltas for a pose with no photos (R16)', () => {
    const panel: ProgressPosePanel = {
      pose: 'back',
      poseLabel: 'Back',
      state: 'empty',
      emptyPrompt: 'Log a back photo to start tracking.',
    };
    render(<ProgressComparisonCard panels={[panel]} />);
    expect(screen.getByText('Log a back photo to start tracking.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows a single photo without a zero-change delta (R16)', () => {
    const panel: ProgressPosePanel = {
      pose: 'side',
      poseLabel: 'Side',
      state: 'single',
      emptyPrompt: 'Log a side photo.',
      latest: { src: SRC, alt: 'Side latest', caption: 'Jun 25', weight: '199 lb' },
    };
    render(<ProgressComparisonCard panels={[panel]} />);
    expect(screen.getByText('Log another side photo to see your change.')).toBeInTheDocument();
    expect(screen.queryByText(/weeks|lb \/|±/)).not.toBeInTheDocument();
    // No baseline picker with a single photo.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('re-picks the baseline through the selector (R15)', async () => {
    const onPickBaseline = vi.fn();
    render(<ProgressComparisonCard panels={[{ ...compared, onPickBaseline }]} />);
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '2026-05-21');
    expect(onPickBaseline).toHaveBeenCalledWith('2026-05-21');
  });

  it('resets the baseline to earliest with the default option', async () => {
    const onPickBaseline = vi.fn();
    render(
      <ProgressComparisonCard
        panels={[{ ...compared, selectedBaseline: '2026-05-21', onPickBaseline }]}
      />,
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Earliest (default)');
    expect(onPickBaseline).toHaveBeenCalledWith(null);
  });
});
