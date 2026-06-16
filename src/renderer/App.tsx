import React, { useEffect, useState } from 'react';
import type { Theme } from '../shared/types';
import { ThemeProvider } from './theme/ThemeProvider';

export function App(): React.JSX.Element {
  const [themeSetting, setThemeSetting] = useState<Theme>('system');

  useEffect(() => {
    window.api.settings.get().then((s) => setThemeSetting(s.theme));
  }, []);

  return (
    <ThemeProvider setting={themeSetting}>
      <div style={{ padding: '2rem' }}>Claude Grove</div>
    </ThemeProvider>
  );
}
