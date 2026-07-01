import React from 'react';
import { Trees } from 'lucide-react';

const GROW_DELAYS = [0, 0.35, 0.7, 1.05]; // seconds, one per icon path

export function Logo(): React.JSX.Element {
  return (
    <span
      className="grove-logo"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
    >
      <style>{`
        .grove-logo svg path { transform-origin: bottom center; }
        .grove-logo:hover svg path:nth-child(1) { animation: grove-grow-path 0.6s ease-out both; animation-delay: ${GROW_DELAYS[0]}s; }
        .grove-logo:hover svg path:nth-child(2) { animation: grove-grow-path 0.6s ease-out both; animation-delay: ${GROW_DELAYS[1]}s; }
        .grove-logo:hover svg path:nth-child(3) { animation: grove-grow-path 0.6s ease-out both; animation-delay: ${GROW_DELAYS[2]}s; }
        .grove-logo:hover svg path:nth-child(4) { animation: grove-grow-path 0.6s ease-out both; animation-delay: ${GROW_DELAYS[3]}s; }
      `}</style>
      <Trees size={28} style={{ color: 'var(--accent)', flexShrink: 0 }} />
      <span style={{
        fontFamily: "'Bangers', cursive",
        fontSize: 34,
        letterSpacing: '0.08em',
        color: 'var(--fg)',
        WebkitTextStroke: '0.5px var(--accent)',
        textShadow: '2px 2px 0 var(--accent), 4px 4px 0 rgba(0,0,0,0.15)',
        lineHeight: 1,
      } as React.CSSProperties}>
        Claude Grove
      </span>
    </span>
  );
}
