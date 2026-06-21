import React, { useEffect, useState, useCallback } from 'react';

export interface ToastItemData {
  id: string;
  message: string;
  type: 'ok' | 'error' | 'pending';
  subtitle?: string;
}

interface ToastItemProps {
  item: ToastItemData;
  onRemove: (id: string) => void;
}

function ToastItem({ item, onRemove }: ToastItemProps): React.JSX.Element {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (item.type === 'pending') return;
    setVisible(true);
    const t1 = setTimeout(() => setVisible(false), 3000);
    const t2 = setTimeout(() => onRemove(item.id), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [item.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPending = item.type === 'pending';

  return (
    <div style={{
      padding: '10px 16px', borderRadius: 8, fontSize: 13,
      ...(isPending
        ? { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--fg)' }
        : { background: item.type === 'ok' ? 'var(--ok)' : 'var(--danger)', color: 'var(--bg)' }),
      boxShadow: '0 4px 12px var(--shadow)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.3s',
      maxWidth: 360, minWidth: 200,
    }}>
      {item.message}
      {isPending && item.subtitle && (
        <div style={{
          marginTop: 3, fontSize: 11, color: 'var(--fg-muted)',
          maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.subtitle}
        </div>
      )}
      {isPending && (
        <div style={{
          marginTop: 8, height: 3, borderRadius: 2,
          background: 'var(--bg-tertiary)', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', height: '100%', width: '30%',
            background: 'var(--accent)', borderRadius: 2,
            animation: 'grove-progress 1.4s ease-in-out infinite',
          }} />
        </div>
      )}
    </div>
  );
}

interface ToastStackProps {
  items: ToastItemData[];
  onRemove: (id: string) => void;
}

export function ToastStack({ items, onRemove }: ToastStackProps): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
    }}>
      {items.map((item) => (
        <ToastItem key={item.id} item={item} onRemove={onRemove} />
      ))}
    </div>
  );
}

let _seq = 0;

export function useToast(): {
  items: ToastItemData[];
  showToast: (message: string, type?: 'ok' | 'error' | 'pending', resolveId?: string, subtitle?: string) => string;
  removeItem: (id: string) => void;
} {
  const [items, setItems] = useState<ToastItemData[]>([]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: 'ok' | 'error' | 'pending' = 'ok',
    resolveId?: string,
    subtitle?: string,
  ): string => {
    if (resolveId !== undefined) {
      setItems((prev) => prev.map((item) =>
        item.id === resolveId ? { ...item, message, type } : item,
      ));
      return resolveId;
    }
    const id = String(++_seq);
    setItems((prev) => [...prev, { id, message, type, ...(subtitle !== undefined ? { subtitle } : {}) }]);
    return id;
  }, []);

  return { items, showToast, removeItem };
}
