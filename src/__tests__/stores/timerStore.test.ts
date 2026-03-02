import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimerStore } from '@/stores/timerStore';
import { useUserStore } from '@/stores/userStore';
import * as dbService from '@/services/database';

// Mock the database service module
vi.mock('@/services/database', () => ({
  createTimeEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  updateStreak: vi.fn(),
  addXP: vi.fn(),
  createBreak: vi.fn(),
  endBreak: vi.fn(),
  getRunningEntry: vi.fn(),
  getActiveBreak: vi.fn(),
}));

// Test fixtures
const mockTimeEntry = (overrides: Partial<any> = {}) => ({
  id: 'entry-1',
  job_id: 'job-1',
  project_id: 'proj-1',
  category_id: 'cat-1',
  start_time: '2025-06-15T10:00:00.000Z',
  end_time: null,
  duration_minutes: null,
  note: null,
  is_manual: false,
  is_running: true,
  user_id: 'user-1',
  created_at: '2025-06-15T10:00:00.000Z',
  updated_at: '2025-06-15T10:00:00.000Z',
  job_name: 'Development',
  project_name: 'ChronoLog',
  ...overrides,
});

const mockBreak = (overrides: Partial<any> = {}) => ({
  id: 'break-1',
  time_entry_id: 'entry-1',
  start_time: '2025-06-15T11:00:00.000Z',
  end_time: null,
  break_type: 'coffee' as const,
  duration_minutes: null,
  is_active: true,
  created_at: '2025-06-15T11:00:00.000Z',
  ...overrides,
});

const initialState = () => ({
  status: 'idle' as const,
  currentEntry: null,
  currentBreak: null,
  elapsedSeconds: 0,
  breakElapsedSeconds: 0,
  selectedJobId: null,
  selectedProjectId: null,
  selectedCategoryId: null,
  note: '',
});

