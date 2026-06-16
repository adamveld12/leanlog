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
  amounts?: Record<string, number>;
  onAmountChange?: (id: string, amount: number | null) => void;
  /** Per-result add mode; defaults to 'weight' when unset. */
  modes?: Record<string, AddFromDatabaseMode>;
  onModeChange?: (id: string, mode: AddFromDatabaseMode) => void;
  /** When provided, each row shows the add-by-mode/amount controls (meal/template use). */
  onAdd?: (id: string) => void;
  addingId?: string | null;
  /** When provided, owned rows show an Edit action (management page, #49). */
  onEdit?: (id: string) => void;
  /** When provided, owned rows show a Delete action (management page, #49). */
  onDelete?: (id: string) => void;
  /** Whether the current user may manage a given row; gates the Edit/Delete actions. */
  canManage?: (id: string) => boolean;
  /** Id of the row whose delete is in flight (drives the Delete button label). */
  deletingId?: string | null;
  /** Opens the inline manual label-creation form. */
  onCreateNew?: () => void;
  /** Starts a strict label scan that stages into the creation form. */
  onScanLabel?: () => void;
  /** True while a label scan is in flight (drives the scan button label). */
  scanning?: boolean;
  /** When provided, renders a "Load more" button (management browse, #49). */
  onLoadMore?: () => void;
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
  onEdit,
  onDelete,
  canManage,
  deletingId,
  onCreateNew,
  onScanLabel,
  scanning,
  onLoadMore,
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
            disabled={scanning}
          />
        </Field>

        {loading ? (
          <LoadingState label="Searching…" size="sm" />
        ) : searched && results.length === 0 ? (
          <HelperText as="p">No ingredients found.</HelperText>
        ) : (
          <div className={recipes.stack.sm}>
            {results.map((result, idx) => {
              const amount = amounts?.[result.id] ?? 0;
              const isAdding = addingId === result.id;
              const isDeleting = deletingId === result.id;
              const mode: AddFromDatabaseMode = modes?.[result.id] ?? 'weight';
              const canAdd = (mode === 'package' || amount > 0) && !isAdding && !scanning;
              const amountLabel = mode === 'servings' ? '# of servings' : 'Weight (g/ml)';
              const manageable = (onEdit || onDelete) && (canManage ? canManage(result.id) : true);
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
                  {onAdd ? (
                    <div className={cn(recipes.stack.row, 'items-end')}>
                      <div className="w-32 shrink-0">
                        <Field label="Add by">
                          <Select
                            value={mode}
                            disabled={scanning}
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
                            onChange={(n) => onAmountChange?.(result.id, n)}
                            disabled={scanning}
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
                  ) : null}
                  {manageable ? (
                    <div className={cn(recipes.stack.row, 'justify-end')}>
                      {onEdit ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(result.id)}
                          disabled={isDeleting}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDelete(result.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
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

        {onLoadMore ? (
          <Button variant="secondary" fullWidth disabled={loading} onClick={onLoadMore}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}

        {onCreateNew || onScanLabel ? (
          <div className={recipes.stack.sm}>
            {onScanLabel ? (
              <Button variant="primary" fullWidth disabled={scanning} onClick={onScanLabel}>
                {scanning ? 'Scanning…' : 'Scan to add'}
              </Button>
            ) : null}
            {onCreateNew ? (
              <Button variant="primary" fullWidth disabled={scanning} onClick={onCreateNew}>
                Add an ingredient
              </Button>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
