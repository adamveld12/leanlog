import { useState } from 'react';
import { ageOn, type Sex } from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { RadioGroup } from '../atoms/RadioGroup';
import { Text } from '../atoms/Text';
import { TextField } from '../atoms/TextField';

export type OnboardingProfile = {
  weightLbs: number;
  heightIn: number;
  sex: Sex;
  birthDate: string;
};

type Props = {
  todayIso: string;
  // Starting values (e.g. from Health Connect); every field stays editable.
  prefill?: { weightLbs: number | null; heightIn: number | null };
  onNext: (profile: OnboardingProfile) => void;
};

const sexOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// A real calendar date for someone aged 13–120.
function validBirthDate(value: string, todayIso: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return false;
  }
  const age = ageOn(value, todayIso);
  return age >= 13 && age <= 120;
}

export function OnboardingProfileCard({ todayIso, prefill, onNext }: Props) {
  // Draft form: props seed the editable fields; the screen remounts the card (key) if the prefill changes.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState({
    weightLbs: (prefill?.weightLbs ?? null) as number | null,
    heightIn: (prefill?.heightIn ?? null) as number | null,
    sex: null as Sex | null,
    birthDate: '',
  });
  const { weightLbs, heightIn, sex, birthDate } = draft;
  const ready =
    weightLbs != null &&
    weightLbs > 0 &&
    heightIn != null &&
    heightIn > 0 &&
    sex != null &&
    validBirthDate(birthDate, todayIso);

  return (
    <Card title="Welcome to LeanLog">
      <Text variant="helper">
        Your data stays on this phone. A few details set your daily calorie and macro targets.
      </Text>
      <NumberField
        label="Weight"
        quantity="weight"
        value={weightLbs}
        onChangeValue={(v) => setDraft({ ...draft, weightLbs: v })}
      />
      <NumberField
        label="Height"
        quantity="length"
        value={heightIn}
        onChangeValue={(v) => setDraft({ ...draft, heightIn: v })}
      />
      <RadioGroup
        label="Sex"
        options={sexOptions}
        value={sex}
        onChange={(v) => setDraft({ ...draft, sex: v })}
      />
      <TextField
        label="Birth date"
        value={birthDate}
        onChangeText={(v) => setDraft({ ...draft, birthDate: v })}
        placeholder="YYYY-MM-DD"
      />
      <Button
        label="Next"
        disabled={!ready}
        onPress={() => {
          if (!ready) return;
          onNext({ weightLbs, heightIn, sex, birthDate });
        }}
      />
    </Card>
  );
}
