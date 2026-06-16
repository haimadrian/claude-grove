import React, { useEffect, useState } from 'react';

interface ToastProps { message: string; type: 'ok' | 'error'; onDone: () => void; }

export function Toast({ message, type, onDone }: ToastProps): React.JSX.Element {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>;
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      fadeTimer = setTimeout(onDone, 300);
    }, 3000);
    return () => { clearTimeout(dismissTimer); clearTimeout(fadeTimer); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      padding: '10px 16px', borderRadius: 8, fontSize: 13,
      background: type === 'ok' ? 'var(--ok)' : 'var(--danger)',
      color: 'var(--bg)', boxShadow: '0 4px 12px var(--shadow)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
      maxWidth: 360,
    }}>
      {message}
    </div>
  );
}

interface ToastState { message: string; type: 'ok' | 'error'; }

export function useToast(): {
  toast: ToastState | null;
  showToast: (message: string, type?: 'ok' | 'error') => void;
  clearToast: () => void;
} {
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, type: 'ok' | 'error' = 'ok'): void => setToast({ message, type });
  const clearToast = (): void => setToast(null);
  return { toast, showToast, clearToast };
}
