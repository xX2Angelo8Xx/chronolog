import { create } from 'zustand';
import type { ThemeMode, NavPage } from '@/types';
import * as dbService from '@/services/database';
import i18n from '@/i18n';

interface AppState {
  currentPage: NavPage;
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  language: string;
  settings: Record<string, string>;
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;

  // Actions
  setPage: (page: NavPage) => void;
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  theme: 'system',
  resolvedTheme: 'light',
  language: 'de',
  settings: {},
  isSidebarCollapsed: false,
  isCommandPaletteOpen: false,

  setPage: (page) => set({ currentPage: page }),

  setTheme: async (theme) => {
    set({ theme });
    window.electronAPI.theme.set(theme);
    await dbService.setSetting('theme', theme);
  },

  setResolvedTheme: (theme) => set({ resolvedTheme: theme }),

  setLanguage: async (lang) => {
    set({ language: lang });
    i18n.changeLanguage(lang);
    await dbService.setSetting('language', lang);
  },

  loadSettings: async () => {
    const settings = await dbService.getSettings();
    const theme = (settings.theme as ThemeMode) || 'system';
    const language = settings.language || 'de';

    i18n.changeLanguage(language);
    window.electronAPI.theme.set(theme);

    set({ settings, theme, language });
  },

  updateSetting: async (key, value) => {
    await dbService.setSetting(key, value);
    const settings = { ...get().settings, [key]: value };
    set({ settings });
  },

  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen })),
}));
