import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { WarningText } from '../atoms/WarningText';
import { AnalyticsScope } from '../analytics';
import { Modal } from '../molecules/Modal';
import { recipes } from '../styles/recipes';

export type ScanField = {
  label: string;
  current: number | string;
  proposed: number | string;
  unit?: string;
};

export type ScanReviewModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  onRetake?: () => void;
  canAccept?: boolean;
  blockReason?: string;
  warning?: string;
  notes?: string[];
  fields: ScanField[];
  acceptLabel?: string;
  onSaveToDatabase?: () => void;
  canSaveToDatabase?: boolean;
  saveToDatabaseBlockReason?: string;
};

export function ScanReviewModal({
  open,
  onClose,
  onAccept,
  onRetake,
  canAccept = true,
  blockReason,
  warning,
  notes,
  fields,
  acceptLabel = 'Apply',
  onSaveToDatabase,
  canSaveToDatabase,
  saveToDatabaseBlockReason,
}: ScanReviewModalProps) {
  return (
    <AnalyticsScope properties={{ organism: 'ScanReviewModal' }}>
      <Modal open={open} title="Review nutrition scan" onClose={onClose}>
        <HelperText as="p">Compare current values with scanned values before applying.</HelperText>

        {fields.map((field) => (
          <HelperText as="p" key={field.label}>
            {field.label}: {field.current} → {field.proposed}
            {field.unit ?? ''}
          </HelperText>
        ))}

        {notes && notes.length > 0 ? <HelperText as="p">{notes.join(' ')}</HelperText> : null}

        {warning ? <WarningText>{warning}</WarningText> : null}

        {!canAccept && blockReason ? <WarningText>{blockReason}</WarningText> : null}

        {onSaveToDatabase && !canSaveToDatabase && saveToDatabaseBlockReason ? (
          <WarningText>{saveToDatabaseBlockReason}</WarningText>
        ) : null}

        <div className={recipes.stack.actions}>
          {onRetake ? (
            <Button variant="ghost" size="sm" onClick={onRetake}>
              Retake photo
            </Button>
          ) : null}
          {onSaveToDatabase ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSaveToDatabase}
              disabled={canSaveToDatabase === false}
            >
              Apply and save to database
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onAccept} disabled={!canAccept}>
            {acceptLabel}
          </Button>
        </div>
      </Modal>
    </AnalyticsScope>
  );
}
