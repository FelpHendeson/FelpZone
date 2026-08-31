import { useEffect, useId, useRef, type ReactNode } from 'react';

interface AppDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function AppDialog({ open, title, onClose, children }: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) {
      return;
    }

    if (open && !node.open) {
      node.showModal();
    }

    if (!open && node.open) {
      node.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="app-dialog__panel">
        <div className="app-dialog__header">
          <h2 id={titleId} className="app-dialog__title">
            {title}
          </h2>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="app-dialog__body">{children}</div>
      </div>
    </dialog>
  );
}
