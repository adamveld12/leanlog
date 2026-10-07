import { useState } from 'react';
import {
  ACTIVITY_LABEL,
  minProfileDelta,
  profileTargets,
  type ActivityLevel,
  type ProfileTargetInputs,
} from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { Select } from '../atoms/Select';
import { Text } from '../atoms/Text';
import { formatNegative } from '../format';
import { TargetBreakdown } from '../molecules/TargetBreakdown';

export type TargetsDraft = {
  activityLevel: ActivityLevel | null;
  calorieDelta: number;
  macroFats: number;
  macroCarbs: number;
  macroProtein: number;
};

type Props = {
  initial: TargetsDraft;
  // Current weight and body fat (null before the first calculation).
  weightLbs: number;
  bodyFatPct: number | null;
  onSave: (draft: TargetsDraft) => void;
};

type ActivityValue = 'none' | ActivityLevel;

const activityOptions: readonly { value: ActivityValue; label: string }[] = [
  { value: 'none', label: 'None' },
  ...(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((k) => ({
    value: k,
    label: ACTIVITY_LABEL[k],
  })),
];

// Activity, calorie delta and macro split with the live Katch breakdown (R14–R20).
export function TargetsCard({ initial, weightLbs, bodyFatPct, onSave }: Props) {
  // Draft form: props seed the editable fields; screens remount the card (key) when the saved value changes.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState({
    activity: (initial.activityLevel ?? 'none') as ActivityValue,
    delta: initial.calorieDelta as number | null,
    fats: initial.macroFats as number | null,
    carbs: initial.macroCarbs as number | null,
    protein: initial.macroProtein as number | null,
  });
  const { activity, delta, fats, carbs, protein } = draft;

  const split = (fats ?? 0) + (carbs ?? 0) + (protein ?? 0);
  const splitValid = Math.round(split) === 100;
  const deltaValue = Math.round(delta ?? 0);

  const inputs: ProfileTargetInputs = {
    weightLbs,
    bodyFatPct,
    activityLevel: activity === 'none' ? null : activity,
    calorieDelta: deltaValue,
    macroFats: fats ?? 0,
    macroCarbs: carbs ?? 0,
    macroProtein: protein ?? 0,
  };
  const minDelta = minProfileDelta(inputs);
  const belowFloor = deltaValue < minDelta;
  const targets = profileTargets(inputs);
  const canSave = splitValid && !belowFloor && delta != null;

  return (
    <Card title="Targets">
      <Select
        label="Activity"
        options={activityOptions}
        value={activity}
        onChange={(next) => setDraft({ ...draft, activity: next })}
      />
      <NumberField
        label="Calorie delta"
        unit="kcal"
        value={delta}
        onChangeValue={(next) => setDraft({ ...draft, delta: next })}
      />
      <Text variant="helper">{`Lowest allowed delta: ${formatNegative(minDelta)} kcal`}</Text>
      {belowFloor ? (
        <Text variant="warning">{`Calorie delta can't go below ${formatNegative(minDelta)}.`}</Text>
      ) : null}
      <NumberField
        label="Fat %"
        unit="%"
        value={fats}
        onChangeValue={(next) => setDraft({ ...draft, fats: next })}
      />
      <NumberField
        label="Carbs %"
        unit="%"
        value={carbs}
        onChangeValue={(next) => setDraft({ ...draft, carbs: next })}
      />
      <NumberField
        label="Protein %"
        unit="%"
        value={protein}
        onChangeValue={(next) => setDraft({ ...draft, protein: next })}
      />
      {!splitValid ? (
        <Text variant="warning">{`Macro split must add up to 100 (now ${Math.round(split)}).`}</Text>
      ) : null}
      <TargetBreakdown
        basis={targets.basis}
        breakdown={targets.breakdown}
        calorieDelta={deltaValue}
        targetCalories={targets.targetCalories}
      />
      <Button
        label="Save targets"
        disabled={!canSave}
        onPress={() =>
          onSave({
            activityLevel: activity === 'none' ? null : activity,
            calorieDelta: deltaValue,
            macroFats: fats ?? 0,
            macroCarbs: carbs ?? 0,
            macroProtein: protein ?? 0,
          })
        }
      />
    </Card>
  );
}
