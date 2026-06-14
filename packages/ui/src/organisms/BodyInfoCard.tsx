import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { NumberInput } from '../atoms/NumberInput';
import { WarningText } from '../atoms/WarningText';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

export type BodyInfoCardProps = {
  saved?: boolean;
  weightLbs: number | null;
  heightInches: number | null;
  weightError: string;
  onWeightChange: (n: number | null) => void;
  onHeightChange: (n: number | null) => void;
  onWeightBlur: () => void;
  onHeightBlur: () => void;
};

export function BodyInfoCard(props: BodyInfoCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'BodyInfoCard' }}>
      <SectionCard title="Body Info" saved={props.saved}>
        <div className={recipes.grid.two}>
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
