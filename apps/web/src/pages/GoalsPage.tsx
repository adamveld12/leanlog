import { Fragment, useEffect, useMemo, useState } from 'react';
import posthog from 'posthog-js';
import {
  Button,
  Checkbox,
  cn,
  DateSelect3,
  Field,
  HelperText,
  Input,
  ListRow,
  NumberInput,
  recipes,
  RadioGroup,
  SectionCard,
  SectionHeading,
  SuccessText,
  Text,
  WarningText,
} from '@leanlog/ui';
import {
  buildTimeline,
  defaultSelectedSegment,
  goalLifecycle,
  goalOutcome,
  macrosFromPercentage,
  validateNewGoal,
  findTrimmableActiveGoal,
  DEFAULT_MEAL_SLOTS,
  GOAL_DEFAULTS,
  uuidv7,
  type CreateGoal,
  type Goal,
  type GoalMode,
  type MealSlot,
  type TimelineSegment,
} from '@leanlog/data-access';
import { todayIso, prettyDate } from '../lib';
import { selectWeightEntries } from '../selectors';
import { useStore } from '../state';

const MODE_LABEL: Record<GoalMode, string> = {
  cut: 'Cut',
  maintain: 'Maintain',
  lean_gain: 'Lean Gain',
};

const MODE_MULTIPLIER: Record<GoalMode, number> = { cut: 10, maintain: 15, lean_gain: 16 };

function isoToParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function partsToIso({ year, month, day }: { year: number; month: number; day: number }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function segmentKey(seg: TimelineSegment): string {
  return seg.kind === 'goal'
    ? `goal:${seg.goalId}`
    : `maint:${seg.startDate ?? 'start'}:${seg.endDate ?? 'end'}`;
}

// Emoji marker for a timeline node (R38–R40): completed goals show their weight
// outcome (✅/❌), the active goal an hourglass, future goals a calendar, and the
// background maintenance fallback a flag.
function goalEmoji(
  goal: Goal,
  today: string,
  weightEntries: { date: string; weightLbs: number }[],
) {
  const lifecycle = goalLifecycle(goal, today);
  if (lifecycle === 'past')
    return goalOutcome(goal, weightEntries, today) === 'reached' ? '✅' : '❌';
  if (lifecycle === 'future') return '🗓️';
  return '⌛';
}

function dateRangeLabel(start: string | null, end: string | null): string {
  const from = start ? prettyDate(start) : 'Always';
  const to = end ? prettyDate(end) : 'ongoing';
  return `${from} → ${to}`;
}

export function GoalsPage() {
  const { goals, days, loading, createGoal, updateGoal, removeGoal } = useStore();
  const today = todayIso();
  const weightEntries = useMemo(() => selectWeightEntries(days), [days]);
  const segments = useMemo(() => buildTimeline(goals, today), [goals, today]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Transient confirmation shown at the bottom of the timeline card after a save.
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!savedMessage) return;
    const timer = setTimeout(() => setSavedMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [savedMessage]);

  const defaultKey = useMemo(() => {
    const def = defaultSelectedSegment(segments);
    return def ? segmentKey(def) : segments[0] ? segmentKey(segments[0]) : null;
  }, [segments]);

  const activeKey = adding ? null : (selectedKey ?? defaultKey);
  const selected = segments.find((s) => segmentKey(s) === activeKey) ?? null;
  const selectedGoal =
    selected?.kind === 'goal' ? (goals.find((g) => g.id === selected.goalId) ?? null) : null;

  const futureCount = goals.filter(
    (g) => !g.isBackground && g.startDate != null && g.startDate > today,
  ).length;
  const canAddGoal = futureCount < 2;

  if (loading) return <Text variant="body">Loading your goals…</Text>;

  return (
    <>
      <SectionCard title="Timeline">
        {/* Compact horizontal timeline: emoji nodes joined by dashed connectors,
            with a trailing arrow on an open-ended (ongoing) span. Tap a node to
            select it; the detail card below shows the specifics. */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {segments.map((seg, i) => {
            const key = segmentKey(seg);
            const isSelected = key === activeKey;
            const goal =
              seg.kind === 'goal' ? (goals.find((g) => g.id === seg.goalId) ?? null) : null;
            const emoji = goal ? goalEmoji(goal, today, weightEntries) : '🏁';
            const label = `${goal ? MODE_LABEL[goal.mode] : 'Maintenance'} · ${dateRangeLabel(seg.startDate, seg.endDate)}`;
            const isLast = i === segments.length - 1;
            return (
              <Fragment key={key}>
                <Button
                  variant={isSelected ? 'primary' : 'subtle'}
                  size="sm"
                  aria-pressed={isSelected}
                  aria-label={label}
                  title={label}
                  className={cn(recipes.radius.control, 'h-11 w-11 shrink-0 text-lg')}
                  onClick={() => {
                    setAdding(false);
                    setSelectedKey(key);
                  }}
                >
                  {emoji}
                </Button>
                {!isLast ? (
                  <div
                    className="min-w-6 flex-1 border-t-2 border-dashed border-[var(--ll-line)]"
                    aria-hidden
                  />
                ) : seg.openEnd ? (
                  <div className="flex min-w-6 flex-1 items-center">
                    <div
                      className="flex-1 border-t-2 border-dashed border-[var(--ll-line)]"
                      aria-hidden
                    />
                    <Text as="span" variant="body">
                      →
                    </Text>
                  </div>
                ) : null}
              </Fragment>
            );
          })}
        </div>
        <div className={cn(recipes.stack.row, 'flex-wrap')}>
          <Button
            variant="primary"
            disabled={!canAddGoal}
            onClick={() => {
              setAdding(true);
              setSelectedKey(null);
            }}
          >
            + Add Goal
          </Button>
          {selectedGoal &&
          (goalLifecycle(selectedGoal, today) === 'future' ||
            goalLifecycle(selectedGoal, today) === 'today') ? (
            <Button
              variant="danger"
              onClick={() => {
                posthog.capture('goal_deleted', { mode: selectedGoal.mode });
                void removeGoal(selectedGoal.id).then(() => setSelectedKey(null));
              }}
            >
              Delete Goal
            </Button>
          ) : null}
        </div>
        {!canAddGoal ? (
          <HelperText>You can plan at most two future goals at a time.</HelperText>
        ) : null}
        {savedMessage ? <SuccessText>{savedMessage}</SuccessText> : null}
      </SectionCard>

      {adding ? (
        <AddOrEditGoal
          goals={goals}
          today={today}
          onCancel={() => setAdding(false)}
          onSubmit={async (data, trim) => {
            if (trim) await updateGoal(trim.goalId, { endDate: trim.endDate });
            const created = await createGoal(data);
            posthog.capture('goal_created', {
              mode: data.mode,
              has_end_date: data.endDate != null,
              is_future: data.startDate > today,
            });
            setAdding(false);
            setSelectedKey(`goal:${created.id}`);
            setSavedMessage('Goal created');
          }}
        />
      ) : selected?.kind === 'maintenance' ? (
        <MaintenanceDetail onCreate={() => setAdding(true)} canAddGoal={canAddGoal} />
      ) : selectedGoal ? (
        <GoalDetail
          key={selectedGoal.id}
          goal={selectedGoal}
          today={today}
          weightEntries={weightEntries}
          onUpdate={(data) => updateGoal(selectedGoal.id, data)}
          onSaved={setSavedMessage}
        />
      ) : null}
    </>
  );
}

function MaintenanceDetail({
  onCreate,
  canAddGoal,
}: {
  onCreate: () => void;
  canAddGoal: boolean;
}) {
  return (
    <SectionCard title="Maintenance">
      <div className={cn(recipes.stack.md, 'items-center py-4 text-center')}>
        <Text variant="body">
          This stretch is covered by your background maintenance goal — targets come from your
          latest logged weight at 15× calories.
        </Text>
        <Text variant="body">Interested in cutting or lean gaining? Create a goal.</Text>
        {canAddGoal ? (
          <Button variant="primary" onClick={onCreate}>
            + Create a goal
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(recipes.stack.row, recipes.stack.between, 'w-full')}>
      <HelperText as="span">{label}</HelperText>
      <Text as="span" variant="body">
        {value}
      </Text>
    </div>
  );
}

function GoalDetail({
  goal,
  today,
  weightEntries,
  onUpdate,
  onSaved,
}: {
  goal: Goal;
  today: string;
  weightEntries: { date: string; weightLbs: number }[];
  onUpdate: (data: Parameters<ReturnType<typeof useStore>['updateGoal']>[1]) => Promise<Goal>;
  onSaved: (message: string) => void;
}) {
  const lifecycle = goalLifecycle(goal, today);
  const fullyEditable = lifecycle === 'future' || lifecycle === 'today';
  const canEdit = fullyEditable || lifecycle === 'active';
  const slotNames = goal.mealSlots.map((s) => s.name).join(' · ');

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name ?? '');
  const [description, setDescription] = useState(goal.description ?? '');
  // Seeded once from the goal; GoalDetail is remounted via key={goal.id} when the
  // selected goal changes, so this never goes stale.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [delta, setDelta] = useState<number | null>(goal.calorieDelta);

  // Derived display values for the read-only summary.
  const deltaApplies = lifecycle === 'active' || lifecycle === 'today';
  const calories = goal.targetWeightLbs
    ? Math.max(
        0,
        Math.ceil(goal.targetWeightLbs * MODE_MULTIPLIER[goal.mode]) +
          (deltaApplies ? goal.calorieDelta : 0),
      )
    : 0;
  const grams = macrosFromPercentage(calories, goal.macroFats, goal.macroCarbs, goal.macroProtein);

  // Full edit form for future / today-started goals.
  if (editing && fullyEditable) {
    return (
      <AddOrEditGoal
        goals={[]}
        today={today}
        editingGoal={goal}
        onCancel={() => setEditing(false)}
        onSubmit={async (data) => {
          await onUpdate({
            name: data.name,
            description: data.description,
            mode: data.mode,
            targetWeightLbs: data.targetWeightLbs,
            macroFats: data.macroFats,
            macroCarbs: data.macroCarbs,
            macroProtein: data.macroProtein,
            startDate: data.startDate,
            endDate: data.endDate,
            mealSlots: data.mealSlots,
          });
          posthog.capture('goal_edited', { mode: data.mode, lifecycle });
          setEditing(false);
          onSaved('Goal updated');
        }}
      />
    );
  }

  return (
    <SectionCard title={`${MODE_LABEL[goal.mode]} goal`}>
      {lifecycle === 'past' ? (
        <SummaryRow
          label="Outcome"
          value={goalOutcome(goal, weightEntries, today) === 'reached' ? '✅ Reached' : '❌ Missed'}
        />
      ) : null}
      {goal.name ? <SummaryRow label="Name" value={goal.name} /> : null}
      {goal.description ? <SummaryRow label="Notes" value={goal.description} /> : null}
      <SummaryRow label="Dates" value={dateRangeLabel(goal.startDate, goal.endDate)} />
      <SummaryRow label="Target weight" value={`${goal.targetWeightLbs ?? '—'} lb`} />
      <SummaryRow
        label="Daily calories"
        value={`${calories.toLocaleString()} kcal${
          deltaApplies && goal.calorieDelta
            ? ` (incl. ${goal.calorieDelta > 0 ? '+' : ''}${goal.calorieDelta})`
            : ''
        }`}
      />
      <SummaryRow
        label="Macros"
        value={`${goal.macroProtein}/${goal.macroCarbs}/${goal.macroFats} P/C/F · ${grams.targetProtein}/${grams.targetCarbs}/${grams.targetFat} g`}
      />
      <SummaryRow label="Meal slots" value={slotNames} />

      {/* Active (older-than-today) goals allow only name, description, end date and
          calorie delta edits (R50/R51). Past goals are fully read-only (R52). */}
      {editing && lifecycle === 'active' ? (
        <div className={recipes.stack.sm}>
          <SectionHeading noMargin>Edit</SectionHeading>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <NumberInput label="Calorie delta" value={delta} onChange={setDelta} />
          <div className={cn(recipes.stack.row, 'flex-wrap')}>
            <Button
              variant="primary"
              onClick={() => {
                posthog.capture('calorie_delta_changed', { delta: delta ?? 0 });
                void onUpdate({
                  name: name || null,
                  description: description || null,
                  calorieDelta: Math.round(delta ?? 0),
                }).then(() => {
                  setEditing(false);
                  onSaved('Goal updated');
                });
              }}
            >
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          <HelperText>
            Changing the calorie delta updates today and future days; past days keep their targets.
          </HelperText>
        </div>
      ) : canEdit ? (
        <Button variant="primary" onClick={() => setEditing(true)}>
          Edit
        </Button>
      ) : null}
    </SectionCard>
  );
}

type SubmitTrim = { goalId: string; endDate: string };

type FormSlot = MealSlot & { id: string };

// Inline Add Goal / Edit-future-goal form (R54/R55). Mode is chosen first; the
// rest prefill from standard defaults.
function AddOrEditGoal({
  goals,
  today,
  editingGoal,
  onCancel,
  onSubmit,
}: {
  goals: Goal[];
  today: string;
  editingGoal?: Goal;
  onCancel: () => void;
  onSubmit: (data: CreateGoal, trim?: SubmitTrim) => Promise<void>;
  // Several useState hooks for this multi-field form are intentional; a useReducer
  // migration is tracked separately (#50).
  // react-doctor-disable-next-line react-doctor/prefer-useReducer
}) {
  const [mode, setMode] = useState<GoalMode>(editingGoal?.mode ?? GOAL_DEFAULTS.mode);
  const [name, setName] = useState(editingGoal?.name ?? '');
  const [description, setDescription] = useState(editingGoal?.description ?? '');
  const [targetWeight, setTargetWeight] = useState<number | null>(
    editingGoal?.targetWeightLbs ?? null,
  );
  const [start, setStart] = useState(() => isoToParts(editingGoal?.startDate ?? today));
  const [hasEnd, setHasEnd] = useState(editingGoal?.endDate != null);
  const [end, setEnd] = useState(() => isoToParts(editingGoal?.endDate ?? today));
  const [fats, setFats] = useState<number | null>(
    editingGoal?.macroFats ?? GOAL_DEFAULTS.macroFats,
  );
  const [carbs, setCarbs] = useState<number | null>(
    editingGoal?.macroCarbs ?? GOAL_DEFAULTS.macroCarbs,
  );
  const [protein, setProtein] = useState<number | null>(
    editingGoal?.macroProtein ?? GOAL_DEFAULTS.macroProtein,
  );
  // Form slots carry a stable local id so the editable list keys never fall back
  // to the array index.
  const [slots, setSlots] = useState<FormSlot[]>(() =>
    (editingGoal?.mealSlots ?? DEFAULT_MEAL_SLOTS).map((s) => ({ ...s, id: uuidv7() })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pendingTrim, setPendingTrim] = useState<SubmitTrim | null>(null);

  const startIso = partsToIso(start);
  const endIso = hasEnd ? partsToIso(end) : null;

  // Live gram targets shown beside each macro %: calories = weight × mode
  // multiplier (delta is 0 for new/edited goals here), split by the percentages.
  const estimatedCalories = targetWeight ? Math.ceil(targetWeight * MODE_MULTIPLIER[mode]) : 0;
  const gramTargets = macrosFromPercentage(
    estimatedCalories,
    Math.round(fats ?? 0),
    Math.round(carbs ?? 0),
    Math.round(protein ?? 0),
  );

  function build(): CreateGoal {
    return {
      name: name || null,
      description: description || null,
      mode,
      targetWeightLbs: targetWeight ?? 0,
      macroFats: Math.round(fats ?? 0),
      macroCarbs: Math.round(carbs ?? 0),
      macroProtein: Math.round(protein ?? 0),
      startDate: startIso,
      endDate: endIso,
      mealSlots: slots.map(({ name: slotName, ingredients }) => ({ name: slotName, ingredients })),
    };
  }

  async function submit(trim?: SubmitTrim) {
    setError(null);
    if (targetWeight == null || targetWeight <= 0) {
      setError('Target weight is required.');
      return;
    }
    const macroFats = Math.round(fats ?? 0);
    const macroCarbs = Math.round(carbs ?? 0);
    const macroProtein = Math.round(protein ?? 0);
    if (macroFats + macroCarbs + macroProtein !== 100) {
      setError('Macro percentages must total 100.');
      return;
    }
    // Editing an existing future goal skips overlap validation against itself.
    if (!editingGoal) {
      const candidate = {
        startDate: startIso,
        endDate: endIso,
        macroFats,
        macroCarbs,
        macroProtein,
      };
      const otherGoals = goals.filter((g) => !g.isBackground);
      const violation = validateNewGoal(candidate, otherGoals, today);
      if (violation && violation.code === 'overlap' && !trim) {
        const trimmable = findTrimmableActiveGoal(candidate, otherGoals);
        if (trimmable) {
          setPendingTrim({ goalId: trimmable.goal.id, endDate: trimmable.trimmedEndDate });
          return;
        }
      }
      if (violation) {
        setError(violationMessage(violation.code));
        return;
      }
    }
    try {
      await onSubmit(build(), trim);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the goal. Please try again.');
    }
  }

  return (
    <SectionCard title={editingGoal ? 'Edit goal' : 'Add goal'}>
      <Field label="Name (optional)">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description (optional)">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label="Start date">
        <DateSelect3 {...start} onChange={setStart} />
      </Field>
      <Checkbox
        label="Set an end date"
        checked={hasEnd}
        onChange={(e) => setHasEnd(e.target.checked)}
      />
      {hasEnd ? (
        <Field label="End date">
          <DateSelect3 {...end} onChange={setEnd} />
        </Field>
      ) : null}

      <RadioGroup
        name="goal-mode"
        label="Mode"
        value={mode}
        options={[
          { value: 'cut', label: 'Cut (10×)' },
          { value: 'maintain', label: 'Maintain (15×)' },
          { value: 'lean_gain', label: 'Lean Gain (16×)' },
        ]}
        onChange={(v) => setMode(v)}
      />
      <NumberInput label="Target weight (lb)" value={targetWeight} onChange={setTargetWeight} />

      <SectionHeading noMargin>Macros (must total 100%)</SectionHeading>
      <div className={recipes.grid.three}>
        <NumberInput
          label={`Protein % (${gramTargets.targetProtein} g)`}
          value={protein}
          onChange={setProtein}
        />
        <NumberInput
          label={`Carbs % (${gramTargets.targetCarbs} g)`}
          value={carbs}
          onChange={setCarbs}
        />
        <NumberInput label={`Fat % (${gramTargets.targetFat} g)`} value={fats} onChange={setFats} />
      </div>

      <SectionHeading noMargin>Meal slots</SectionHeading>
      {slots.map((slot) => (
        <ListRow
          key={slot.id}
          title={
            <Input
              value={slot.name}
              onChange={(e) =>
                setSlots((prev) =>
                  prev.map((s) => (s.id === slot.id ? { ...s, name: e.target.value } : s)),
                )
              }
            />
          }
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSlots((prev) => prev.filter((s) => s.id !== slot.id))}
            >
              Remove
            </Button>
          }
        />
      ))}
      <Button
        variant="subtle"
        size="sm"
        onClick={() =>
          setSlots((prev) => [
            ...prev,
            { id: uuidv7(), name: `Meal ${prev.length + 1}`, ingredients: [] },
          ])
        }
      >
        + Add slot
      </Button>

      {error ? <WarningText>{error}</WarningText> : null}

      {pendingTrim ? (
        <div className={recipes.stack.sm}>
          <WarningText>
            This overlaps your current goal. Saving will end that goal on{' '}
            {prettyDate(pendingTrim.endDate)}.
          </WarningText>
          <div className={cn(recipes.stack.row, 'flex-wrap')}>
            <Button
              variant="primary"
              onClick={() => {
                const trim = pendingTrim;
                setPendingTrim(null);
                void submit(trim);
              }}
            >
              Trim and save
            </Button>
            <Button variant="ghost" onClick={() => setPendingTrim(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn(recipes.stack.row, 'flex-wrap')}>
          <Button variant="primary" onClick={() => void submit()}>
            {editingGoal ? 'Save goal' : 'Create goal'}
          </Button>
          {!editingGoal ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

function violationMessage(code: string): string {
  switch (code) {
    case 'start_in_past':
      return 'Start date cannot be in the past.';
    case 'end_before_start':
      return 'End date must be after the start date.';
    case 'overlap':
      return 'This goal overlaps an existing goal.';
    case 'too_many_future':
      return 'You can plan at most two future goals.';
    default:
      return 'Macro percentages must total 100.';
  }
}
