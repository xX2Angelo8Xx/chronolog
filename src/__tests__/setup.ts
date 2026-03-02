import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Force UTC timezone for consistent date tests
process.env.TZ = 'UTC';

// Mock window.electronAPI for all tests
const mockElectronAPI = {
  db: {
    query: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ changes: 0, lastInsertRowid: 0 }),
    get: vi.fn().mockResolvedValue(null),
  },
  app: {
    getVersion: vi.fn().mockResolvedValue('1.0.0'),
    getPath: vi.fn().mockResolvedValue('/tmp'),
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
  },
  tray: {
    updateTimer: vi.fn(),
  },
  theme: {
    get: vi.fn().mockResolvedValue('system'),
    set: vi.fn(),
    onChanged: vi.fn().mockReturnValue(() => {}),
  },
  notify: vi.fn(),
  openExternal: vi.fn(),
  data: {
    export: vi.fn().mockResolvedValue({ success: true }),
    import: vi.fn().mockResolvedValue({ success: true }),
    exportCSV: vi.fn().mockResolvedValue({ success: true }),
  },
  onToggleTimer: vi.fn().mockReturnValue(() => {}),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
