import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { Field } from '../atoms/Field';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { RadioGroup } from '../molecules/RadioGroup';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

export type ScanMode = 'weight' | 'servings' | 'package';

export type LabelScanValue = {
  name: string;
  mode: ScanMode;
  /** Weight (g/ml) in 'weight' mode, a serving count in 'servings' mode, unused in 'package'. */
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
  const amountLabel = value.mode === 'servings' ? '# of Servings' : 'Weight (g or ml)';

  return (
    <AnalyticsScope properties={{ organism: 'LabelScanCard' }}>
      <SectionCard>
        <div className="flex items-center gap-2 justify-between">
          <SectionHeading noMargin>Label Scan</SectionHeading>
          <Button size="sm" aria-busy={loading} onClick={onScan} disabled={loading}>
            {loading ? 'Scanning…' : 'Scan Label'}
          </Button>
        </div>

        <Field label="Ingredient Name">
          <Input
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            normalizeOnBlur={normalizeNameOnBlur}
            onNormalized={(name) => onChange({ ...value, name })}
          />
        </Field>

        <RadioGroup
          name="scan-mode"
          label="Scan mode"
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
          options={[
            { value: 'weight', label: 'Weight' },
            { value: 'servings', label: 'Servings' },
            { value: 'package', label: 'Entire package' },
          ]}
        />
        {value.mode === 'package' ? (
          <HelperText as="p">Uses serving size times the servings in the package.</HelperText>
        ) : null}

        <NumberInput
          label={amountLabel}
          value={value.amount}
          disabled={value.mode === 'package'}
          onChange={(n) => onChange({ ...value, amount: clamp(n) })}
        />

        {error ? (
          <div role="alert" className={recipes.stack.center}>
            <WarningText>{error}</WarningText>
          </div>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
