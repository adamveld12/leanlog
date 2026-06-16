import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { SCAN_PROMPT } from './prompt';
import { scanSchema, type ScanResult } from './schema';

export type ExtractNutritionLabelArgs = {
  /** Raw image bytes of the nutrition label. */
  image: Uint8Array;
  /** The image MIME type, e.g. "image/jpeg". */
  mediaType: string;
  /** Google Generative AI API key. */
  apiKey: string;
  /** The model id to run, e.g. "gemini-2.5-flash". Parameterized so callers (endpoint
   *  vs eval) can swap models without copying the prompt or schema. */
  model: string;
};

export type ExtractNutritionLabelResult = {
  object: ScanResult;
  usage: Awaited<ReturnType<typeof generateObject>>['usage'];
};

// The one extraction call shared by the scan endpoint and the eval harness. Keeps the
// prompt + schema + model invocation in a single place so they cannot drift apart.
export async function extractNutritionLabel({
  image,
  mediaType,
  apiKey,
  model,
}: ExtractNutritionLabelArgs): Promise<ExtractNutritionLabelResult> {
  const google = createGoogleGenerativeAI({ apiKey });

  const { object, usage } = await generateObject({
    model: google(model),
    schema: scanSchema,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SCAN_PROMPT },
          { type: 'image', image, mediaType },
        ],
      },
    ],
  });

  return { object, usage };
}
