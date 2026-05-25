import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

interface Env {
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

const mb15 = 15 * 1024 * 1024;

const scanSchema = z.object({
  basis: z.enum(['per_serving', 'per_100g', 'unknown']),
  servingSizeGrams: z.number().nullable(),
  nutrients: z.object({
    calories: z.number(),
    fat: z.number(),
    saturatedFat: z.number(),
    carbs: z.number(),
    fiber: z.number(),
    protein: z.number(),
  }),
  inferredName: z.string().nullable(),
  notes: z.array(z.string()).default([]),
});

const round1 = (n: number) => Math.round(n * 10) / 10;
const safe = (n: number) => round1(Math.max(0, n));

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { env, request } = context;

    if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response('Missing GOOGLE_GENERATIVE_AI_API_KEY', { status: 500 });
    }

    const form = await request.formData();
    const photo = form.get('photo') as unknown as File | null;
    const weightRaw = String(form.get('weightGrams') ?? '').trim();
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
    const hasWeight = Number.isFinite(weight) && weight > 0;

    const image = new Uint8Array(await photo.arrayBuffer());
    const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });

    const prompt = [
      'Read this nutrition label from an image.',
      'Return nutrition values in grams/calories and infer the basis.',
      'basis=per_serving if values represent one serving; per_100g if values are per 100g; unknown otherwise.',
      'Extract servingSizeGrams if explicitly shown.',
      'If a field is missing, return 0 and add a note.',
      'Keep numbers realistic and non-negative.',
    ].join(' ');

    const { object } = await generateObject({
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

    const notes = [...object.notes];
    const serving = object.servingSizeGrams;
    let targetWeight = hasWeight ? weight : 0;

    if (!hasWeight && object.basis === 'per_serving' && serving && serving > 0) {
      targetWeight = serving;
    }

    let factor = 1;
    if (hasWeight) {
      if (object.basis === 'per_serving') {
        if (serving && serving > 0) factor = weight / serving;
        else notes.push('Serving size unreadable. Using one-serving values without scaling.');
      } else if (object.basis === 'per_100g') {
        factor = weight / 100;
      }
    } else if (object.basis === 'per_100g') {
      notes.push('Serving size unreadable for per-100g label without weight.');
    }

    const canApply = hasWeight || (object.basis === 'per_serving' && !!serving && serving > 0);
    const blockReason = canApply
      ? undefined
      : 'Serving size unreadable. Retake photo or enter weight first.';

    const response = {
      proposed: {
        name: !name && object.inferredName ? object.inferredName : undefined,
        weight: safe(targetWeight),
        calories: safe(object.nutrients.calories * factor),
        fat: safe(object.nutrients.fat * factor),
        saturatedFat: safe(object.nutrients.saturatedFat * factor),
        carbs: safe(object.nutrients.carbs * factor),
        fiber: safe(object.nutrients.fiber * factor),
        protein: safe(object.nutrients.protein * factor),
      },
      canApply,
      blockReason,
      notes,
    };

    return Response.json(response);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Scan failed', {
      status: 500,
    });
  }
};
