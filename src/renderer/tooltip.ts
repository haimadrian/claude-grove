// Global fast tooltip via [data-tip] attribute.
// Uses position:fixed so it escapes overflow:auto scroll containers.
// Replace title="" with data-tip="" on any element to get the 500ms tooltip.

let timer: ReturnType<typeof setTimeout> | null = null;
let el: HTMLDivElement | null = null;

function cleanup(): void {
  if (timer) { clearTimeout(timer); timer = null; }
  if (el) { el.remove(); el = null; }
}

function show(target: HTMLElement): void {
  const text = target.getAttribute('data-tip');
  if (!text) return;
  cleanup();
  timer = setTimeout(() => {
    const rect = target.getBoundingClientRect();
    el = document.createElement('div');
    el.className = 'grove-tip';
    el.textContent = text;
    Object.assign(el.style, {
      position: 'fixed',
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.top - 6}px`,
      transform: 'translate(-50%, -100%)',
      background: 'var(--bg-secondary)',
      color: 'var(--fg)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '4px 8px',
      fontSize: '11px',
      lineHeight: '1.5',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      zIndex: '99999',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      maxWidth: '320px',
      wordBreak: 'break-word',
    });
    document.body.appendChild(el);
  }, 500);
}

export function initTooltip(): void {
  document.addEventListener('mouseover', (e) => {
    const target = (e.target as Element).closest('[data-tip]') as HTMLElement | null;
    if (target) show(target);
    else cleanup();
  });
  document.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget as Element | null;
    const target = (e.target as Element).closest('[data-tip]') as HTMLElement | null;
    if (target && !target.contains(related)) cleanup();
  });
  document.addEventListener('scroll', cleanup, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cleanup(); });
}
