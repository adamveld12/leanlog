import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { NumberInput } from '../atoms/NumberInput';
import { SectionHeading } from '../atoms/SectionHeading';
import { WarningText } from '../atoms/WarningText';
import { RadioGroup } from '../molecules/RadioGroup';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ScanMode = 'weight' | 'servings' | 'package';

export type LabelScanValue = {
  mode: ScanMode;
  /** Weight (g/ml) in 'weight' mode, a serving count in 'servings' mode, unused in 'package'. */
  amount: number | null;
};

type LabelScanCardProps = {
  value: LabelScanValue;
  loading?: boolean;
  error?: string;
  onChange: (next: LabelScanValue) => void;
  onScan: () => void;
};

const clamp = (n: number | null) => (n == null ? null : Math.max(0, Math.min(9999, n)));

export function LabelScanCard({ value, loading, error, onChange, onScan }: LabelScanCardProps) {
  const amountLabel = value.mode === 'servings' ? '# of Servings' : 'Weight (g or ml)';

  return (
    <AnalyticsScope properties={{ organism: 'LabelScanCard' }}>
      <SectionCard>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <SectionHeading noMargin>Label Scan</SectionHeading>
          <Button size="sm" onClick={onScan} disabled={loading}>
            {loading ? 'Scanning…' : 'Scan Label'}
          </Button>
        </div>

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

        {value.mode !== 'package' ? (
          <NumberInput
            label={amountLabel}
            value={value.amount}
            onChange={(n) => onChange({ ...value, amount: clamp(n) })}
          />
        ) : null}

        {error ? (
          <div role="alert" className={recipes.stack.center}>
            <WarningText>{error}</WarningText>
          </div>
        ) : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
