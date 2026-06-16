const noop = (): void => {};
const log = { info: noop, warn: noop, error: noop, debug: noop, initialize: noop,
  transports: { file: { level: 'info', format: '', maxSize: 0, resolvePathFn: noop, archiveLogFn: noop },
    console: { level: 'info', format: '' } } };
export default log;
