import { AlertTriangle, Check, X } from 'lucide-react';

export default function ConfirmModal({ open, title, message, confirmLabel = 'Yes, delete', cancelLabel = 'No, keep it', onConfirm, onCancel, danger = true }) {
  if (!open) return null;
  return (
    <div className="confirm-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div className="confirm-modal-icon"><AlertTriangle size={23}/></div>
        <h2 id="confirm-modal-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-no" onClick={onCancel}><X size={17}/> {cancelLabel}</button>
          <button type="button" className={danger ? 'confirm-modal-yes' : 'confirm-modal-ok'} onClick={onConfirm}><Check size={17}/> {confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
