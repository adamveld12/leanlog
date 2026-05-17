import type { PropsWithChildren } from 'react';
import { Button } from './Button';

type ModalProps = PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>;

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="ll-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ll-modal">
        <div className="ll-modal-head">
          <h3 className="ll-modal-title">{title}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="ll-modal-body">{children}</div>
      </div>
    </div>
  );
}
