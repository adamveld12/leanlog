import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';
import { NumberInput } from '../atoms/NumberInput';
import { WarningText } from '../atoms/WarningText';
import { RadioGroup } from '../molecules/RadioGroup';
import { SectionCard } from '../molecules/SectionCard';

type BodyInfoCardProps = {
  saved?: boolean;
  weightLbs: number;
  heightInches: number;
  weightError: string;
  onWeightChange: (n: number) => void;
  onHeightChange: (n: number) => void;
  onWeightBlur: () => void;
  onHeightBlur: () => void;
};

export function BodyInfoCard(props: BodyInfoCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'BodyInfoCard' }}>
      <SectionCard title="Body Info" saved={props.saved}>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Weight (lbs)"
            value={props.weightLbs}
            onChange={props.onWeightChange}
            onBlur={props.onWeightBlur}
          />
          <NumberInput
            label="Height (inches)"
            value={props.heightInches}
            onChange={props.onHeightChange}
            onBlur={props.onHeightBlur}
          />
        </div>
        {props.weightError ? <WarningText>{props.weightError}</WarningText> : null}
      </SectionCard>
    </AnalyticsScope>
  );
}

type CalorieMode = 'deficit' | 'maintenance' | 'surplus' | 'custom';

type CalorieTargetCardProps = {
  saved?: boolean;
  mode: CalorieMode;
  targetCaloriesText: string;
  canEditTargetCalories: boolean;
  targetCaloriesError: string;
  onModeChange: (mode: CalorieMode) => void;
  onTargetCaloriesChange: (n: number) => void;
  onTargetCaloriesBlur: () => void;
};

export function CalorieTargetCard(props: CalorieTargetCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'CalorieTargetCard' }}>
      <SectionCard title="Calorie Target" saved={props.saved}>
        <RadioGroup
          name="calorie-target"
          label="Calorie Target"
          value={props.mode}
          onChange={props.onModeChange}
          options={[
            { value: 'deficit', label: 'Deficit (10x body weight)' },
            { value: 'maintenance', label: 'Maintenance (15x body weight)' },
            { value: 'surplus', label: 'Surplus (16x body weight)' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        <Field label="Target Calories">
          <Input
            value={props.targetCaloriesText}
            onChange={(e) => props.onTargetCaloriesChange(Number(e.target.value || 0))}
            onBlur={props.onTargetCaloriesBlur}
            inputMode="numeric"
            disabled={!props.canEditTargetCalories}
          />
        </Field>
        {props.targetCaloriesError ? <WarningText>{props.targetCaloriesError}</WarningText> : null}
      </SectionCard>
    </AnalyticsScope>
  );
}

type MacroMode = 'percentage' | 'custom';
type MacroTargetsCardProps = {
  saved?: boolean;
  mode: MacroMode;
  fats: number;
  carbs: number;
  protein: number;
  fatsHint: string;
  carbsHint: string;
  proteinHint: string;
  error: string;
  onModeChange: (mode: MacroMode) => void;
  onFatsChange: (n: number) => void;
  onCarbsChange: (n: number) => void;
  onProteinChange: (n: number) => void;
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
        <div className="grid grid-cols-2 gap-2">
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
