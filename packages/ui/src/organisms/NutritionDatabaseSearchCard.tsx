import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { NumberInput } from '../atoms/NumberInput';
import { Select } from '../atoms/Select';
import { UnitText } from '../atoms/UnitText';
import { LoadingState } from '../molecules/LoadingState';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';

// How a saved label is added to a meal (R22): by consumed weight, a serving
// count, or the entire package.
export type AddFromDatabaseMode = 'weight' | 'servings' | 'package';

export type NutritionDatabaseSearchResult = {
  id: string;
  name: string;
  servingAmount: number;
  servingSizeUnit?: string;
  servingsPerPackage?: number;
  fat: number;
  carbs: number;
  protein: number;
  fiber?: number | null;
  calories: number;
  addedByName: string;
  addedAtLabel: string;
  creationSource?: string;
};

export type NutritionDatabaseSearchCardProps = {
  query: string;
  onQueryChange: (q: string) => void;
  results: NutritionDatabaseSearchResult[];
  loading?: boolean;
  searched?: boolean;
  amounts: Record<string, number>;
  onAmountChange: (id: string, amount: number | null) => void;
  /** Per-result add mode; defaults to 'weight' when unset. */
  modes?: Record<string, AddFromDatabaseMode>;
  onModeChange?: (id: string, mode: AddFromDatabaseMode) => void;
  onAdd: (id: string) => void;
  addingId?: string | null;
  onCreateNew?: () => void;
  truncated?: boolean;
  /** Total ingredients in the shared database; shown in the search label when known. */
  totalCount?: number;
};

const MODE_OPTIONS: { value: AddFromDatabaseMode; label: string }[] = [
  { value: 'weight', label: 'Weight' },
  { value: 'servings', label: 'Servings' },
  { value: 'package', label: 'Entire package' },
];

export function NutritionDatabaseSearchCard({
  query,
  onQueryChange,
  results,
  loading,
  searched,
  amounts,
  onAmountChange,
  modes,
  onModeChange,
  onAdd,
  addingId,
  onCreateNew,
  truncated,
  totalCount,
}: NutritionDatabaseSearchCardProps) {
  const searchLabel =
    totalCount != null
      ? `${totalCount} ingredient${totalCount === 1 ? '' : 's'} available for searching`
      : 'Search ingredients';
  return (
    <AnalyticsScope properties={{ organism: 'NutritionDatabaseSearchCard' }}>
      <SectionCard title="Nutrition Facts Database">
        <Field label={searchLabel}>
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g. Chicken breast"
          />
        </Field>

        {loading ? (
          <LoadingState label="Searching…" size="sm" />
        ) : searched && results.length === 0 ? (
          <HelperText as="p">No ingredients found.</HelperText>
        ) : (
          <div className={recipes.stack.sm}>
            {results.map((result, idx) => {
              const amount = amounts[result.id] ?? 0;
              const isAdding = addingId === result.id;
              const mode: AddFromDatabaseMode = modes?.[result.id] ?? 'weight';
              const canAdd = (mode === 'package' || amount > 0) && !isAdding;
              const amountLabel = mode === 'servings' ? '# of servings' : 'Weight (g/ml)';
              // Use idx in key to support duplicate entries
              const rowKey = `${result.id}-${idx}`;
              return (
                <div
                  key={rowKey}
                  className={cn(
                    recipes.stack.xs,
                    recipes.radius.control,
                    recipes.surface.card,
                    'p-3',
                  )}
                >
                  <div className={cn(recipes.stack.row, recipes.stack.between)}>
                    <div className={recipes.stack.xs}>
                      <Text as="span" variant="subheading">
                        {result.name}
                      </Text>
                      <HelperText as="span">
                        {result.servingAmount}
                        <UnitText> {result.servingSizeUnit === 'milliliter' ? 'ml' : 'g'}</UnitText>
                        {result.servingsPerPackage != null
                          ? ` · ${result.servingsPerPackage}/pkg`
                          : ''}
                        {' · '}Added by {result.addedByName} · {result.addedAtLabel}
                      </HelperText>
                      <MacroSummaryLine
                        protein={result.protein}
                        carbs={result.carbs}
                        fat={result.fat}
                        calories={result.calories}
                      />
                    </div>
                  </div>
                  <div className={cn(recipes.stack.row, 'items-end')}>
                    <div className="w-32 shrink-0">
                      <Field label="Add by">
                        <Select
                          value={mode}
                          onChange={(e) =>
                            onModeChange?.(result.id, e.target.value as AddFromDatabaseMode)
                          }
                        >
                          {MODE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    {mode !== 'package' ? (
                      <div className="flex-1">
                        <NumberInput
                          label={amountLabel}
                          value={amount || null}
                          onChange={(n) => onAmountChange(result.id, n)}
                        />
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => onAdd(result.id)}
                      disabled={!canAdd}
                      className="shrink-0 self-end"
                    >
                      {isAdding ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {truncated ? (
          <HelperText as="p">
            Showing first 25 results. Refine your search to narrow results.
          </HelperText>
        ) : null}

        {onCreateNew ? (
          <Button variant="subtle" size="sm" onClick={onCreateNew}>
            Add database ingredient
          </Button>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
