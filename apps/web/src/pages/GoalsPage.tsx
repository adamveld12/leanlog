import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  AnalyticsScope,
  APP_NAV_LINKS,
  Button,
  Checkbox,
  cn,
  DateSelect3,
  Field,
  GoalsTemplate,
  HelperText,
  Input,
  ListRow,
  MacroSummaryLine,
  NumberInput,
  recipes,
  RadioGroup,
  SectionCard,
  SectionHeading,
  Select,
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
  targetsFromGoal,
  baseCaloriesFromGoal,
  katchBreakdown,
  minCalorieDelta,
  GOAL_MULTIPLIER,
  ACTIVITY_LABEL,
  ACTIVITY_MULTIPLIER,
  BODY_FAT_OPTIONS,
  validateNewGoal,
  findTrimmableActiveGoal,
  weightOnOrBefore,
  FALLBACK_WEIGHT_LBS,
  DEFAULT_MEAL_SLOTS,
  GOAL_DEFAULTS,
  uuidv7,
  type ActivityLevel,
  type CalorieBasis,
  type CreateGoal,
  type Goal,
  type GoalMode,
  type MealSlot,
  type TimelineSegment,
  type UpdateBackgroundGoal,
} from '@leanlog/data-access';
import { todayIso, prettyDate } from '../lib';
import { selectWeightEntries } from '../selectors';
import { useStore } from '../state';
import { HeaderControls, renderRouterNavLink } from './_shared';

const MODE_LABEL: Record<GoalMode, string> = {
  cut: 'Cut',
  maintain: 'Maintain',
  lean_gain: 'Lean Gain',
};

// Activity tiers in ascending order for the Katch activity selector (#63 R5/R26).
const ACTIVITY_ORDER: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'very_active',
  'athlete',
];

