import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { useState } from 'react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { NumberInput } from '../atoms/NumberInput';
import { Select } from '../atoms/Select';
import { UnitText } from '../atoms/UnitText';
import { LoadingState } from '../molecules/LoadingState';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { PhotoSlot } from '../molecules/PhotoSlot';
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
  /** Public URL of the entry's thumbnail photo (product preferred, else label),
   *  or null when the entry has no photo (R10). */
  thumbnailUrl?: string | null;
  /** Public URL of the product (front-of-package) photo, shown in the read-only
   *  expand (R11). Null/undefined when absent. */
  productPhotoUrl?: string | null;
  /** Public URL of the Nutrition Facts label photo, shown in the expand (R11). */
  labelPhotoUrl?: string | null;
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

// Small square thumbnail shown beside each search result (R10). Renders the
// entry's photo when present, else a neutral placeholder (no <img>) so users can
// still scan the list without a broken-image flash.
function SearchThumbnail({ url, name }: { url?: string | null; name: string }) {
  return (
    <div
      className={cn(
        recipes.radius.control,
        recipes.surface.card,
        'h-12 w-12 shrink-0 overflow-hidden',
        url ? '' : recipes.stack.centerBox,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <HelperText as="span">—</HelperText>
      )}
    </div>
  );
}

// A single search result: name/meta/macros with a thumbnail, the add-by controls
// (meal/template use), an owner-gated Edit/Delete row (management page), and a
// read-only photo expand (R11) any viewer can open to confirm the numbers. Named
// component so each row keeps its own expand state across list re-renders.
function SearchResultRow({
  result,
  amount,
  mode,
  isAdding,
  isDeleting,
  scanning,
  manageable,
  onAmountChange,
  onModeChange,
  onAdd,
  onEdit,
  onDelete,
}: {
  result: NutritionDatabaseSearchResult;
  amount: number;
  mode: AddFromDatabaseMode;
  isAdding: boolean;
  isDeleting: boolean;
  scanning?: boolean;
  manageable?: boolean;
  onAmountChange?: (id: string, amount: number | null) => void;
  onModeChange?: (id: string, mode: AddFromDatabaseMode) => void;
  onAdd?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canAdd = (mode === 'package' || amount > 0) && !isAdding && !scanning;
  const amountLabel = mode === 'servings' ? '# of servings' : 'Weight (g/ml)';
  const hasPhotos = Boolean(result.productPhotoUrl || result.labelPhotoUrl);

  return (
    <div className={cn(recipes.stack.xs, recipes.radius.control, recipes.surface.card, 'p-3')}>
      <div className={cn(recipes.stack.row, recipes.stack.between)}>
        <div className={cn(recipes.stack.row, 'min-w-0 items-start')}>
          <SearchThumbnail url={result.thumbnailUrl} name={result.name} />
          <div className={cn(recipes.stack.xs, 'min-w-0')}>
            <Text as="span" variant="subheading">
              {result.name}
            </Text>
            <HelperText as="span">
              {result.servingAmount}
              <UnitText> {result.servingSizeUnit === 'milliliter' ? 'ml' : 'g'}</UnitText>
              {result.servingsPerPackage != null ? ` · ${result.servingsPerPackage}/pkg` : ''}
              {/* Seeded USDA foods are attributed to the dataset, not a user (#72). */}
              {result.creationSource === 'usda'
                ? ' · From USDA'
                : ` · Added by ${result.addedByName} · ${result.addedAtLabel}`}
            </HelperText>
            <MacroSummaryLine
              protein={result.protein}
              carbs={result.carbs}
              fat={result.fat}
              calories={result.calories}
            />
          </div>
        </div>
        {hasPhotos ? (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? 'Hide photos' : 'View photos'}
          </Button>
        ) : null}
      </div>
      {expanded && hasPhotos ? (
        <div className={recipes.grid.two}>
          <PhotoSlot
            label="Product photo"
            src={result.productPhotoUrl}
            alt={`Front of ${result.name} package`}
          />
          <PhotoSlot
            label="Nutrition label"
            src={result.labelPhotoUrl}
            alt={`Nutrition Facts label for ${result.name}`}
          />
        </div>
      ) : null}
      {onAdd ? (
        <div className={cn(recipes.stack.row, 'items-end')}>
          <div className="w-32 shrink-0">
            <Field label="Add by">
              <Select
                value={mode}
                disabled={scanning}
                onChange={(e) => onModeChange?.(result.id, e.target.value as AddFromDatabaseMode)}
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
}

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
            {results.map((result, idx) => (
              <SearchResultRow
                // Use idx in key to support duplicate entries
                key={`${result.id}-${idx}`}
                result={result}
                amount={amounts?.[result.id] ?? 0}
                mode={modes?.[result.id] ?? 'weight'}
                isAdding={addingId === result.id}
                isDeleting={deletingId === result.id}
                scanning={scanning}
                manageable={(onEdit || onDelete) && (canManage ? canManage(result.id) : true)}
                onAmountChange={onAmountChange}
                onModeChange={onModeChange}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
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
