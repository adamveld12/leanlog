import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Field } from '../atoms/Field';
import { HelperText } from '../atoms/HelperText';
import { Image } from '../atoms/Image';
import { SectionHeading } from '../atoms/SectionHeading';
import { Select } from '../atoms/Select';
import { Text } from '../atoms/Text';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

// One photo plus the stats pinned to its day. `src` is a resolved (auth-proxied)
// object URL; null renders an empty tile while it loads or when absent. `weight`
// and `vTaper` are pre-formatted and omitted (not zeroed) when missing (R11/R14).
export type ProgressPhotoView = {
  src?: string | null;
  alt: string;
  caption: string;
  weight?: string | null;
  vTaper?: string | null;
};

export type ProgressPosePanel = {
  /** Stable key, e.g. "front". */
  pose: string;
  /** Display label, e.g. "Front". */
  poseLabel: string;
  // empty: no photos yet (prompt). single: one photo (no delta). compared: two.
  state: 'empty' | 'single' | 'compared';
  emptyPrompt: string;
  baseline?: ProgressPhotoView | null;
  latest?: ProgressPhotoView | null;
  // Headline change, shown only when compared. Null parts are omitted (R11/R13).
  headline?: { elapsed: string; weightDelta?: string | null; vTaperDelta?: string | null };
  // Logged photo days selectable as the baseline (R15); picker hidden when < 2.
  baselineOptions?: { value: string; label: string }[];
  // Selected baseline date, or null for the default (earliest).
  selectedBaseline?: string | null;
  onPickBaseline?: (date: string | null) => void;
};

export type ProgressComparisonCardProps = {
  title?: string;
  panels: ProgressPosePanel[];
};

function statLine(view: ProgressPhotoView): string | null {
  const parts = [view.weight, view.vTaper ? `v-taper ${view.vTaper}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function PhotoTile({ view }: { view: ProgressPhotoView }) {
  const stats = statLine(view);
  return (
    <div className={recipes.stack.xs}>
      <Text as="span" variant="meta">
        {view.caption}
      </Text>
      <div
        className={cn(
          recipes.radius.control,
          recipes.surface.card,
          recipes.stack.centerBox,
          'aspect-square w-full overflow-hidden',
        )}
      >
        {view.src ? (
          <Image src={view.src} alt={view.alt} />
        ) : (
          <HelperText as="p">No photo</HelperText>
        )}
      </div>
      {stats ? (
        <Text as="span" variant="meta">
          {stats}
        </Text>
      ) : null}
    </div>
  );
}

function BaselinePicker({ panel }: { panel: ProgressPosePanel }) {
  const options = panel.baselineOptions ?? [];
  if (options.length < 2 || !panel.onPickBaseline) return null;
  const onPick = panel.onPickBaseline;
  return (
    <Field label="Baseline">
      <Select
        name={`baseline-${panel.pose}`}
        value={panel.selectedBaseline ?? ''}
        onChange={(e) => onPick(e.target.value || null)}
      >
        <option value="">Earliest (default)</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function PosePanelView({ panel }: { panel: ProgressPosePanel }) {
  return (
    <div className={recipes.stack.sm}>
      <SectionHeading noMargin>{panel.poseLabel}</SectionHeading>

      {panel.state === 'empty' ? (
        <HelperText as="p">{panel.emptyPrompt}</HelperText>
      ) : panel.state === 'single' && panel.latest ? (
        <>
          <div className={recipes.grid.two}>
            <PhotoTile view={panel.latest} />
          </div>
          <HelperText as="p">{`Log another ${panel.poseLabel.toLowerCase()} photo to see your change.`}</HelperText>
        </>
      ) : panel.state === 'compared' && panel.baseline && panel.latest ? (
        <>
          {panel.headline ? (
            <div className={cn(recipes.stack.row, 'flex-wrap')}>
              <Text as="span" variant="body" className="font-semibold">
                {panel.headline.elapsed}
              </Text>
              {panel.headline.weightDelta ? (
                <Text as="span" variant="meta">
                  {panel.headline.weightDelta}
                </Text>
              ) : null}
              {panel.headline.vTaperDelta ? (
                <Text as="span" variant="meta">
                  {`v-taper ${panel.headline.vTaperDelta}`}
                </Text>
              ) : null}
            </div>
          ) : null}
          <div className={recipes.grid.two}>
            <PhotoTile view={panel.baseline} />
            <PhotoTile view={panel.latest} />
          </div>
          <BaselinePicker panel={panel} />
        </>
      ) : null}
    </div>
  );
}

// The automatic latest-vs-baseline progress-photo comparison, per pose, shown in
// the Statistics area beside the v-taper north star (#69, R12–R16). Presentational
// only: the app resolves auth-proxied photo URLs and pre-formats every stat/delta,
// so this card never touches storage or numbers.
export function ProgressComparisonCard({
  title = 'Progress Photos',
  panels,
}: ProgressComparisonCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'ProgressComparisonCard' }}>
      <SectionCard title={title}>
        <div className={recipes.stack.lg}>
          {panels.map((panel) => (
            <PosePanelView key={panel.pose} panel={panel} />
          ))}
        </div>
      </SectionCard>
    </AnalyticsScope>
  );
}
