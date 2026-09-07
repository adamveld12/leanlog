import { useCallback, useState } from 'react';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ExtraDraft = {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};

export type ExtraFormValues = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ExtraQuickAddFormProps = {
  /** Present when editing an existing extra — prefills the fields and
   * auto-expands macros if any are non-zero. Omitted for a fresh add. */
  initial?: ExtraFormValues;
  submitLabel: string;
  /** Focuses the name field the instant it mounts. */
  autoFocus?: boolean;
  onSubmit: (draft: ExtraDraft) => void;
  onCancel: () => void;
};

type FieldState = {
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  macrosExpanded: boolean;
};

function initialFieldState(initial?: ExtraFormValues): FieldState {
  if (!initial) {
    return {
      name: '',
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      macrosExpanded: false,
    };
  }
  return {
    name: initial.name,
    calories: initial.calories,
    protein: initial.protein || null,
    carbs: initial.carbs || null,
    fat: initial.fat || null,
    macrosExpanded: initial.protein > 0 || initial.carbs > 0 || initial.fat > 0,
  };
}

// Name + calories are required (R2/R7); protein/carbs/fat are an optional
// expand, since Extras trade precision for speed. Shared by ExtrasCard's
// inline add/edit row and the Track quick-action's inline control so both
// stay in lockstep with a single implementation.
export function ExtraQuickAddForm({
  initial,
  submitLabel,
  autoFocus = false,
  onSubmit,
  onCancel,
}: ExtraQuickAddFormProps) {
  // `initial` seeds the form once at mount — the caller remounts this
  // component (new key, e.g. switching which item is being edited) rather
  // than flipping `initial` on an existing instance, so react-doctor's "prop
  // derived into useState" is a false positive here.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [field, setField] = useState<FieldState>(() => initialFieldState(initial));
  const nameInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && autoFocus) node.focus();
    },
    [autoFocus],
  );

  const canSubmit = field.name.trim().length > 0 && field.calories != null;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: field.name.trim(),
      calories: field.calories!,
      protein: field.protein ?? undefined,
      carbs: field.carbs ?? undefined,
      fat: field.fat ?? undefined,
    });
  };

  return (
    <div className={cn(recipes.stack.sm)}>
      <div className={cn(recipes.grid.two)}>
        <Field label="Name">
          <Input
            ref={nameInputRef}
            value={field.name}
            onChange={(e) => setField((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <NumberInput
          label="Calories"
          value={field.calories}
          onChange={(calories) => setField((f) => ({ ...f, calories }))}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setField((f) => ({ ...f, macrosExpanded: !f.macrosExpanded }))}
      >
        {field.macrosExpanded ? '- Hide macros' : '+ Add macros'}
      </Button>

      {field.macrosExpanded ? (
        <div className={cn(recipes.grid.three)}>
          <NumberInput
            label="Protein (g)"
            value={field.protein}
            onChange={(protein) => setField((f) => ({ ...f, protein }))}
          />
          <NumberInput
            label="Carbs (g)"
            value={field.carbs}
            onChange={(carbs) => setField((f) => ({ ...f, carbs }))}
          />
          <NumberInput
            label="Fat (g)"
            value={field.fat}
            onChange={(fat) => setField((f) => ({ ...f, fat }))}
          />
        </div>
      ) : null}

      <div className={cn(recipes.stack.row)}>
        <Button className="flex-1" disabled={!canSubmit} onClick={submit}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
