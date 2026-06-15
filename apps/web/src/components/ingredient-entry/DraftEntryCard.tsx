import { IngredientEntryCard } from '@leanlog/ui';
import { estimateCalories } from '@leanlog/data-access';
import { normalizeIngredientName } from '../../lib';
import type { IngredientDraft } from './types';

export type DraftEntryCardProps = {
  draft: IngredientDraft;
  editingId: string | null;
  onChange: (draft: IngredientDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function DraftEntryCard({
  draft,
  editingId,
  onChange,
  onSubmit,
  onCancel,
}: DraftEntryCardProps) {
  return (
    <IngredientEntryCard
      value={draft}
      estimatedCalories={estimateCalories({
        fat: draft.fat ?? 0,
        carbs: draft.carbs ?? 0,
        protein: draft.protein ?? 0,
        fiber: draft.fiber,
        sugarAlcohol: draft.sugarAlcohol,
        allulose: draft.allulose,
        alcohol: draft.alcohol,
      })}
      submitLabel={editingId ? 'Update' : 'Add'}
      onChange={onChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      normalizeNameOnBlur={normalizeIngredientName}
    />
  );
}
