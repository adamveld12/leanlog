import type { CaseScore } from './scoring';

export type ModelRunResult = {
  modelId: string;
  label: string;
  caseScores: { fixture: string; score: CaseScore }[];
  cost: number;
  totalLatencyMs: number;
  runs: number;
  inputTokens: number;
  outputTokens: number;
  errors: { fixture: string; error: string }[];
};

type Rate = { pass: number; total: number };

function pct(rate: Rate): string {
  if (rate.total === 0) return '—';
  return `${Math.round((rate.pass / rate.total) * 100)}%`;
}

function ratio(rate: Rate): string {
  return `${rate.pass}/${rate.total}`;
}

// Per-field pass rates for one model, in first-seen field order.
export function aggregateFieldRates(result: ModelRunResult): Map<string, Rate> {
  const rates = new Map<string, Rate>();
  for (const { score } of result.caseScores) {
    for (const f of score.fields) {
      const r = rates.get(f.field) ?? { pass: 0, total: 0 };
      r.total += 1;
      if (f.pass) r.pass += 1;
      rates.set(f.field, r);
    }
  }
  return rates;
}

// Coverage = matched names / (matched + missing) across all fixtures (R6). This is a
// name-coverage metric only — it says nothing about whether the matched values are right.
export function micronutrientCoverage(result: ModelRunResult): Rate {
  let pass = 0;
  let total = 0;
  for (const { score } of result.caseScores) {
    pass += score.micronutrients.matched.length;
    total += score.micronutrients.matched.length + score.micronutrients.missing.length;
  }
  return { pass, total };
}

// Accuracy = matched entries whose amount AND unit AND %DV all pass / matched entries.
// Complements coverage: a model can find "Sodium" (coverage) yet report the wrong amount
// (accuracy), and without this a value regression on a matched micronutrient is invisible.
export function micronutrientAccuracy(result: ModelRunResult): Rate {
  let pass = 0;
  let total = 0;
  for (const { score } of result.caseScores) {
    for (const m of score.micronutrients.matched) {
      total += 1;
      if (m.amountPass && m.unitPass && m.dvPass) pass += 1;
    }
  }
  return { pass, total };
}

// Names the failing sub-fields of a matched-but-wrong micronutrient, e.g. "Sodium (amount, unit)".
function wrongMicronutrients(score: ModelRunResult['caseScores'][number]['score']): string[] {
  return score.micronutrients.matched
    .filter((m) => !m.amountPass || !m.unitPass || !m.dvPass)
    .map((m) => {
      const bad: string[] = [];
      if (!m.amountPass) bad.push('amount');
      if (!m.unitPass) bad.push('unit');
      if (!m.dvPass) bad.push('%DV');
      return `${m.name} (${bad.join(', ')})`;
    });
}

function deltaPct(baseline: Rate, candidate: Rate): string {
  if (baseline.total === 0 || candidate.total === 0) return '—';
  const d = Math.round((candidate.pass / candidate.total - baseline.pass / baseline.total) * 100);
  return `${d > 0 ? '+' : ''}${d}%`;
}

function avgLatencySeconds(r: ModelRunResult): string {
  if (r.runs === 0) return '—';
  return `${(r.totalLatencyMs / r.runs / 1000).toFixed(1)}s`;
}

// Side-by-side per-field markdown report (R8). Baseline is the first model; the final
// Δ column compares the last model against the baseline.
export function renderReport(results: ModelRunResult[], fixtureCount: number): string {
  if (results.length === 0) {
    return '## Nutrition Scan Eval\n\nNo models configured.\n';
  }

  const lines: string[] = [];
  lines.push(`## Nutrition Scan Eval — ${fixtureCount} fixture${fixtureCount === 1 ? '' : 's'}`);
  lines.push('');

  if (fixtureCount === 0) {
    lines.push(
      '_No fixtures with both an image and `expected.json` were found. See the package README for how to add one._',
    );
    lines.push('');
    return lines.join('\n');
  }

  const rates = results.map(aggregateFieldRates);
  const baseline = results[0];
  const candidate = results[results.length - 1];
  const hasDelta = results.length > 1;

  // Ordered union of field names (baseline first).
  const fieldOrder: string[] = [];
  for (const r of rates) {
    for (const field of r.keys()) if (!fieldOrder.includes(field)) fieldOrder.push(field);
  }

  const header = ['Field', ...results.map((r) => `${r.modelId} (${r.label})`)];
  if (hasDelta) header.push('Δ');
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`| ${header.map(() => '---').join(' | ')} |`);

  for (const field of fieldOrder) {
    const cells = rates.map((r) => {
      const rate = r.get(field);
      return rate ? `${ratio(rate)} (${pct(rate)})` : '—';
    });
    const row = [field, ...cells];
    if (hasDelta) {
      row.push(
        deltaPct(
          rates[0].get(field) ?? { pass: 0, total: 0 },
          rates[rates.length - 1].get(field) ?? { pass: 0, total: 0 },
        ),
      );
    }
    lines.push(`| ${row.join(' | ')} |`);
  }

  // Micronutrient coverage (found the name?) and accuracy (got the values right?) rows.
  const covs = results.map(micronutrientCoverage);
  const covRow = ['micronutrient cov', ...covs.map((c) => `${ratio(c)} (${pct(c)})`)];
  if (hasDelta) covRow.push(deltaPct(covs[0], covs[covs.length - 1]));
  lines.push(`| ${covRow.join(' | ')} |`);

  const accs = results.map(micronutrientAccuracy);
  const accRow = ['micronutrient acc', ...accs.map((a) => `${ratio(a)} (${pct(a)})`)];
  if (hasDelta) accRow.push(deltaPct(accs[0], accs[accs.length - 1]));
  lines.push(`| ${accRow.join(' | ')} |`);

  // Summary rows.
  lines.push('');
  lines.push(`| Metric | ${results.map((r) => `${r.modelId} (${r.label})`).join(' | ')} |`);
  lines.push(`| ${['---', ...results.map(() => '---')].join(' | ')} |`);
  lines.push(`| Avg latency | ${results.map(avgLatencySeconds).join(' | ')} |`);
  lines.push(`| Total cost | ${results.map((r) => `$${r.cost.toFixed(4)}`).join(' | ')} |`);
  lines.push(
    `| Tokens (in/out) | ${results.map((r) => `${r.inputTokens} / ${r.outputTokens}`).join(' | ')} |`,
  );

  // Per-fixture misses, per model.
  for (const r of [baseline, ...(hasDelta ? [candidate] : [])]) {
    const misses: string[] = [];
    for (const { fixture, score } of r.caseScores) {
      const failed = score.fields.filter((f) => !f.pass).map((f) => f.field);
      if (score.micronutrients.missing.length > 0)
        failed.push(`missing micros: ${score.micronutrients.missing.join(', ')}`);
      const wrong = wrongMicronutrients(score);
      if (wrong.length > 0) failed.push(`wrong micros: ${wrong.join('; ')}`);
      if (failed.length > 0) misses.push(`- ${fixture}: ${failed.join('; ')}`);
    }
    for (const e of r.errors) misses.push(`- ${e.fixture}: ERROR — ${e.error}`);
    if (misses.length > 0) {
      lines.push('');
      lines.push(`### Misses — ${r.modelId} (${r.label})`);
      lines.push(...misses);
    }
  }

  lines.push('');
  return lines.join('\n');
}
