import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Field } from '../atoms/Field';
import { Input } from '../atoms/Input';
import { WarningText } from '../atoms/WarningText';
import { RadioGroup } from '../molecules/RadioGroup';
import { SectionCard } from '../molecules/SectionCard';

export type CalorieMode = 'deficit' | 'maintenance' | 'surplus' | 'custom';

export type CalorieTargetCardProps = {
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
