import { NutritionDatabaseEntryCard, type NutritionDatabaseEntryValue } from '@leanlog/ui';
import {
  estimateCalories,
  type CreateNutritionDatabaseIngredient,
  type NutritionUnit,
} from '@leanlog/data-access';
import { EntryPhotoEditor, type EntryPhotoSlot } from './EntryPhotoEditor';

export type DatabaseLabelFormProps = {
  value: NutritionDatabaseEntryValue;
  submitting: boolean;
  /** Whether the form was populated by a scan or typed manually. */
  source: 'manual' | 'scan';
  onChange: (value: NutritionDatabaseEntryValue) => void;
  onPublish: (payload: CreateNutritionDatabaseIngredient) => void;
  /** Submit button label; "Publish" (create) or "Save" (edit). */
  submitLabel?: string;
  /** Surfaced photo upload error. */
  photoError?: string | null;
  onPhotoError?: (message: string) => void;
  // When provided (edit mode), a photo slot change persists immediately via this
  // handler instead of being staged into the create payload (#54). Macro Save is
  // separate and preserves photos, so existing entries persist photos on capture.
  onPhotoChange?: (slot: EntryPhotoSlot, key: string | null) => void;
  /** Disables the photo controls (e.g. while a photo PATCH is in flight). */
  photosBusy?: boolean;
  // Forwarded to EntryPhotoEditor: bump to trigger the guided skippable
  // front-photo capture after a label scan (#54, Q4).
  guidedFrontPromptSignal?: number;
};

// The Nutrition Facts label create form: wraps the card, computes the calorie
// estimate, and builds the strict create payload (resolving an empty calories to
// the estimate and dropping unnamed micronutrient rows) for the caller to save.
export function DatabaseLabelForm({
  value,
  submitting,
  source,
  onChange,
  onPublish,
  submitLabel,
  photoError,
  onPhotoError,
  onPhotoChange,
  photosBusy,
  guidedFrontPromptSignal,
}: DatabaseLabelFormProps) {
  const estimatedCalories = estimateCalories({
    fat: value.fat ?? 0,
    carbs: value.carbs ?? 0,
    protein: value.protein ?? 0,
    fiber: value.fiber ?? null,
    sugarAlcohol: value.sugarAlcohol ?? null,
    allulose: value.allulose ?? null,
    alcohol: value.alcohol ?? null,
  });

  const setPhoto = (slot: EntryPhotoSlot, key: string | null) => {
    // Edit mode persists immediately; create mode stages into the form value
    // until publish.
    if (onPhotoChange) {
      onPhotoChange(slot, key);
      return;
    }
    onChange({
      ...value,
      [slot === 'product' ? 'productPhotoKey' : 'labelPhotoKey']: key,
    });
  };

  return (
    <NutritionDatabaseEntryCard
      value={value}
      estimatedCalories={estimatedCalories}
      submitting={submitting}
      submitLabel={submitLabel}
      onChange={onChange}
      photosSlot={
        <EntryPhotoEditor
          productPhotoKey={value.productPhotoKey ?? null}
          labelPhotoKey={value.labelPhotoKey ?? null}
          onChange={setPhoto}
          disabled={submitting || photosBusy}
          error={photoError}
          onError={onPhotoError}
          guidedFrontPromptSignal={guidedFrontPromptSignal}
        />
      }
      onSubmit={() => {
        // The card disables Publish until these are filled; this guard narrows the
        // nullable draft for the strict schema (calories may be estimated).
        if (
          value.servingAmount == null ||
          value.servingsPerPackage == null ||
          value.fat == null ||
          value.carbs == null ||
          value.protein == null
        )
          return;
        onPublish({
          ...value,
          servingAmount: value.servingAmount,
          servingSizeUnit: value.servingSizeUnit === 'milliliter' ? 'milliliter' : 'gram',
          servingSizeDisplayText: value.servingSizeDisplayText ?? undefined,
          servingsPerPackage: value.servingsPerPackage,
          fat: value.fat,
          carbs: value.carbs,
          protein: value.protein,
          calories: value.calories ?? estimatedCalories,
          micronutrients: value.micronutrients?.reduce<
            { name: string; amount: number; unit: NutritionUnit }[]
          >((acc, m) => {
            if (m.name.trim().length > 0) {
              acc.push({
                name: m.name,
                amount: m.amount ?? 0,
                unit: (m.unit ?? 'milligram') as NutritionUnit,
              });
            }
            return acc;
          }, []),
          creationSource: source,
        });
      }}
    />
  );
}
