import { AppDialog } from './AppDialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AppDialog open={open} title={title} onClose={onCancel}>
      <p className="confirm-dialog__message">{message}</p>
      <div className="button-row">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="button button--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </AppDialog>
  );
}
