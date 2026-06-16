import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import log from 'electron-log/main.js';

function resolveLogsDir(): string {
  try {
    return path.join(app.getPath('userData'), 'logs');
  } catch {
    return path.join(process.cwd(), 'logs');
  }
}

const logsDir = resolveLogsDir();

log.transports.file.resolvePathFn = () => path.join(logsDir, 'main.log');
log.transports.file.maxSize = 5 * 1024 * 1024;

log.transports.file.archiveLogFn = (oldLogFile) => {
  try {
    const file = oldLogFile.toString();
    const dir = path.dirname(file);
    const base = path.basename(file, path.extname(file));
    const ext = path.extname(file);
    const archive1 = path.join(dir, `${base}.old${ext}`);
    const archive2 = path.join(dir, `${base}.old.1${ext}`);
    if (fs.existsSync(archive2)) fs.unlinkSync(archive2);
    if (fs.existsSync(archive1)) fs.renameSync(archive1, archive2);
    fs.renameSync(file, archive1);
  } catch {
    // rotation failure falls back to electron-log default
  }
};

const debugMode = process.env.CG_DEBUG === '1';
log.transports.file.level = debugMode ? 'debug' : 'info';
log.transports.console.level = debugMode ? 'debug' : 'info';

try {
  log.initialize();
} catch {
  // ignore outside Electron (e.g. vitest)
}

log.transports.file.format = '[{iso}] [{level}] {text}';
log.transports.console.format = '[{iso}] [{level}] {text}';

try {
  log.info(`logger initialised file=${path.join(logsDir, 'main.log')} debug=${debugMode}`);
} catch {
  // ignore in some test harnesses
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    if (meta) log.info(message, meta);
    else log.info(message);
  },
  warn: (message: string, meta?: Record<string, unknown>): void => {
    if (meta) log.warn(message, meta);
    else log.warn(message);
  },
  error: (message: string, meta?: Record<string, unknown>): void => {
    if (meta) log.error(message, meta);
    else log.error(message);
  },
  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (meta) log.debug(message, meta);
    else log.debug(message);
  }
};

export type Logger = typeof logger;
