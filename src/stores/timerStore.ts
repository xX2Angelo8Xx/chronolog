import { create } from 'zustand';
import type { TimerStatus, BreakType, TimeEntry, Break } from '@/types';
import * as dbService from '@/services/database';

interface TimerState {
  status: TimerStatus;
  currentEntry: TimeEntry | null;
  currentBreak: Break | null;
  elapsedSeconds: number;
  breakElapsedSeconds: number;
  selectedJobId: string | null;
  selectedProjectId: string | null;
  selectedCategoryId: string | null;
  note: string;

  // Actions
  startTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  startBreak: (type: BreakType) => Promise<void>;
  endBreak: () => Promise<void>;
  setSelectedJob: (id: string | null) => void;
  setSelectedProject: (id: string | null) => void;
  setSelectedCategory: (id: string | null) => void;
  setNote: (note: string) => void;
  tick: () => void;
  loadRunningEntry: () => Promise<void>;
  toggleTimer: () => Promise<void>;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  status: 'idle',
  currentEntry: null,
  currentBreak: null,
  elapsedSeconds: 0,
  breakElapsedSeconds: 0,
  selectedJobId: null,
  selectedProjectId: null,
  selectedCategoryId: null,
  note: '',

  startTimer: async () => {
    const state = get();
    if (!state.selectedJobId) return;

    const now = new Date().toISOString();
    const entry = await dbService.createTimeEntry({
      job_id: state.selectedJobId,
      project_id: state.selectedProjectId,
      category_id: state.selectedCategoryId,
      start_time: now,
      note: state.note || undefined,
      is_manual: false,
      is_running: true,
    });

    set({
      status: 'running',
      currentEntry: entry,
      elapsedSeconds: 0,
    });

    // Update tray
    window.electronAPI.tray.updateTimer({
      project: entry.project_name || entry.job_name || 'Timer',
      elapsed: '00:00:00',
      isRunning: true,
    });

    // Update streak and add XP
    const today = new Date().toISOString().split('T')[0];
    await dbService.updateStreak(today);
    await dbService.addXP(5);
  },

  stopTimer: async () => {
    const state = get();
    if (!state.currentEntry) return;

    // End any active break first
    if (state.currentBreak) {
      await get().endBreak();
    }

    const now = new Date().toISOString();
    const durationMinutes = state.elapsedSeconds / 60;

    await dbService.updateTimeEntry(state.currentEntry.id, {
      end_time: now,
      duration_minutes: durationMinutes,
      is_running: 0,
      note: state.note || undefined,
    });

    set({
      status: 'idle',
      currentEntry: null,
      currentBreak: null,
      elapsedSeconds: 0,
      breakElapsedSeconds: 0,
      note: '',
    });

    // Update tray
    window.electronAPI.tray.updateTimer({
      project: '',
      elapsed: '',
      isRunning: false,
    });

    // Add XP for completing a session
    await dbService.addXP(10);
  },

  startBreak: async (type: BreakType) => {
    const state = get();
    if (!state.currentEntry || state.status !== 'running') return;

    const now = new Date().toISOString();
    const brk = await dbService.createBreak({
      time_entry_id: state.currentEntry.id,
      start_time: now,
      break_type: type,
    });

    set({
      status: 'paused',
      currentBreak: brk,
      breakElapsedSeconds: 0,
    });
  },

  endBreak: async () => {
    const state = get();
    if (!state.currentBreak) return;

    const now = new Date().toISOString();
    await dbService.endBreak(state.currentBreak.id, now);

    set({
      status: 'running',
      currentBreak: null,
      breakElapsedSeconds: 0,
    });
  },

  setSelectedJob: (id) => set({ selectedJobId: id, selectedProjectId: null }),
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  setSelectedCategory: (id) => set({ selectedCategoryId: id }),
  setNote: (note) => set({ note }),

  tick: () => {
    const state = get();
    if (state.status === 'running') {
      const newElapsed = state.elapsedSeconds + 1;
      set({ elapsedSeconds: newElapsed });

      // Update tray every 10 seconds
      if (newElapsed % 10 === 0 && state.currentEntry) {
        const h = Math.floor(newElapsed / 3600);
        const m = Math.floor((newElapsed % 3600) / 60);
        const s = newElapsed % 60;
        const elapsed = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        window.electronAPI.tray.updateTimer({
          project: state.currentEntry.project_name || state.currentEntry.job_name || 'Timer',
          elapsed,
          isRunning: true,
        });
      }
    } else if (state.status === 'paused') {
      set({ breakElapsedSeconds: state.breakElapsedSeconds + 1 });
    }
  },

  loadRunningEntry: async () => {
    const entry = await dbService.getRunningEntry();
    if (entry) {
      const start = new Date(entry.start_time);
      const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
      const activeBreak = await dbService.getActiveBreak(entry.id);

      set({
        status: activeBreak ? 'paused' : 'running',
        currentEntry: entry,
        currentBreak: activeBreak,
        elapsedSeconds: elapsed,
        selectedJobId: entry.job_id,
        selectedProjectId: entry.project_id,
        selectedCategoryId: entry.category_id,
        note: entry.note || '',
      });
    }
  },

  toggleTimer: async () => {
    const state = get();
    if (state.status === 'idle') {
      await state.startTimer();
    } else if (state.status === 'running' || state.status === 'paused') {
      await state.stopTimer();
    }
  },
}));