describe('timerStore', () => {
  beforeEach(() => {
    useTimerStore.setState(initialState());
    vi.clearAllMocks();

    // Ensure tray mock exists
    (window as any).electronAPI.tray = {
      updateTimer: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Initial state ====================

  describe('initial state', () => {
    it('has correct default values', () => {
      useTimerStore.setState(initialState());
      const state = useTimerStore.getState();

      expect(state.status).toBe('idle');
      expect(state.currentEntry).toBeNull();
      expect(state.currentBreak).toBeNull();
      expect(state.elapsedSeconds).toBe(0);
      expect(state.breakElapsedSeconds).toBe(0);
      expect(state.selectedJobId).toBeNull();
      expect(state.selectedProjectId).toBeNull();
      expect(state.selectedCategoryId).toBeNull();
      expect(state.note).toBe('');
    });
  });

  // ==================== startTimer ====================

  describe('startTimer', () => {
    it('does nothing when no job is selected', async () => {
      useTimerStore.setState({ selectedJobId: null });

      await useTimerStore.getState().startTimer();

      expect(useTimerStore.getState().status).toBe('idle');
      expect(dbService.createTimeEntry).not.toHaveBeenCalled();
    });

    it('creates a time entry and sets status to running', async () => {
      const entry = mockTimeEntry();
      vi.mocked(dbService.createTimeEntry).mockResolvedValue(entry);
      vi.mocked(dbService.updateStreak).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);

      // Set up userStore with a current user
      useUserStore.setState({
        currentUser: { id: 'user-1', name: 'test' } as any,
      });

      useTimerStore.setState({
        selectedJobId: 'job-1',
        selectedProjectId: 'proj-1',
        selectedCategoryId: 'cat-1',
        note: 'Working on tests',
      });

      await useTimerStore.getState().startTimer();

      const state = useTimerStore.getState();
      expect(state.status).toBe('running');
      expect(state.currentEntry).toEqual(entry);
      expect(state.elapsedSeconds).toBe(0);

      // Verify the DB call
      expect(dbService.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: 'job-1',
          project_id: 'proj-1',
          category_id: 'cat-1',
          is_manual: false,
          is_running: true,
          user_id: 'user-1',
        }),
      );
    });

    it('updates the system tray after starting', async () => {
      const entry = mockTimeEntry();
      vi.mocked(dbService.createTimeEntry).mockResolvedValue(entry);
      vi.mocked(dbService.updateStreak).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);
      useUserStore.setState({ currentUser: { id: 'user-1' } as any });
      useTimerStore.setState({ selectedJobId: 'job-1' });

      await useTimerStore.getState().startTimer();

      expect((window as any).electronAPI.tray.updateTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          elapsed: '00:00:00',
        }),
      );
    });

    it('calls updateStreak and addXP on start', async () => {
      vi.mocked(dbService.createTimeEntry).mockResolvedValue(mockTimeEntry());
      vi.mocked(dbService.updateStreak).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);
      useUserStore.setState({ currentUser: { id: 'user-1' } as any });
      useTimerStore.setState({ selectedJobId: 'job-1' });

      await useTimerStore.getState().startTimer();

      expect(dbService.updateStreak).toHaveBeenCalled();
      expect(dbService.addXP).toHaveBeenCalledWith(5);
    });

    it('passes null user_id when no user is logged in', async () => {
      vi.mocked(dbService.createTimeEntry).mockResolvedValue(mockTimeEntry());
      vi.mocked(dbService.updateStreak).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);
      useUserStore.setState({ currentUser: null });
      useTimerStore.setState({ selectedJobId: 'job-1' });

      await useTimerStore.getState().startTimer();

      expect(dbService.createTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null }),
      );
    });
  });

  // ==================== stopTimer ====================

  describe('stopTimer', () => {
    it('does nothing when there is no current entry', async () => {
      useTimerStore.setState({ currentEntry: null });

      await useTimerStore.getState().stopTimer();

      expect(dbService.updateTimeEntry).not.toHaveBeenCalled();
    });

    it('stops the timer and updates the time entry in the DB', async () => {
      const entry = mockTimeEntry();
      vi.mocked(dbService.updateTimeEntry).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);

      useTimerStore.setState({
        status: 'running',
        currentEntry: entry,
        elapsedSeconds: 120, // 2 minutes
        note: 'Finished work',
      });

      await useTimerStore.getState().stopTimer();

      const state = useTimerStore.getState();
      expect(state.status).toBe('idle');
      expect(state.currentEntry).toBeNull();
      expect(state.elapsedSeconds).toBe(0);
      expect(state.note).toBe('');

      expect(dbService.updateTimeEntry).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({
          is_running: 0,
          duration_minutes: 2, // 120 / 60
        }),
      );
    });

    it('ends active break before stopping', async () => {
      const entry = mockTimeEntry();
      const brk = mockBreak();
      vi.mocked(dbService.endBreak).mockResolvedValue(undefined);
      vi.mocked(dbService.updateTimeEntry).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);

      useTimerStore.setState({
        status: 'paused',
        currentEntry: entry,
        currentBreak: brk,
        elapsedSeconds: 300,
      });

      await useTimerStore.getState().stopTimer();

      expect(dbService.endBreak).toHaveBeenCalledWith('break-1', expect.any(String));
      expect(dbService.updateTimeEntry).toHaveBeenCalled();
    });

    it('updates tray to idle state after stopping', async () => {
      vi.mocked(dbService.updateTimeEntry).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);

      useTimerStore.setState({
        status: 'running',
        currentEntry: mockTimeEntry(),
        elapsedSeconds: 60,
      });

      await useTimerStore.getState().stopTimer();

      expect((window as any).electronAPI.tray.updateTimer).toHaveBeenCalledWith(
        expect.objectContaining({ isRunning: false }),
      );
    });

    it('awards XP on stop', async () => {
      vi.mocked(dbService.updateTimeEntry).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);

      useTimerStore.setState({
        status: 'running',
        currentEntry: mockTimeEntry(),
        elapsedSeconds: 60,
      });

      await useTimerStore.getState().stopTimer();

      expect(dbService.addXP).toHaveBeenCalledWith(10);
    });
  });

  // ==================== tick ====================

  describe('tick', () => {
    it('computes elapsedSeconds from wall-clock time when running', () => {
      const startMs = new Date('2025-06-15T10:00:00.000Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(startMs + 11_000);

      useTimerStore.setState({
        status: 'running',
        elapsedSeconds: 0,
        currentEntry: mockTimeEntry({ start_time: '2025-06-15T10:00:00.000Z' }),
      });

      useTimerStore.getState().tick();

      expect(useTimerStore.getState().elapsedSeconds).toBe(11);
      vi.restoreAllMocks();
    });

    it('does not increment elapsedSeconds when idle', () => {
      useTimerStore.setState({ status: 'idle', elapsedSeconds: 0 });

      useTimerStore.getState().tick();

      expect(useTimerStore.getState().elapsedSeconds).toBe(0);
    });

    it('computes breakElapsedSeconds from wall-clock time when paused', () => {
      const breakStartMs = new Date('2025-06-15T11:00:00.000Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(breakStartMs + 6_000);

      useTimerStore.setState({
        status: 'paused',
        breakElapsedSeconds: 0,
        currentBreak: mockBreak({ start_time: '2025-06-15T11:00:00.000Z' }),
      });

      useTimerStore.getState().tick();

      expect(useTimerStore.getState().breakElapsedSeconds).toBe(6);
      vi.restoreAllMocks();
    });

    it('updates tray every 10 seconds when running', () => {
      const startMs = new Date('2025-06-15T10:00:00.000Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(startMs + 10_000);

      useTimerStore.setState({
        status: 'running',
        elapsedSeconds: 0,
        currentEntry: mockTimeEntry({ start_time: '2025-06-15T10:00:00.000Z' }),
      });

      useTimerStore.getState().tick();

      expect((window as any).electronAPI.tray.updateTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          isRunning: true,
          elapsed: '00:00:10',
        }),
      );
      vi.restoreAllMocks();
    });

    it('does not update tray on non-10-second intervals', () => {
      const startMs = new Date('2025-06-15T10:00:00.000Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(startMs + 8_000);

      useTimerStore.setState({
        status: 'running',
        elapsedSeconds: 0,
        currentEntry: mockTimeEntry({ start_time: '2025-06-15T10:00:00.000Z' }),
      });

      useTimerStore.getState().tick();

      expect((window as any).electronAPI.tray.updateTimer).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  // ==================== setSelectedJob / setSelectedProject / setSelectedCategory / setNote ====================

  describe('selection setters', () => {
    it('setSelectedJob sets job ID and clears project', () => {
      useTimerStore.setState({ selectedProjectId: 'proj-1' });

      useTimerStore.getState().setSelectedJob('job-2');

      const state = useTimerStore.getState();
      expect(state.selectedJobId).toBe('job-2');
      expect(state.selectedProjectId).toBeNull();
    });

    it('setSelectedProject sets project ID', () => {
      useTimerStore.getState().setSelectedProject('proj-2');
      expect(useTimerStore.getState().selectedProjectId).toBe('proj-2');
    });

    it('setSelectedCategory sets category ID', () => {
      useTimerStore.getState().setSelectedCategory('cat-2');
      expect(useTimerStore.getState().selectedCategoryId).toBe('cat-2');
    });

    it('setNote sets the note', () => {
      useTimerStore.getState().setNote('Taking notes');
      expect(useTimerStore.getState().note).toBe('Taking notes');
    });
  });

  // ==================== startBreak ====================

  describe('startBreak', () => {
    it('creates a break and sets status to paused', async () => {
      const brk = mockBreak();
      vi.mocked(dbService.createBreak).mockResolvedValue(brk);

      useTimerStore.setState({
        status: 'running',
        currentEntry: mockTimeEntry(),
      });

      await useTimerStore.getState().startBreak('coffee');

      const state = useTimerStore.getState();
      expect(state.status).toBe('paused');
      expect(state.currentBreak).toEqual(brk);
      expect(state.breakElapsedSeconds).toBe(0);
    });

    it('does nothing when idle', async () => {
      useTimerStore.setState({ status: 'idle', currentEntry: null });

      await useTimerStore.getState().startBreak('lunch');

      expect(dbService.createBreak).not.toHaveBeenCalled();
    });
  });

  // ==================== endBreak ====================

  describe('endBreak', () => {
    it('ends the break and sets status back to running', async () => {
      vi.mocked(dbService.endBreak).mockResolvedValue(undefined);

      useTimerStore.setState({
        status: 'paused',
        currentBreak: mockBreak(),
        breakElapsedSeconds: 120,
      });

      await useTimerStore.getState().endBreak();

      const state = useTimerStore.getState();
      expect(state.status).toBe('running');
      expect(state.currentBreak).toBeNull();
      expect(state.breakElapsedSeconds).toBe(0);
    });

    it('does nothing when no active break exists', async () => {
      useTimerStore.setState({ currentBreak: null });

      await useTimerStore.getState().endBreak();

      expect(dbService.endBreak).not.toHaveBeenCalled();
    });
  });

  // ==================== loadRunningEntry ====================

  describe('loadRunningEntry', () => {
    it('restores running entry from DB', async () => {
      const entry = mockTimeEntry({
        start_time: new Date(Date.now() - 600_000).toISOString(), // 10 min ago
        note: 'WIP',
      });
      vi.mocked(dbService.getRunningEntry).mockResolvedValue(entry);
      vi.mocked(dbService.getActiveBreak).mockResolvedValue(null);

      await useTimerStore.getState().loadRunningEntry();

      const state = useTimerStore.getState();
      expect(state.status).toBe('running');
      expect(state.currentEntry).toEqual(entry);
      expect(state.elapsedSeconds).toBeGreaterThanOrEqual(599);
      expect(state.selectedJobId).toBe('job-1');
      expect(state.note).toBe('WIP');
    });

    it('restores paused state when there is an active break', async () => {
      const entry = mockTimeEntry();
      const brk = mockBreak();
      vi.mocked(dbService.getRunningEntry).mockResolvedValue(entry);
      vi.mocked(dbService.getActiveBreak).mockResolvedValue(brk);

      await useTimerStore.getState().loadRunningEntry();

      const state = useTimerStore.getState();
      expect(state.status).toBe('paused');
      expect(state.currentBreak).toEqual(brk);
    });

    it('does nothing when no running entry exists', async () => {
      vi.mocked(dbService.getRunningEntry).mockResolvedValue(null);

      await useTimerStore.getState().loadRunningEntry();

      expect(useTimerStore.getState().status).toBe('idle');
    });
  });

  // ==================== toggleTimer ====================

  describe('toggleTimer', () => {
    it('starts timer when idle', async () => {
      const entry = mockTimeEntry();
      vi.mocked(dbService.createTimeEntry).mockResolvedValue(entry);
      vi.mocked(dbService.updateStreak).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);
      useUserStore.setState({ currentUser: { id: 'user-1' } as any });
      useTimerStore.setState({ selectedJobId: 'job-1' });

      await useTimerStore.getState().toggleTimer();

      expect(useTimerStore.getState().status).toBe('running');
    });

    it('stops timer when running', async () => {
      vi.mocked(dbService.updateTimeEntry).mockResolvedValue(undefined);
      vi.mocked(dbService.addXP).mockResolvedValue(undefined);

      useTimerStore.setState({
        status: 'running',
        currentEntry: mockTimeEntry(),
        elapsedSeconds: 60,
      });

      await useTimerStore.getState().toggleTimer();

      expect(useTimerStore.getState().status).toBe('idle');
    });
  });
});
