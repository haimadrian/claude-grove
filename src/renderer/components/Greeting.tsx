import React, { useEffect, useState } from 'react';

interface GreetingCopy {
  label: string;
  emoji: string;
  line: string;
}

function greetingForHour(hour: number): GreetingCopy {
  if (hour >= 5 && hour <= 11) {
    return { label: 'Good morning', emoji: '☀️', line: 'Grab a coffee and rule the forest.' };
  }
  if (hour >= 12 && hour <= 16) {
    return {
      label: 'Good afternoon',
      emoji: '🌳',
      line: 'Time to tend the branches and grow the grove.',
    };
  }
  if (hour >= 17 && hour <= 20) {
    return {
      label: 'Good evening',
      emoji: '🌇',
      line: 'Wrap up your worktrees before the forest goes dark.',
    };
  }
  return { label: 'Good night', emoji: '🌙', line: 'Let the branches rest until sunrise.' };
}

export function Greeting(): React.JSX.Element | null {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    window.api.user.getFirstName().then(setFirstName);
  }, []);

  if (firstName === null) return null;

  const { label, emoji, line } = greetingForHour(new Date().getHours());

  return (
    <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {label}, {firstName}! {emoji} {line}
    </span>
  );
}
