import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractNutritionLabel } from '@leanlog/nutrition-scan';
import { describe, expect, it } from 'vitest';
import { loadFixtures, readImageBytes } from './fixtures';
import { estimateCost, MODELS } from './models';
import { renderReport, type ModelRunResult } from './report';
import { scoreCase } from './scoring';

const here = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_ROOT = join(here, '..', 'fixtures');
const REPORT_PATH = join(here, '..', 'eval-report.md');

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Only this suite makes real model calls (R9); skipped without an API key so a keyless
// `test:evals` run is a no-op rather than a failure.
describe.skipIf(!apiKey)('nutrition scan eval harness', () => {
  it('runs every fixture against every model and writes the comparison report', async () => {
    const fixtures = loadFixtures(FIXTURES_ROOT);
    const results: ModelRunResult[] = [];

    for (const model of MODELS) {
      const result: ModelRunResult = {
        modelId: model.id,
        label: model.label,
        caseScores: [],
        cost: 0,
        totalLatencyMs: 0,
        runs: 0,
        inputTokens: 0,
        outputTokens: 0,
        errors: [],
      };

      for (const fixture of fixtures) {
        const start = Date.now();
        try {
          const { object, usage } = await extractNutritionLabel({
            image: readImageBytes(fixture),
            mediaType: fixture.mediaType,
            apiKey: apiKey!,
            model: model.id,
          });
          const inputTokens = usage.inputTokens ?? 0;
          const outputTokens = usage.outputTokens ?? 0;
          result.totalLatencyMs += Date.now() - start;
          result.runs += 1;
          result.inputTokens += inputTokens;
          result.outputTokens += outputTokens;
          result.cost += estimateCost(model, inputTokens, outputTokens);
          result.caseScores.push({
            fixture: fixture.name,
            score: scoreCase(fixture.expected, object),
          });
        } catch (error) {
          result.errors.push({
            fixture: fixture.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      results.push(result);
    }

    const report = renderReport(results, fixtures.length);
    writeFileSync(REPORT_PATH, report);
    // eslint-disable-next-line no-console
    console.log(`\n${report}`);
    expect(report).toContain('Nutrition Scan Eval');
  });
});
