export const app = { getPath: () => '/tmp', getVersion: () => '0.0.0' };
export const ipcMain = { handle: () => {} };
export const ipcRenderer = { invoke: async () => {} };
export const shell = { openExternal: async () => {}, openPath: async () => '' };
export const dialog = { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) };
export const clipboard = { writeText: () => {} };
export const nativeTheme = { shouldUseDarkColors: false };
export default {};
