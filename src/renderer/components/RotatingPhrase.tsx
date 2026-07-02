import React, { useEffect, useState } from 'react';

const PHRASES = [
  'It works on my machine.',
  'git blame is not a personality trait.',
  'Ctrl+Z: the real undo button in life.',
  'Merge conflicts build character.',
  "There's no cloud, just someone else's worktree.",
  '99 little bugs in the code, 99 little bugs...',
  'Works in dev. Ship it. Pray.',
  'Semicolons: the silent heroes of syntax.',
  'TODO: fix this before it becomes legacy.',
  'Refactoring is just tidying with extra steps.',
  'One does not simply push to main.',
  'The best code is no code - good luck with that.',
  'A clean git log is a love letter to your team.',
  'Naming things is the hardest problem in CS.',
  'Coffee in, commits out.',
];

const ROTATE_INTERVAL_MS = 5500;

export function RotatingPhrase(): React.JSX.Element {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      key={index}
      style={{
        fontSize: 11,
        whiteSpace: 'nowrap',
        backgroundImage: 'linear-gradient(90deg, var(--muted) 35%, var(--fg) 50%, var(--muted) 65%)',
        backgroundSize: '250% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: 'grove-phrase-sweep 1.2s ease-out',
      } as React.CSSProperties}
    >
      {PHRASES[index]}
    </span>
  );
}
