// The model comparison set. Adding a model to the eval is a single entry here — no
// harness code change (R7). `label` tags the column in the report.
//
// Costs are USD per 1M tokens, used only to estimate per-run cost in the report.
// Hand-maintained — verify against current Google pricing if the numbers matter.
export type EvalModel = {
  id: string;
  label: string;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
};

export const MODELS: EvalModel[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'baseline',
    inputCostPerMTok: 0.3,
    outputCostPerMTok: 2.5,
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'candidate',
    inputCostPerMTok: 0.1,
    outputCostPerMTok: 0.4,
  },
];

export function estimateCost(model: EvalModel, inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * model.inputCostPerMTok +
    (outputTokens / 1_000_000) * model.outputCostPerMTok
  );
}
