import React from 'react';

interface Props {
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: Props): React.JSX.Element {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
        padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 8px 32px var(--shadow)',
      }}>
        <h3 style={{ marginBottom: 12, fontSize: 15 }}>{title}</h3>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 20 }}>{body}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={BTN_SECONDARY}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ ...BTN_SECONDARY, background: danger ? 'var(--danger)' : 'var(--accent)', color: 'var(--bg)', borderColor: 'transparent' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const BTN_SECONDARY: React.CSSProperties = {
  padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
  background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)',
};
