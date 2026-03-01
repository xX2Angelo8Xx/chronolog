/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    // Database operations
    db: {
      query: (sql: string, params?: any[]) => Promise<any[]>;
      run: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>;
      get: (sql: string, params?: any[]) => Promise<any>;
    };
    // App operations
    app: {
      getVersion: () => Promise<string>;
      getPath: (name: string) => Promise<string>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
    };
    // Tray operations
    tray: {
      updateTimer: (data: { project: string; elapsed: string; isRunning: boolean }) => void;
    };
    // Theme
    theme: {
      get: () => Promise<'light' | 'dark' | 'system'>;
      set: (theme: 'light' | 'dark' | 'system') => void;
      onChanged: (callback: (theme: 'dark' | 'light') => void) => () => void;
    };
    // Idle detection
    idle: {
      getIdleTime: () => Promise<number>;
      onIdleStateChanged: (callback: (state: 'active' | 'idle' | 'locked') => void) => () => void;
    };
    // Notifications
    notify: (title: string, body: string) => void;
    // Shell
    openExternal: (url: string) => void;
    // Data export/import
    data: {
      export: () => Promise<{ success: boolean; cancelled?: boolean; filePath?: string; stats?: any; error?: string }>;
      import: (mode: 'replace' | 'merge') => Promise<{ success: boolean; cancelled?: boolean; imported?: Record<string, number>; skipped?: Record<string, number>; errors?: string[]; error?: string }>;
      exportCSV: () => Promise<{ success: boolean; cancelled?: boolean; filePath?: string; count?: number; error?: string }>;
    };
    // Global shortcut events
    onToggleTimer: (callback: () => void) => () => void;
  };
}
