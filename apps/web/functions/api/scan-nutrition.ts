import { resolveScan, resolveScannedMicronutrients, type ScanMode } from '@leanlog/data-access';
import { extractNutritionLabel } from '@leanlog/nutrition-scan';
import type { Env } from './_env';
import { captureAiGeneration } from './_posthog';

const mb15 = 15 * 1024 * 1024;

// Production model id. The shared extraction module is model-parameterized; this is the
// single place the endpoint pins its model, and the PostHog event derives its name from it.
const MODEL = 'gemini-2.5-flash';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, unknown>).userId as string;
  const start = Date.now();
  try {
    const { env, request } = context;

    if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response('Missing GOOGLE_GENERATIVE_AI_API_KEY', { status: 500 });
    }

    const form = await request.formData();
    const photo = form.get('photo') as unknown as File | null;
    const weightRaw = String(form.get('weightGrams') ?? '').trim();
    const servingsRaw = String(form.get('servings') ?? '').trim();
    const mode: ScanMode = form.get('mode') === 'servings' ? 'servings' : 'weight';
    const entirePackage = String(form.get('entirePackage') ?? '') === 'true';
    const name = String(form.get('name') ?? '').trim();
    // Database-tab scans set strict=true so the label candidate isn't save-ready
    // unless calories, serving size, and servings-per-package are all present.
    const strict = String(form.get('strict') ?? '') === 'true';

    if (!photo || typeof photo === 'string') {
      return new Response('Missing photo', { status: 400 });
    }
    if (!photo.type.startsWith('image/')) {
      return new Response('Invalid file type', { status: 400 });
    }
    if (photo.size > mb15) {
      return new Response('File too large (max 15MB)', { status: 413 });
    }

    const weight = Number(weightRaw);
    const servings = Number(servingsRaw);

    const image = new Uint8Array(await photo.arrayBuffer());

    const { object, usage } = await extractNutritionLabel({
      image,
      mediaType: photo.type,
      apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: MODEL,
    });

    const resolution = resolveScan(
      {
        basis: object.basis,
        servingSizeGrams: object.servingSizeGrams,
        servingsPerContainer: object.servingsPerContainer,
        nutrients: {
          ...object.nutrients,
          sugar: object.nutrients.sugar,
          addedSugars: object.nutrients.addedSugars,
        },
        // Prefer a measured amount; back-compute from %DV otherwise (drops zeros
        // and unknown nutrients without a measurement).
        micronutrients: resolveScannedMicronutrients(object.micronutrients),
        servingSizeText: object.servingSizeText,
        servingSizeUnit: object.servingSizeUnit,
        inferredName: object.inferredName,
      },
      { mode, weight, servings, entirePackage, name, strict },
    );

    const response = {
      ...resolution,
      notes: [...object.notes, ...resolution.notes],
    };

    if (env.VITE_POSTHOG_API_KEY && env.VITE_POSTHOG_HOST) {
      context.waitUntil(
        captureAiGeneration(env.VITE_POSTHOG_API_KEY, env.VITE_POSTHOG_HOST, {
          distinctId: userId,
          model: MODEL,
          provider: 'google',
          latencyMs: Date.now() - start,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          endpoint: 'scan-nutrition',
        }),
      );
    }

    return Response.json(response);
  } catch (error) {
    if (context.env.VITE_POSTHOG_API_KEY && context.env.VITE_POSTHOG_HOST) {
      context.waitUntil(
        captureAiGeneration(context.env.VITE_POSTHOG_API_KEY, context.env.VITE_POSTHOG_HOST, {
          distinctId: userId,
          model: MODEL,
          provider: 'google',
          latencyMs: Date.now() - start,
          isError: true,
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: 'scan-nutrition',
        }),
      );
    }
    return new Response(error instanceof Error ? error.message : 'Scan failed', {
      status: 500,
    });
  }
};
