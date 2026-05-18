import { NumberInput } from './NumberInput';
import { RadioGroup } from './RadioGroup';
import { SectionCard } from './SectionCard';

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
    <SectionCard title="Body Info" saved={props.saved}>
      <div className="ll-grid-2">
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
      {props.weightError ? <small className="ll-warn">{props.weightError}</small> : null}
    </SectionCard>
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
      <label className="ll-field">
        <span>Target Calories</span>
        <input
          className="ll-input"
          value={props.targetCaloriesText}
          onChange={(e) => props.onTargetCaloriesChange(Number(e.target.value || 0))}
          onBlur={props.onTargetCaloriesBlur}
          inputMode="numeric"
          disabled={!props.canEditTargetCalories}
        />
      </label>
      {props.targetCaloriesError ? (
        <small className="ll-warn">{props.targetCaloriesError}</small>
      ) : null}
    </SectionCard>
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
      <div className="ll-grid-2">
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
      {props.error ? <small className="ll-warn">{props.error}</small> : null}
    </SectionCard>
  );
}
