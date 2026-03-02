import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    run: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params),
    get: (sql: string, params?: any[]) => ipcRenderer.invoke('db:get', sql, params),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
    isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  },
  tray: {
    updateTimer: (data: { project: string; elapsed: string; isRunning: boolean }) =>
      ipcRenderer.send('tray:updateTimer', data),
  },
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme: 'light' | 'dark' | 'system') => ipcRenderer.send('theme:set', theme),
    onChanged: (callback: (theme: 'dark' | 'light') => void) => {
      const handler = (_event: any, theme: 'dark' | 'light') => callback(theme);
      ipcRenderer.on('theme:changed', handler);
      return () => ipcRenderer.removeListener('theme:changed', handler);
    },
  },
  notify: (title: string, body: string) => ipcRenderer.send('notify', title, body),
  openExternal: (url: string) => ipcRenderer.send('shell:openExternal', url),

  // Auth
  auth: {
    hashPassword: (password: string) => ipcRenderer.invoke('auth:hashPassword', password),
    verifyPassword: (password: string, hash: string) => ipcRenderer.invoke('auth:verifyPassword', password, hash),
  },

  // Data export/import
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: (mode: 'replace' | 'merge') => ipcRenderer.invoke('data:import', mode),
    exportCSV: () => ipcRenderer.invoke('data:exportCSV'),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.send('updater:install'),
    onStatus: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
  },

  // Listen for global shortcut events
  onToggleTimer: (callback: () => void) => {
    ipcRenderer.on('shortcut:toggleTimer', callback);
    return () => ipcRenderer.removeListener('shortcut:toggleTimer', callback);
  },
});
