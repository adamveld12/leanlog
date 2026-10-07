import { useState } from 'react';
import {
  ageOn,
  isUsableBodyFat,
  jp3BodyFatPct,
  navyBodyFatPct,
  profileTargets,
  type ProfileTargetInputs,
  type Sex,
} from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { RadioGroup } from '../atoms/RadioGroup';
import { Text } from '../atoms/Text';
import { TextField } from '../atoms/TextField';
import { formatInt } from '../format';

type Method = 'navy' | 'jp3';

export type BodyFatSave = {
  method: Method;
  pct: number;
  inputs: Record<string, number>;
  // Only what changed inside the calculator is saved back (R26).
  profilePatch: { sex?: Sex; heightIn?: number; birthDate?: string };
  measurements: { neckIn?: number; waistIn?: number; hipIn?: number };
};

type Props = {
  todayIso: string;
  profile: { sex: Sex | null; heightIn: number | null; birthDate: string | null };
  // Today's, else latest, measurements used to pre-fill (inches).
  measurements: { neckIn: number | null; waistIn: number | null; hipIn: number | null };
  // Calorie profile, to project what the result would do to today's target.
  targetContext: Omit<ProfileTargetInputs, 'bodyFatPct'>;
  onSave: (result: BodyFatSave) => void;
};

const methodOptions = [
  { value: 'navy', label: 'Navy tape' },
  { value: 'jp3', label: 'Skinfold' },
] as const;
const sexOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

const SKINFOLD_SITES: Record<Sex, readonly [string, string, string]> = {
  male: ['Chest', 'Abdomen', 'Thigh'],
  female: ['Triceps', 'Suprailiac', 'Thigh'],
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function BodyFatCalculatorCard({
  todayIso,
  profile,
  measurements,
  targetContext,
  onSave,
}: Props) {
  // Draft form: props seed the editable fields; screens remount the card (key) when the saved value changes.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState({
    method: 'navy' as Method,
    sex: profile.sex,
    heightIn: profile.heightIn,
    neckIn: measurements.neckIn,
    waistIn: measurements.waistIn,
    hipIn: measurements.hipIn,
    sites: [null, null, null] as (number | null)[],
    birthDate: profile.birthDate ?? '',
  });
  const { method, sex, heightIn, neckIn, waistIn, hipIn, sites, birthDate } = draft;
  const patch = (next: Partial<typeof draft>) => setDraft({ ...draft, ...next });

  const age = ISO_DATE.test(birthDate) ? ageOn(birthDate, todayIso) : null;

  let pct: number | null = null;
  if (sex) {
    if (method === 'navy') {
      if (heightIn != null && neckIn != null && waistIn != null) {
        pct = navyBodyFatPct({ sex, heightIn, neckIn, waistIn, hipIn });
      }
    } else if (age != null && age > 0 && sites.every((s) => s != null)) {
      pct = jp3BodyFatPct(sex, age, sites as [number, number, number]);
    }
  }
  const usable = pct != null && isUsableBodyFat(pct);
  const projected =
    pct != null && usable ? profileTargets({ ...targetContext, bodyFatPct: pct }) : null;

  const save = () => {
    if (pct == null || !usable || !sex) return;
    const profilePatch: BodyFatSave['profilePatch'] = {};
    if (sex !== profile.sex) profilePatch.sex = sex;
    if (method === 'navy') {
      if (heightIn != null && heightIn !== profile.heightIn) profilePatch.heightIn = heightIn;
      onSave({
        method,
        pct,
        inputs: {
          heightIn: heightIn ?? 0,
          neckIn: neckIn ?? 0,
          waistIn: waistIn ?? 0,
          ...(sex === 'female' && hipIn != null ? { hipIn } : {}),
        },
        profilePatch,
        measurements: {
          ...(neckIn != null ? { neckIn } : {}),
          ...(waistIn != null ? { waistIn } : {}),
          ...(sex === 'female' && hipIn != null ? { hipIn } : {}),
        },
      });
    } else {
      if (birthDate !== profile.birthDate) profilePatch.birthDate = birthDate;
      const labels = SKINFOLD_SITES[sex];
      onSave({
        method,
        pct,
        inputs: {
          ageYears: age ?? 0,
          [`${labels[0]}Mm`]: sites[0] ?? 0,
          [`${labels[1]}Mm`]: sites[1] ?? 0,
          [`${labels[2]}Mm`]: sites[2] ?? 0,
        },
        profilePatch,
        measurements: {},
      });
    }
  };

  const labels = SKINFOLD_SITES[sex ?? 'male'];

  return (
    <Card title="Body fat calculator">
      <RadioGroup
        label="Method"
        options={methodOptions}
        value={method}
        onChange={(next) => patch({ method: next })}
      />
      <RadioGroup
        label="Sex"
        options={sexOptions}
        value={sex}
        onChange={(next) => patch({ sex: next })}
      />
      {method === 'navy' ? (
        <>
          <NumberField
            label="Height"
            quantity="length"
            value={heightIn}
            onChangeValue={(v) => patch({ heightIn: v })}
          />
          <NumberField
            label="Neck"
            quantity="length"
            value={neckIn}
            onChangeValue={(v) => patch({ neckIn: v })}
          />
          <NumberField
            label="Waist"
            quantity="length"
            value={waistIn}
            onChangeValue={(v) => patch({ waistIn: v })}
          />
          {sex === 'female' ? (
            <NumberField
              label="Hip"
              quantity="length"
              value={hipIn}
              onChangeValue={(v) => patch({ hipIn: v })}
            />
          ) : null}
        </>
      ) : (
        <>
          <TextField
            label="Birth date"
            value={birthDate}
            onChangeText={(v) => patch({ birthDate: v })}
            placeholder="YYYY-MM-DD"
          />
          {labels.map((label, i) => (
            <NumberField
              key={label}
              label={label}
              unit="mm"
              value={sites[i]}
              onChangeValue={(v) => patch({ sites: sites.map((s, j) => (j === i ? v : s)) })}
            />
          ))}
        </>
      )}
      {pct == null ? (
        <Text variant="helper">
          {sex ? 'Enter every measurement to see an estimate.' : 'Choose a sex to see an estimate.'}
        </Text>
      ) : (
        <>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>{`Estimate: ${pct}%`}</Text>
          {usable && projected?.breakdown ? (
            <Text variant="helper">
              {`BMR ${formatInt(projected.breakdown.bmr)} → ${formatInt(projected.targetCalories)} kcal`}
            </Text>
          ) : null}
          {!usable ? (
            <Text variant="warning">
              {`${pct}% is outside the 5–50% range. Check your measurements.`}
            </Text>
          ) : null}
        </>
      )}
      {usable && pct != null ? <Button label={`Save ${pct}%`} onPress={save} /> : null}
    </Card>
  );
}
