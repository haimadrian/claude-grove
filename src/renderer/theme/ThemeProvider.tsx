import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '../../shared/types';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  setting: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setting: 'system' });

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  setting: Theme;
  children: React.ReactNode;
}

export function ThemeProvider({ setting, children }: ThemeProviderProps): React.JSX.Element {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => resolveTheme(setting));

  useEffect(() => {
    if (setting !== 'system') {
      setTheme(setting);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (): void => setTheme(mq.matches ? 'dark' : 'light');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [setting]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setting }}>{children}</ThemeContext.Provider>;
}

function resolveTheme(setting: Theme): 'light' | 'dark' {
  if (setting === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return setting;
}
