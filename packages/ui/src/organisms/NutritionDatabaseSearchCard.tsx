import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { UnitText } from '../atoms/UnitText';
import { LoadingState } from '../molecules/LoadingState';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';

export type NutritionDatabaseSearchResult = {
  id: string;
  name: string;
  servingAmount: number;
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
  onAmountChange: (id: string, amount: number) => void;
  onAdd: (id: string) => void;
  addingId?: string | null;
  onCreateNew?: () => void;
  truncated?: boolean;
};

export function NutritionDatabaseSearchCard({
  query,
  onQueryChange,
  results,
  loading,
  searched,
  amounts,
  onAmountChange,
  onAdd,
  addingId,
  onCreateNew,
  truncated,
}: NutritionDatabaseSearchCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'NutritionDatabaseSearchCard' }}>
      <SectionCard title="Nutrition Database">
        <Field label="Search ingredients">
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
              const canAdd = amount > 0 && !isAdding;
              // Use idx in key to support duplicate entries
              const rowKey = `${result.id}-${idx}`;
              return (
                <div
                  key={rowKey}
                  className={cn(
                    recipes.stack.xs,
                    'border border-[var(--ll-line)] rounded-[10px] p-3',
                  )}
                >
                  <div className={cn(recipes.stack.row, recipes.stack.between)}>
                    <div className={recipes.stack.xs}>
                      <HelperText as="span" className="font-medium text-[var(--ll-text)]">
                        {result.name}
                      </HelperText>
                      <HelperText as="span">
                        {result.servingAmount}
                        <UnitText> g/ml</UnitText>
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
                    <div className="flex-1">
                      <NumberInput
                        label="Amount (g/ml)"
                        value={amount || null}
                        onChange={(n) => onAmountChange(result.id, n)}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAdd(result.id)}
                      disabled={!canAdd}
                      className="shrink-0 self-end mb-0"
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
          <HelperText as="p">Showing first 25 results. Refine your search to narrow results.</HelperText>
        ) : null}

        {onCreateNew ? (
          <Button variant="secondary" size="sm" onClick={onCreateNew}>
            Add database ingredient
          </Button>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
