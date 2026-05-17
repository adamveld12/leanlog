import type { PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>;

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="ll-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ll-modal">
        <div className="ll-modal-head">
          <h3>{title}</h3>
          <button onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
