import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppStore } from '@/stores/appStore';
import * as dbService from '@/services/database';
import i18n from '@/i18n';

// Mock the database service module
vi.mock('@/services/database', () => ({
  setSetting: vi.fn(),
  getSettings: vi.fn(),
}));

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

const initialState = () => ({
  currentPage: 'dashboard' as const,
  theme: 'system' as const,
  resolvedTheme: 'light' as const,
  language: 'de',
  settings: {},
  isSidebarCollapsed: false,
  isCommandPaletteOpen: false,
});

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState(initialState());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Initial state ====================

  describe('initial state', () => {
    it('has correct default values', () => {
      useAppStore.setState(initialState());
      const state = useAppStore.getState();

      expect(state.currentPage).toBe('dashboard');
      expect(state.theme).toBe('system');
      expect(state.resolvedTheme).toBe('light');
      expect(state.language).toBe('de');
      expect(state.settings).toEqual({});
      expect(state.isSidebarCollapsed).toBe(false);
      expect(state.isCommandPaletteOpen).toBe(false);
    });
  });

  // ==================== setPage ====================

  describe('setPage', () => {
    it('changes the current page', () => {
      useAppStore.getState().setPage('settings');
      expect(useAppStore.getState().currentPage).toBe('settings');
    });

    it('can switch between different pages', () => {
      useAppStore.getState().setPage('analytics');
      expect(useAppStore.getState().currentPage).toBe('analytics');

      useAppStore.getState().setPage('dashboard');
      expect(useAppStore.getState().currentPage).toBe('dashboard');
    });
  });

  // ==================== toggleSidebar ====================

  describe('toggleSidebar', () => {
    it('toggles sidebar from collapsed to expanded', () => {
      useAppStore.setState({ isSidebarCollapsed: false });

      useAppStore.getState().toggleSidebar();

      expect(useAppStore.getState().isSidebarCollapsed).toBe(true);
    });

    it('toggles sidebar from expanded to collapsed', () => {
      useAppStore.setState({ isSidebarCollapsed: true });

      useAppStore.getState().toggleSidebar();

      expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
    });

    it('toggles back and forth correctly', () => {
      expect(useAppStore.getState().isSidebarCollapsed).toBe(false);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarCollapsed).toBe(true);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
    });
  });

  // ==================== toggleCommandPalette ====================

  describe('toggleCommandPalette', () => {
    it('toggles command palette open state', () => {
      expect(useAppStore.getState().isCommandPaletteOpen).toBe(false);

      useAppStore.getState().toggleCommandPalette();
      expect(useAppStore.getState().isCommandPaletteOpen).toBe(true);

      useAppStore.getState().toggleCommandPalette();
      expect(useAppStore.getState().isCommandPaletteOpen).toBe(false);
    });
  });

  // ==================== setTheme ====================

  describe('setTheme', () => {
    it('changes theme in the store', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      await useAppStore.getState().setTheme('dark');

      expect(useAppStore.getState().theme).toBe('dark');
    });

    it('calls electronAPI theme.set', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      await useAppStore.getState().setTheme('dark');

      expect((window as any).electronAPI.theme.set).toHaveBeenCalledWith('dark');
    });

    it('persists theme to database', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      await useAppStore.getState().setTheme('light');

      expect(dbService.setSetting).toHaveBeenCalledWith('theme', 'light');
    });

    it('supports all theme modes', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      for (const theme of ['light', 'dark', 'system'] as const) {
        await useAppStore.getState().setTheme(theme);
        expect(useAppStore.getState().theme).toBe(theme);
      }
    });
  });

  // ==================== setResolvedTheme ====================

  describe('setResolvedTheme', () => {
    it('sets resolved theme to light', () => {
      useAppStore.getState().setResolvedTheme('light');
      expect(useAppStore.getState().resolvedTheme).toBe('light');
    });

    it('sets resolved theme to dark', () => {
      useAppStore.getState().setResolvedTheme('dark');
      expect(useAppStore.getState().resolvedTheme).toBe('dark');
    });
  });

  // ==================== setLanguage ====================

  describe('setLanguage', () => {
    it('changes language in the store', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      await useAppStore.getState().setLanguage('en');

      expect(useAppStore.getState().language).toBe('en');
    });

    it('calls i18n.changeLanguage', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      await useAppStore.getState().setLanguage('en');

      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    });

    it('persists language to database', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      await useAppStore.getState().setLanguage('en');

      expect(dbService.setSetting).toHaveBeenCalledWith('language', 'en');
    });
  });

  // ==================== loadSettings ====================

  describe('loadSettings', () => {
    it('loads settings from DB and applies theme + language', async () => {
      vi.mocked(dbService.getSettings).mockResolvedValue({
        theme: 'dark',
        language: 'en',
        other_setting: 'value',
      });

      await useAppStore.getState().loadSettings();

      const state = useAppStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.language).toBe('en');
      expect(state.settings).toEqual({
        theme: 'dark',
        language: 'en',
        other_setting: 'value',
      });
      expect((window as any).electronAPI.theme.set).toHaveBeenCalledWith('dark');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    });

    it('uses defaults when settings are missing', async () => {
      vi.mocked(dbService.getSettings).mockResolvedValue({});

      await useAppStore.getState().loadSettings();

      const state = useAppStore.getState();
      expect(state.theme).toBe('system');
      expect(state.language).toBe('de');
    });
  });

  // ==================== updateSetting ====================

  describe('updateSetting', () => {
    it('saves a setting and updates the local settings map', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);

      useAppStore.setState({ settings: { existing: 'val' } });

      await useAppStore.getState().updateSetting('newKey', 'newVal');

      expect(dbService.setSetting).toHaveBeenCalledWith('newKey', 'newVal');
      expect(useAppStore.getState().settings).toEqual({
        existing: 'val',
        newKey: 'newVal',
      });
    });

    it('overwrites an existing setting', async () => {
      vi.mocked(dbService.setSetting).mockResolvedValue(undefined);
      useAppStore.setState({ settings: { myKey: 'old' } });

      await useAppStore.getState().updateSetting('myKey', 'new');

      expect(useAppStore.getState().settings.myKey).toBe('new');
    });
  });
});
