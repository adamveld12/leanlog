import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { resolveScan, type ScanMode } from '@leanlog/data-access';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Env } from './_env';
import { captureAiGeneration } from './_posthog';

const mb15 = 15 * 1024 * 1024;

const scanSchema = z.object({
  basis: z.enum(['per_serving', 'per_100g', 'unknown']),
  servingSizeGrams: z.number().finite().nonnegative().nullable(),
  servingsPerContainer: z.number().finite().nonnegative().nullable(),
  nutrients: z.object({
    calories: z.number().finite().nonnegative(),
    fat: z.number().finite().nonnegative(),
    saturatedFat: z.number().finite().nonnegative(),
    carbs: z.number().finite().nonnegative(),
    fiber: z.number().finite().nonnegative(),
    protein: z.number().finite().nonnegative(),
    sugar: z.number().finite().nonnegative().optional(),
  }),
  inferredName: z.string().nullable(),
  notes: z.array(z.string()).default([]),
});

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
    const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });

    const prompt = [
      'Read this nutrition label from an image.',
      'Return nutrition values in grams/calories and infer the basis.',
      'basis=per_serving if values represent one serving; per_100g if values are per 100g; unknown otherwise.',
      'Extract servingSizeGrams if explicitly shown.',
      'Extract servingsPerContainer (servings per package/container) if explicitly shown, otherwise null.',
      'Extract sugar from the label if shown; omit the field if not present.',
      'If a required field is missing, return 0 and add a note.',
      'Keep numbers realistic and non-negative.',
    ].join(' ');

    const { object, usage } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: scanSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image, mediaType: photo.type },
          ],
        },
      ],
    });

    const resolution = resolveScan(
      {
        basis: object.basis,
        servingSizeGrams: object.servingSizeGrams,
        servingsPerContainer: object.servingsPerContainer,
        nutrients: {
          ...object.nutrients,
          sugar: object.nutrients.sugar,
        },
        inferredName: object.inferredName,
      },
      { mode, weight, servings, entirePackage, name },
    );

    const response = {
      ...resolution,
      notes: [...object.notes, ...resolution.notes],
    };

    if (env.VITE_POSTHOG_API_KEY && env.VITE_POSTHOG_HOST) {
      context.waitUntil(
        captureAiGeneration(env.VITE_POSTHOG_API_KEY, env.VITE_POSTHOG_HOST, {
          distinctId: userId,
          model: 'gemini-2.5-flash',
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
          model: 'gemini-2.5-flash',
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