// Body-composition inputs for a Katch goal: a coarse body-fat dropdown and the
// five activity tiers (#63 R26). Both required; values bubble up to the form.
function BodyCompFields({
  bodyFatPct,
  activityLevel,
  onBodyFatChange,
  onActivityChange,
}: {
  bodyFatPct: number | null;
  activityLevel: ActivityLevel | null;
  onBodyFatChange: (next: number | null) => void;
  onActivityChange: (next: ActivityLevel | null) => void;
}) {
  return (
    <div className={recipes.grid.two}>
      <Field label="Body fat %">
        <Select
          name="goal-body-fat"
          value={bodyFatPct ?? ''}
          onChange={(e) => onBodyFatChange(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Select…</option>
          {BODY_FAT_OPTIONS.map((pct) => (
            <option key={pct} value={pct}>
              {pct}%
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Activity level">
        <Select
          name="goal-activity"
          value={activityLevel ?? ''}
          // Map the "Select…" placeholder back to null so the empty string never
          // slips the != null guards (which would yield NaN in the breakdown and a
          // rejected API call).
          onChange={(e) =>
            onActivityChange(e.target.value === '' ? null : (e.target.value as ActivityLevel))
          }
        >
          <option value="">Select…</option>
          {ACTIVITY_ORDER.map((level) => (
            <option key={level} value={level}>
              {ACTIVITY_LABEL[level]} (×{ACTIVITY_MULTIPLIER[level]})
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

// Live LBM → BMR → TDEE → final-target breakdown for a Katch goal (#63 R27/R29).
// Renders nothing until both body-comp inputs are present. `modeLabel` annotates
// the final adjusted line so the percentage adjustment is explicit.
function KatchBreakdownPanel({
  weightLbs,
  bodyFatPct,
  activityLevel,
  mode,
  finalCalories,
}: {
  weightLbs: number;
  bodyFatPct: number;
  activityLevel: ActivityLevel;
  mode: GoalMode;
  finalCalories: number;
}) {
  const b = katchBreakdown(weightLbs, bodyFatPct, activityLevel, mode);
  return (
    <div className={recipes.stack.sm}>
      <SectionHeading noMargin>Katch-McArdle breakdown</SectionHeading>
      <SummaryRow label="Lean body mass" value={`${b.lbmKg.toFixed(1)} kg`} />
      <SummaryRow label="BMR" value={`${Math.round(b.bmr)} kcal`} />
      <SummaryRow
        label={`TDEE (${ACTIVITY_LABEL[activityLevel]})`}
        value={`${Math.round(b.tdee)} kcal`}
      />
      <SummaryRow label={`Target (${MODE_LABEL[mode]})`} value={`${finalCalories} kcal`} />
    </div>
  );
}

// Weight → multiplier → target breakdown for a bodyweight goal, mirroring the
// Katch panel so both bases explain how the calorie target is reached (#63 R28).
function BodyweightBreakdownPanel({
  weightLbs,
  hasLoggedWeight,
  mode,
  finalCalories,
}: {
  weightLbs: number;
  // Whether weightLbs is a real logged weight or the 180 lb fallback.
  hasLoggedWeight: boolean;
  mode: GoalMode;
  finalCalories: number;
}) {
  return (
    <div className={recipes.stack.sm}>
      <SectionHeading noMargin>Bodyweight breakdown</SectionHeading>
      <SummaryRow
        label="Latest weight"
        value={hasLoggedWeight ? `${weightLbs} lb` : `${weightLbs} lb (default)`}
      />
      <SummaryRow label={`Multiplier (${MODE_LABEL[mode]})`} value={`${GOAL_MULTIPLIER[mode]}×`} />
      <SummaryRow label="Target" value={`${finalCalories} kcal`} />
    </div>
  );
}

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

function GoalsPlanner() {
  const { goals, days, loading, createGoal, updateGoal, removeGoal, configureBackgroundGoal } =
    useStore();
  const today = todayIso();
  const weightEntries = useMemo(() => selectWeightEntries(days), [days]);
  const segments = useMemo(() => buildTimeline(goals, today), [goals, today]);
  const backgroundGoal = useMemo(() => goals.find((g) => g.isBackground) ?? null, [goals]);

  // Deep link: ?goal=<id> selects that goal on open (e.g. from the Day List
  // active-goal shortcut).
  const [searchParams] = useSearchParams();
  const requestedGoalId = searchParams.get('goal');
  const [selectedKey, setSelectedKey] = useState<string | null>(
    requestedGoalId ? `goal:${requestedGoalId}` : null,
  );
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
  const latestWeight = weightOnOrBefore(weightEntries, today);

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
          latestWeightLbs={latestWeight}
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
        <MaintenanceDetail
          backgroundGoal={backgroundGoal}
          latestWeightLbs={latestWeight}
          onCreate={() => setAdding(true)}
          canAddGoal={canAddGoal}
          onConfigure={async (data) => {
            await configureBackgroundGoal(data);
            posthog.capture('background_goal_configured', { basis: data.calorieBasis });
            setSavedMessage('Maintenance basis updated');
          }}
        />
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
  backgroundGoal,
  latestWeightLbs,
  onCreate,
  canAddGoal,
  onConfigure,
}: {
  backgroundGoal: Goal | null;
  // Latest logged weight on/before today (null if none) — the basis for the live
  // Katch breakdown, matching how fallback day targets are derived.
  latestWeightLbs: number | null;
  onCreate: () => void;
  canAddGoal: boolean;
  onConfigure: (data: UpdateBackgroundGoal) => Promise<void>;
  // The basis + two body-comp inputs plus error/saving flags are independent form
  // state; a useReducer migration is tracked with the goal form's (#50).
  // react-doctor-disable-next-line react-doctor/prefer-useReducer
}) {
  // The background goal's basis is user-editable at any time (#63 R21), so this is
  // a live form, not a read-only summary. Seeded from the current background goal.
  const [calorieBasis, setCalorieBasis] = useState<CalorieBasis>(
    backgroundGoal?.calorieBasis ?? 'bodyweight',
  );
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(backgroundGoal?.bodyFatPct ?? null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    backgroundGoal?.activityLevel ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const basisWeight = latestWeightLbs ?? FALLBACK_WEIGHT_LBS;
  const katchReady = calorieBasis === 'katch' && bodyFatPct != null && activityLevel != null;
  // The background goal always maintains (R22), so the breakdown uses Maintain.
  const finalCalories = katchReady
    ? baseCaloriesFromGoal(
        { calorieBasis: 'katch', bodyFatPct, activityLevel, mode: 'maintain' } as Goal,
        basisWeight,
      )
    : Math.ceil(basisWeight * GOAL_MULTIPLIER.maintain);

  async function save() {
    setError(null);
    if (calorieBasis === 'katch' && (bodyFatPct == null || activityLevel == null)) {
      setError('Body fat and activity level are required for the Katch-McArdle basis.');
      return;
    }
    setSaving(true);
    try {
      await onConfigure({
        calorieBasis,
        bodyFatPct: calorieBasis === 'katch' ? bodyFatPct : null,
        activityLevel: calorieBasis === 'katch' ? activityLevel : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the maintenance basis.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Maintenance">
      <Text variant="body">
        This stretch is covered by your background maintenance goal. Choose how its fallback
        calories are estimated; this also covers gaps between your goals.
      </Text>

      <RadioGroup
        name="maintenance-calorie-basis"
        label="Calorie basis"
        value={calorieBasis}
        options={[
          { value: 'bodyweight', label: 'Bodyweight multiplier (15×)' },
          { value: 'katch', label: 'Katch-McArdle (body composition)' },
        ]}
        onChange={(v) => setCalorieBasis(v)}
      />
      {calorieBasis === 'katch' ? (
        <>
          <BodyCompFields
            bodyFatPct={bodyFatPct}
            activityLevel={activityLevel}
            onBodyFatChange={setBodyFatPct}
            onActivityChange={setActivityLevel}
          />
          {katchReady && bodyFatPct != null && activityLevel != null ? (
            <KatchBreakdownPanel
              weightLbs={basisWeight}
              bodyFatPct={bodyFatPct}
              activityLevel={activityLevel}
              mode="maintain"
              finalCalories={finalCalories}
            />
          ) : (
            <HelperText>
              Pick a body fat % and activity level to see the maintenance breakdown.
            </HelperText>
          )}
        </>
      ) : (
        <HelperText>
          Targets come from your latest logged weight at 15× calories ({basisWeight} lb →{' '}
          {finalCalories} kcal).
        </HelperText>
      )}

      {error ? <WarningText>{error}</WarningText> : null}
      <div className={cn(recipes.stack.row, 'flex-wrap')}>
        <Button variant="primary" disabled={saving} onClick={() => void save()}>
          Save maintenance basis
        </Button>
        {canAddGoal ? (
          <Button variant="ghost" onClick={onCreate}>
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

  // Derived display values for the read-only summary. Without an explicit target
  // weight, targets fall back to the latest logged weight (or 180), like the day
  // derivation does.
  const deltaApplies = lifecycle === 'active' || lifecycle === 'today';
  // Calories/macros derive from the latest logged weight (or 180 when none),
  // exactly like day targets do — the target weight is the aspiration, not the
  // basis.
  const latestWeight = weightOnOrBefore(weightEntries, today);
  const basisWeight = latestWeight ?? FALLBACK_WEIGHT_LBS;
  const targets = targetsFromGoal(goal, basisWeight, { applyDelta: deltaApplies });

  // The calorie delta is absorbed by carbs, so it cannot dip below the goal's
  // carb-calorie budget without driving carbs negative.
  const minDelta = minCalorieDelta(goal, basisWeight);
  const carbsWouldGoNegative = Math.round(delta ?? 0) < minDelta;

  // Full edit form for future / today-started goals.
  if (editing && fullyEditable) {
    return (
      <AddOrEditGoal
        goals={[]}
        today={today}
        latestWeightLbs={latestWeight}
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
            // Body-comp basis is editable only while future/today (#63 R17).
            calorieBasis: data.calorieBasis,
            bodyFatPct: data.bodyFatPct,
            activityLevel: data.activityLevel,
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
    <SectionCard title={goal.name?.trim() || MODE_LABEL[goal.mode]}>
      {lifecycle === 'past' ? (
        <SummaryRow
          label="Outcome"
          value={goalOutcome(goal, weightEntries, today) === 'reached' ? '✅ Reached' : '❌ Missed'}
        />
      ) : null}
      <SummaryRow label="Mode" value={MODE_LABEL[goal.mode]} />
      {goal.description ? <SummaryRow label="Notes" value={goal.description} /> : null}
      <SummaryRow label="Dates" value={dateRangeLabel(goal.startDate, goal.endDate)} />
      <SummaryRow label="Target weight" value={`${goal.targetWeightLbs ?? '—'} lb`} />
      <SummaryRow
        label="Latest weight logged"
        value={latestWeight != null ? `${latestWeight} lb` : `${FALLBACK_WEIGHT_LBS} lb (default)`}
      />
      <SummaryRow
        label="Calorie basis"
        value={goal.calorieBasis === 'katch' ? 'Katch-McArdle' : 'Bodyweight multiplier'}
      />
      {goal.calorieBasis === 'katch' && goal.bodyFatPct != null && goal.activityLevel != null ? (
        <>
          <SummaryRow label="Body fat" value={`${goal.bodyFatPct}%`} />
          <SummaryRow label="Activity" value={ACTIVITY_LABEL[goal.activityLevel]} />
        </>
      ) : null}
      <SummaryRow
        label="Macro split"
        value={`${goal.macroProtein}/${goal.macroCarbs}/${goal.macroFats} P/C/F`}
      />
      <MacroSummaryLine
        calories={targets.targetCalories}
        protein={targets.targetProtein}
        carbs={targets.targetCarbs}
        fat={targets.targetFat}
      />
      {deltaApplies && goal.calorieDelta ? (
        <HelperText>
          Includes a calorie delta of {goal.calorieDelta > 0 ? '+' : ''}
          {goal.calorieDelta}.
        </HelperText>
      ) : null}
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
          <NumberInput label="Calorie delta" value={delta} onChange={setDelta} allowNegative />
          {carbsWouldGoNegative ? (
            <WarningText>
              That deficit would push carbs below 0 g. The lowest allowed delta is {minDelta}.
            </WarningText>
          ) : null}
          <div className={cn(recipes.stack.row, 'flex-wrap')}>
            <Button
              variant="primary"
              disabled={carbsWouldGoNegative}
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
// rest prefill from standard defaults. The form is long because it composes the
// full goal model (dates, mode, calorie basis + Katch body-comp, macros, meal
// slots) in one card; the reusable Katch pieces are already extracted
// (BodyCompFields, KatchBreakdownPanel). A further split is tracked with the
// useReducer migration (#50).
// react-doctor-disable-next-line react-doctor/no-giant-component
function AddOrEditGoal({
  goals,
  today,
  latestWeightLbs,
  editingGoal,
  onCancel,
  onSubmit,
}: {
  goals: Goal[];
  today: string;
  // Latest logged weight on/before today (null if none) — the basis for the live
  // calorie/macro preview, matching how day targets are derived.
  latestWeightLbs: number | null;
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
  // Calorie basis + body-composition snapshot (#63). Default to today's behavior
  // (bodyweight); body-comp inputs are seeded from an editing Katch goal.
  const [calorieBasis, setCalorieBasis] = useState<CalorieBasis>(
    editingGoal?.calorieBasis ?? 'bodyweight',
  );
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(editingGoal?.bodyFatPct ?? null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    editingGoal?.activityLevel ?? null,
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

  // A Katch goal needs both body-comp inputs before it can compute calories; until
  // then the preview falls back to the bodyweight multiplier so the macro grams
  // still render. The whole preview recomputes live as basis/body-fat/activity/mode
  // change (#63 R27/R29).
  const katchReady = calorieBasis === 'katch' && bodyFatPct != null && activityLevel != null;

  // Live gram targets shown beside each macro %. Base calories come from the
  // chosen basis: Katch mode-adjusted TDEE when ready, else the weight multiplier.
  const basisWeight = latestWeightLbs ?? FALLBACK_WEIGHT_LBS;
  const estimatedCalories = katchReady
    ? baseCaloriesFromGoal(
        { calorieBasis: 'katch', bodyFatPct, activityLevel, mode } as Goal,
        basisWeight,
      )
    : Math.ceil(basisWeight * GOAL_MULTIPLIER[mode]);
  const gramTargets = macrosFromPercentage(
    estimatedCalories,
    Math.round(fats ?? 0),
    Math.round(carbs ?? 0),
    Math.round(protein ?? 0),
  );

  function build(): CreateGoal {
    // Target weight semantics by mode/basis (#63):
    //  - Cut/Lean Gain: the user's entered target (required for bodyweight,
    //    optional for Katch — kept for goal-outcome tracking when provided).
    //  - Maintain: bodyweight tracks the latest logged weight; Katch has no target
    //    weight at all (the live weight drives the calculation), so it stores null
    //    instead of a snapshot that would surface as a confusing "Target weight".
    const targetWeightLbs =
      mode !== 'maintain'
        ? (targetWeight ?? null)
        : calorieBasis === 'katch'
          ? null
          : (latestWeightLbs ?? null);
    return {
      name: name || null,
      description: description || null,
      mode,
      targetWeightLbs,
      macroFats: Math.round(fats ?? 0),
      macroCarbs: Math.round(carbs ?? 0),
      macroProtein: Math.round(protein ?? 0),
      startDate: startIso,
      endDate: endIso,
      // Body-comp is sent only for a Katch goal; a bodyweight goal clears both (R6).
      calorieBasis,
      bodyFatPct: calorieBasis === 'katch' ? bodyFatPct : null,
      activityLevel: calorieBasis === 'katch' ? activityLevel : null,
      mealSlots: slots.map(({ name: slotName, ingredients }) => ({ name: slotName, ingredients })),
    };
  }

  async function submit(trim?: SubmitTrim) {
    setError(null);
    // Target weight is required only for a bodyweight Cut/Lean Gain goal; Katch
    // derives its weight from the latest logged weight, so it stays optional (#63).
    if (
      mode !== 'maintain' &&
      calorieBasis === 'bodyweight' &&
      (targetWeight == null || targetWeight <= 0)
    ) {
      setError('Target weight is required for cut and lean gain goals.');
      return;
    }
    // R6/AE4: a Katch goal must carry both body-comp inputs before it can save.
    if (calorieBasis === 'katch' && (bodyFatPct == null || activityLevel == null)) {
      setError('Body fat and activity level are required for the Katch-McArdle basis.');
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
      // An overlap is resolvable by trimming the single overlapping goal: offer
      // the trim, and once the user confirms (trim is set) let it through — the
      // trim is applied before the create in onSubmit.
      if (violation?.code === 'overlap' && !trim) {
        const trimmable = findTrimmableActiveGoal(candidate, otherGoals);
        if (trimmable) {
          setPendingTrim({ goalId: trimmable.goal.id, endDate: trimmable.trimmedEndDate });
          return;
        }
      }
      if (violation && !(violation.code === 'overlap' && trim)) {
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
      {mode === 'maintain' ? null : (
        <NumberInput
          label={calorieBasis === 'katch' ? 'Target weight (lb, optional)' : 'Target weight (lb)'}
          value={targetWeight}
          onChange={setTargetWeight}
        />
      )}
      <HelperText>
        {mode === 'maintain' ? 'Maintain target tracks your latest logged weight: ' : null}
        {mode === 'maintain' ? null : 'Targets use your latest logged weight: '}
        {latestWeightLbs != null ? `${latestWeightLbs} lb` : `${FALLBACK_WEIGHT_LBS} lb (none yet)`}
        .
      </HelperText>

      {/* Calorie basis (#63 R25). Bodyweight keeps the multiplier; Katch reveals the
          body-comp inputs. Both bases show a live breakdown below (R27/R28). */}
      <RadioGroup
        name="goal-calorie-basis"
        label="Calorie basis"
        value={calorieBasis}
        options={[
          { value: 'bodyweight', label: 'Bodyweight multiplier' },
          { value: 'katch', label: 'Katch-McArdle (body composition)' },
        ]}
        onChange={(v) => setCalorieBasis(v)}
      />
      {calorieBasis === 'katch' ? (
        <>
          <BodyCompFields
            bodyFatPct={bodyFatPct}
            activityLevel={activityLevel}
            onBodyFatChange={setBodyFatPct}
            onActivityChange={setActivityLevel}
          />
          {katchReady && bodyFatPct != null && activityLevel != null ? (
            <KatchBreakdownPanel
              weightLbs={basisWeight}
              bodyFatPct={bodyFatPct}
              activityLevel={activityLevel}
              mode={mode}
              finalCalories={estimatedCalories}
            />
          ) : (
            <HelperText>
              Pick a body fat % and activity level to see the calorie breakdown.
            </HelperText>
          )}
        </>
      ) : (
        <BodyweightBreakdownPanel
          weightLbs={basisWeight}
          hasLoggedWeight={latestWeightLbs != null}
          mode={mode}
          finalCalories={estimatedCalories}
        />
      )}

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
      {slots.map((slot, i) => (
        <ListRow
          key={slot.id}
          title={
            <Input
              value={slot.name}
              aria-label={`Meal slot ${i + 1} name`}
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
              className="h-11"
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
        className="h-11"
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

// Goals command center (#56): timeline planner + selected-goal detail / inline
// Add Goal, inside the standard app shell with Execute/Goals nav.
export default function GoalsPage() {
  return (
    <AnalyticsScope properties={{ page: 'Goals' }}>
      <GoalsTemplate
        heading={{
          title: 'Goals',
          navLinks: APP_NAV_LINKS,
          renderNavLink: renderRouterNavLink,
          rightContent: <HeaderControls />,
        }}
      >
        <GoalsPlanner />
      </GoalsTemplate>
    </AnalyticsScope>
  );
}
