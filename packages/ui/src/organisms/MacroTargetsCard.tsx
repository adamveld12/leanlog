import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { NumberInput } from '../atoms/NumberInput';
import { WarningText } from '../atoms/WarningText';
import { RadioGroup } from '../molecules/RadioGroup';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

export type MacroMode = 'percentage' | 'custom';

export type MacroTargetsCardProps = {
  saved?: boolean;
  mode: MacroMode;
  fats: number | null;
  carbs: number | null;
  protein: number | null;
  fatsHint: string;
  carbsHint: string;
  proteinHint: string;
  error: string;
  onModeChange: (mode: MacroMode) => void;
  onFatsChange: (n: number | null) => void;
  onCarbsChange: (n: number | null) => void;
  onProteinChange: (n: number | null) => void;
  onBlur: () => void;
};

export function MacroTargetsCard(props: MacroTargetsCardProps) {
  const unit = props.mode === 'percentage' ? '%' : 'g';
  return (
    <AnalyticsScope properties={{ organism: 'MacroTargetsCard' }}>
      <SectionCard title="Macro Targets" saved={props.saved}>
        <RadioGroup
          name="macro-target-mode"
          label="Macro Mode"
          value={props.mode}
          onChange={props.onModeChange}
          options={[
            { value: 'percentage', label: 'Percentage Macro Ratios' },
            { value: 'custom', label: 'Custom Macro Ratios' },
          ]}
        />
        <div className={recipes.grid.two}>
          <NumberInput
            label={`Fats (${unit}): ${props.fatsHint}`}
            value={props.fats}
            onChange={props.onFatsChange}
            onBlur={props.onBlur}
          />
          <NumberInput
            label={`Carbs (${unit}): ${props.carbsHint}`}
            value={props.carbs}
            onChange={props.onCarbsChange}
            onBlur={props.onBlur}
          />
        </div>
        <NumberInput
          label={`Protein (${unit}): ${props.proteinHint}`}
          value={props.protein}
          onChange={props.onProteinChange}
          onBlur={props.onBlur}
        />
        {props.error ? <WarningText>{props.error}</WarningText> : null}
      </SectionCard>
    </AnalyticsScope>
  );
}
