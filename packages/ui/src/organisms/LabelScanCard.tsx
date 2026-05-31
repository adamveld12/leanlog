import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { Field } from '../atoms/Field';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

export type LabelScanValue = {
  name: string;
  checkForServings: boolean;
  entirePackage: boolean;
  /** Weight (g/ml) when checkForServings is false, otherwise a serving count. */
  amount: number;
};

type LabelScanCardProps = {
  value: LabelScanValue;
  loading?: boolean;
  error?: string;
  onChange: (next: LabelScanValue) => void;
  onScan: () => void;
  normalizeNameOnBlur?: (value: string) => string;
};

const clamp = (n: number) => Math.max(0, Math.min(9999, n));

export function LabelScanCard({
  value,
  loading,
  error,
  onChange,
  onScan,
  normalizeNameOnBlur,
}: LabelScanCardProps) {
  const amountLabel = value.checkForServings ? '# of Servings' : 'Weight (g or ml)';

  return (
    <AnalyticsScope properties={{ organism: 'LabelScanCard' }}>
      <SectionCard>
        <SectionHeading noMargin>Label Scan</SectionHeading>

        <Field label="Ingredient name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            normalizeOnBlur={normalizeNameOnBlur}
            onNormalized={(name) => onChange({ ...value, name })}
          />
        </Field>

        <Checkbox
          name="checkForServings"
          label="Check for servings"
          checked={value.checkForServings}
          onChange={(e) => onChange({ ...value, checkForServings: e.target.checked })}
        />

        <NumberInput
          label={amountLabel}
          value={value.amount}
          disabled={value.entirePackage}
          onChange={(n) => onChange({ ...value, amount: clamp(n) })}
        />

        <Checkbox
          name="entirePackage"
          label="Entire package"
          checked={value.entirePackage}
          onChange={(e) => onChange({ ...value, entirePackage: e.target.checked })}
        />
        <HelperText as="p">Uses serving size times the servings in the package.</HelperText>

        <Button fullWidth aria-busy={loading} onClick={onScan} disabled={loading}>
          {loading ? 'Scanning…' : 'Scan Label'}
        </Button>

        {error ? (
          <div role="alert" className={recipes.stack.center}>
            <WarningText>{error}</WarningText>
          </div>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
