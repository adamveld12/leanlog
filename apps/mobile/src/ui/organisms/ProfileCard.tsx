import { useState } from 'react';
import type { Sex } from '@leanlog/data-access';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { NumberField } from '../atoms/NumberField';
import { RadioGroup } from '../atoms/RadioGroup';
import { TextField } from '../atoms/TextField';

export type ProfileDraft = { sex: Sex | null; heightIn: number | null; birthDate: string | null };

const sexOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function ProfileCard({
  initial,
  onSave,
}: {
  initial: ProfileDraft;
  onSave: (draft: ProfileDraft) => void;
}) {
  // Draft form: props seed the editable fields; screens remount the card (key) when the saved value changes.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState({
    sex: initial.sex,
    heightIn: initial.heightIn,
    birthDate: initial.birthDate ?? '',
  });
  const dateOk = draft.birthDate === '' || ISO_DATE.test(draft.birthDate);
  return (
    <Card title="Profile">
      <RadioGroup
        label="Sex"
        options={sexOptions}
        value={draft.sex}
        onChange={(sex) => setDraft({ ...draft, sex })}
      />
      <NumberField
        label="Height"
        quantity="length"
        value={draft.heightIn}
        onChangeValue={(heightIn) => setDraft({ ...draft, heightIn })}
      />
      <TextField
        label="Birth date"
        value={draft.birthDate}
        onChangeText={(birthDate) => setDraft({ ...draft, birthDate })}
        placeholder="YYYY-MM-DD"
      />
      <Button
        label="Save profile"
        disabled={!dateOk}
        onPress={() =>
          onSave({
            sex: draft.sex,
            heightIn: draft.heightIn,
            birthDate: draft.birthDate === '' ? null : draft.birthDate,
          })
        }
      />
    </Card>
  );
}
