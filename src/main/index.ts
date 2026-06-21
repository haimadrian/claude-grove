import { app, BrowserWindow, nativeImage } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { registerIpc } from './ipc';
import { loadWindowState, trackWindowState } from './windowState';
import { logger } from './logger';

// Augment PATH so execFile can find homebrew/nix/system binaries that aren't
// in the minimal PATH Electron inherits on macOS.
const EXTRA_PATHS = [
  '/opt/homebrew/bin',   // Apple Silicon Homebrew
  '/usr/local/bin',      // Intel Homebrew / nix
  '/opt/homebrew/sbin',
  '/usr/local/sbin',
];
for (const p of EXTRA_PATHS) {
  if (!process.env.PATH?.includes(p)) {
    process.env.PATH = `${p}:${process.env.PATH ?? ''}`;
  }
}

function createWindow(): void {
  const state = loadWindowState();
  const iconPath = join(__dirname, '../../build/icon.png');
  const icon = existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(state.x !== undefined && state.y !== undefined ? { x: state.x, y: state.y } : {}),
    ...(icon ? { icon } : {}),
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  trackWindowState(win);
  win.on('ready-to-show', () => win.show());
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc();
  logger.info('ipc: handlers registered, window opening');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => app.quit());
