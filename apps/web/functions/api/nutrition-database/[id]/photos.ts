import { createNutritionDatabaseRepository } from '@leanlog/data-d1';
import { NutritionLabelOwnershipError } from '@leanlog/data-access';
import type { Env } from '../../_env';
import { deleteImages, isValidImageKey } from '../_images';

// PATCH /api/nutrition-database/:id/photos
//
// Sets, replaces, or clears the entry's two photo slots (#54). Body fields are
// optional with three-way semantics: omitted = leave unchanged, string key =
// set, null = clear. Object keys must already exist in R2 (uploaded via POST
// /images). Only the entry's creator may change photos (R13); any object the
// entry no longer references and that no other entry uses is removed (R9).
type PhotosBody = {
  productPhotoKey?: string | null;
  labelPhotoKey?: string | null;
};

type SlotResult = { ok: true; value: string | null | undefined } | { ok: false };

function parseSlot(value: unknown): SlotResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value === 'string' && isValidImageKey(value)) return { ok: true, value };
  return { ok: false };
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { id } = context.params as { id: string };

  let body: PhotosBody;
  try {
    body = (await context.request.json()) as PhotosBody;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const product = parseSlot(body.productPhotoKey);
  const label = parseSlot(body.labelPhotoKey);
  if (!product.ok) return new Response('Invalid productPhotoKey', { status: 400 });
  if (!label.ok) return new Response('Invalid labelPhotoKey', { status: 400 });
  if (product.value === undefined && label.value === undefined) {
    return new Response('No photo changes provided', { status: 400 });
  }

  const repo = createNutritionDatabaseRepository(context.env.DB);
  try {
    const result = await repo.setPhotos(userId, id, {
      productPhotoKey: product.value,
      labelPhotoKey: label.value,
    });
    if (!result) return new Response('Not found', { status: 404 });
    // Release object(s) the entry dropped and no other entry references (R9).
    await deleteImages(context.env.IMAGES, result.orphanedKeys);
    return Response.json(result.label);
  } catch (err) {
    if (err instanceof NutritionLabelOwnershipError) {
      return new Response(err.message, { status: 403 });
    }
    throw err;
  }
};
