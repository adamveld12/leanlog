import { describe, expect, it } from 'vitest';
import type { CaseScore } from './scoring';
import {
  aggregateFieldRates,
  micronutrientCoverage,
  micronutrientFieldRate,
  renderReport,
  type ModelRunResult,
} from './report';

function run(label: string, overrides: Partial<ModelRunResult> = {}): ModelRunResult {
  return {
    modelId: `gemini-${label}`,
    label,
    caseScores: [],
    cost: 0,
    totalLatencyMs: 0,
    runs: 0,
    inputTokens: 0,
    outputTokens: 0,
    errors: [],
    ...overrides,
  };
}

function caseScore(
  fields: { field: string; pass: boolean }[],
  micro?: Partial<CaseScore['micronutrients']>,
): CaseScore {
  return {
    fields: fields.map((f) => ({ ...f, expected: null, actual: null })),
    micronutrients: { matched: [], missing: [], extra: [], ...micro },
  };
}

describe('aggregateFieldRates', () => {
  it('counts pass/total per field across cases', () => {
    const r = run('flash', {
      caseScores: [
        { fixture: 'a', score: caseScore([{ field: 'protein', pass: true }]) },
        { fixture: 'b', score: caseScore([{ field: 'protein', pass: false }]) },
      ],
    });
    expect(aggregateFieldRates(r).get('protein')).toEqual({ pass: 1, total: 2 });
  });
});

describe('micronutrientCoverage', () => {
  it('is matched / (matched + missing)', () => {
    const r = run('flash', {
      caseScores: [
        {
          fixture: 'a',
          score: caseScore([], {
            matched: [{ name: 'Sodium', amount: 'pass', unit: 'pass', dv: 'pass' }],
            missing: ['Potassium'],
          }),
        },
      ],
    });
    expect(micronutrientCoverage(r)).toEqual({ pass: 1, total: 2 });
  });
});

describe('micronutrientFieldRate', () => {
  it('scores a sub-field over asserted entries only, ignoring unscored', () => {
    const r = run('flash', {
      caseScores: [
        {
          fixture: 'a',
          score: caseScore([], {
            matched: [
              { name: 'Sodium', amount: 'pass', unit: 'pass', dv: 'pass' },
              // found by name but wrong amount — regresses the amount row, not coverage
              { name: 'Calcium', amount: 'fail', unit: 'pass', dv: 'unscored' },
            ],
          }),
        },
      ],
    });
    // coverage stays 100% (both names found); amount accuracy is 1/2
    expect(micronutrientCoverage(r)).toEqual({ pass: 2, total: 2 });
    expect(micronutrientFieldRate(r, 'amount')).toEqual({ pass: 1, total: 2 });
    // %DV: Sodium passed, Calcium was unscored → only 1 counts
    expect(micronutrientFieldRate(r, 'dv')).toEqual({ pass: 1, total: 1 });
  });
});

describe('renderReport', () => {
  it('renders an empty-fixture notice', () => {
    const md = renderReport([run('flash')], 0);
    expect(md).toContain('No fixtures');
  });

  it('renders a side-by-side table with a delta column and misses', () => {
    const baseline = run('flash', {
      label: 'baseline',
      caseScores: [{ fixture: 'a', score: caseScore([{ field: 'basis', pass: true }]) }],
      cost: 0.014,
      totalLatencyMs: 2100,
      runs: 1,
    });
    const candidate = run('flash-lite', {
      label: 'candidate',
      caseScores: [{ fixture: 'a', score: caseScore([{ field: 'basis', pass: false }]) }],
      cost: 0.006,
      totalLatencyMs: 1300,
      runs: 1,
    });
    const md = renderReport([baseline, candidate], 1);
    expect(md).toContain('Nutrition Scan Eval — 1 fixture');
    expect(md).toContain('gemini-flash (baseline)');
    expect(md).toContain('gemini-flash-lite (candidate)');
    expect(md).toContain('| basis |');
    expect(md).toContain('Δ');
    expect(md).toContain('-100%'); // basis regressed from 100% to 0%
    expect(md).toContain('Total cost');
    expect(md).toContain('Misses — gemini-flash-lite (candidate)');
  });

  it('surfaces matched-but-wrong micronutrients in misses and per-sub-field rows', () => {
    const candidate = run('flash-lite', {
      label: 'candidate',
      caseScores: [
        {
          fixture: '001-avocado-oil',
          score: caseScore([], {
            // found by name (coverage 100%) but wrong amount + unit (sub-field rows fail)
            matched: [{ name: 'Sodium', amount: 'fail', unit: 'fail', dv: 'pass' }],
          }),
        },
      ],
      runs: 1,
    });
    const md = renderReport([candidate], 1);
    expect(md).toContain('micronutrient amount');
    expect(md).toContain('micronutrient unit');
    expect(md).toContain('micronutrient %DV');
    expect(md).toContain('wrong micros: Sodium (amount, unit)');
  });
});
