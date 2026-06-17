import fs from 'node:fs';
import path from 'node:path';
import { app, screen, type BrowserWindow } from 'electron';

interface WindowState {
  width: number;
  height: number;
  x: number | undefined;
  y: number | undefined;
}

const DEFAULT: WindowState = { width: 1280, height: 820, x: undefined, y: undefined };

function statePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

export function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(statePath(), 'utf-8');
    const saved = JSON.parse(raw) as WindowState;
    // Validate position is still on a connected display
    if (saved.x !== undefined && saved.y !== undefined) {
      const onScreen = screen.getAllDisplays().some((d) => {
        const b = d.bounds;
        return saved.x! >= b.x && saved.y! >= b.y &&
               saved.x! < b.x + b.width && saved.y! < b.y + b.height;
      });
      if (!onScreen) {
        // Display no longer connected — keep size, reset position to center
        return { width: saved.width, height: saved.height, x: undefined, y: undefined };
      }
    }
    return saved;
  } catch {
    return DEFAULT;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function trackWindowState(win: BrowserWindow): void {
  const save = (): void => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (win.isDestroyed() || win.isMinimized() || win.isMaximized()) return;
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      try {
        fs.writeFileSync(statePath(), JSON.stringify({ width, height, x, y }, null, 2));
      } catch { /* ignore */ }
    }, 500);
  };
  win.on('resize', save);
  win.on('move', save);
}
