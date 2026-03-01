import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUserStore } from '@/stores/userStore';
import * as dbService from '@/services/database';

// Mock the database service module
vi.mock('@/services/database', () => ({
  getUsers: vi.fn(),
  getUser: vi.fn(),
  loginUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  verifyPassword: vi.fn(),
  getActiveUser: vi.fn(),
  getSetting: vi.fn(),
}));

// Helpers
const mockUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  name: 'testuser',
  display_name: 'Test User',
  password_hash: 'hashed_pw',
  avatar_color: '#0078d4',
  is_active: 1,
  last_login_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const defaultUser = () => mockUser({
  id: 'default-user',
  name: 'default',
  password_hash: '',
});

describe('userStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useUserStore.setState({
      currentUser: null,
      users: [],
      isAuthenticated: false,
      isLoading: false,
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Ensure auth mock exists on window.electronAPI
    (window as any).electronAPI.auth = {
      hashPassword: vi.fn().mockResolvedValue('hashed_pw'),
      verifyPassword: vi.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== loadUsers ====================

  describe('loadUsers', () => {
    it('loads users from the database and sets them in the store', async () => {
      const users = [mockUser(), mockUser({ id: 'user-2', name: 'alice' })];
      vi.mocked(dbService.getUsers).mockResolvedValue(users);

      await useUserStore.getState().loadUsers();

      const state = useUserStore.getState();
      expect(state.users).toHaveLength(2);
      expect(state.users[0].id).toBe('user-1');
      expect(state.users[1].id).toBe('user-2');
      expect(dbService.getUsers).toHaveBeenCalledOnce();
    });

    it('maps is_active from integer to boolean', async () => {
      vi.mocked(dbService.getUsers).mockResolvedValue([
        mockUser({ is_active: 1 }),
        mockUser({ id: 'user-2', is_active: 0 }),
      ]);

      await useUserStore.getState().loadUsers();

      const state = useUserStore.getState();
      expect(state.users[0].is_active).toBe(true);
      expect(state.users[1].is_active).toBe(false);
    });

    it('handles empty user list', async () => {
      vi.mocked(dbService.getUsers).mockResolvedValue([]);

      await useUserStore.getState().loadUsers();

      expect(useUserStore.getState().users).toHaveLength(0);
    });
  });

  // ==================== login ====================

  describe('login', () => {
    it('authenticates user with correct password and sets currentUser', async () => {
      const user = mockUser();
      vi.mocked(dbService.getUser).mockResolvedValue(user);
      vi.mocked(dbService.loginUser).mockResolvedValue(undefined);
      (window as any).electronAPI.auth.hashPassword.mockResolvedValue('hashed_pw');

      const result = await useUserStore.getState().login('user-1', 'correct-password');

      expect(result).toBe(true);
      const state = useUserStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser).not.toBeNull();
      expect(state.currentUser!.id).toBe('user-1');
      expect(dbService.loginUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects login with wrong password', async () => {
      const user = mockUser({ password_hash: 'correct_hash' });
      vi.mocked(dbService.getUser).mockResolvedValue(user);
      (window as any).electronAPI.auth.hashPassword.mockResolvedValue('wrong_hash');

      const result = await useUserStore.getState().login('user-1', 'wrong-password');

      expect(result).toBe(false);
      const state = useUserStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.currentUser).toBeNull();
      expect(dbService.loginUser).not.toHaveBeenCalled();
    });

    it('allows default user with empty password hash', async () => {
      const user = defaultUser();
      vi.mocked(dbService.getUser).mockResolvedValue(user);
      vi.mocked(dbService.loginUser).mockResolvedValue(undefined);

      const result = await useUserStore.getState().login('default-user', '');

      expect(result).toBe(true);
      const state = useUserStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.currentUser!.id).toBe('default-user');
      // hashPassword should NOT be called for empty password_hash
      expect((window as any).electronAPI.auth.hashPassword).not.toHaveBeenCalled();
    });

    it('returns false when user is not found', async () => {
      vi.mocked(dbService.getUser).mockResolvedValue(null);

      const result = await useUserStore.getState().login('non-existent', 'pw');

      expect(result).toBe(false);
      expect(useUserStore.getState().isAuthenticated).toBe(false);
    });

    it('returns false on database error', async () => {
      vi.mocked(dbService.getUser).mockRejectedValue(new Error('DB error'));

      const result = await useUserStore.getState().login('user-1', 'pw');

      expect(result).toBe(false);
    });
  });

  // ==================== logout ====================

  describe('logout', () => {
    it('clears currentUser and sets isAuthenticated to false', () => {
      // Set up an authenticated state first
      useUserStore.setState({
        currentUser: mockUser() as any,
        isAuthenticated: true,
      });

      useUserStore.getState().logout();

      const state = useUserStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('is a no-op when already logged out', () => {
      useUserStore.getState().logout();

      const state = useUserStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ==================== createUser ====================

  describe('createUser', () => {
    it('creates a user via DB and reloads users list', async () => {
      const createdUser = mockUser({ id: 'new-user', name: 'newuser' });
      vi.mocked(dbService.createUser).mockResolvedValue(createdUser);
      vi.mocked(dbService.getUsers).mockResolvedValue([createdUser]);
      (window as any).electronAPI.auth.hashPassword.mockResolvedValue('hashed_pw');

      const result = await useUserStore.getState().createUser(
        'newuser',
        'New User',
        'mypassword',
        '#ff0000',
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe('new-user');
      expect(result!.name).toBe('newuser');

      // Verify dbService.createUser called with correct args
      expect(dbService.createUser).toHaveBeenCalledWith({
        name: 'newuser',
        display_name: 'New User',
        password_hash: 'hashed_pw',
        avatar_color: '#ff0000',
      });

      // Verify password was hashed
      expect((window as any).electronAPI.auth.hashPassword).toHaveBeenCalledWith('mypassword');

      // Verify loadUsers was called (to refresh the list)
      expect(dbService.getUsers).toHaveBeenCalled();
    });

    it('uses name as display_name when displayName is empty', async () => {
      const createdUser = mockUser({ id: 'new-user', name: 'alice' });
      vi.mocked(dbService.createUser).mockResolvedValue(createdUser);
      vi.mocked(dbService.getUsers).mockResolvedValue([createdUser]);

      await useUserStore.getState().createUser('alice', '', 'pw', '#000');

      expect(dbService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: 'alice' }),
      );
    });

    it('returns null on error', async () => {
      vi.mocked(dbService.createUser).mockRejectedValue(new Error('Duplicate name'));

      const result = await useUserStore.getState().createUser('test', 'Test', 'pw', '#000');

      expect(result).toBeNull();
    });
  });

  // ==================== restoreSession ====================

  describe('restoreSession', () => {
    it('sets isLoading while checking and returns false (requires re-login)', async () => {
      const user = mockUser();
      vi.mocked(dbService.getActiveUser).mockResolvedValue(user);

      const result = await useUserStore.getState().restoreSession();

      expect(result).toBe(false);
      // isLoading should be false after completion
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('returns false when no active user found', async () => {
      vi.mocked(dbService.getActiveUser).mockResolvedValue(null);

      const result = await useUserStore.getState().restoreSession();

      expect(result).toBe(false);
      expect(useUserStore.getState().isLoading).toBe(false);
    });

    it('returns false and resets isLoading on error', async () => {
      vi.mocked(dbService.getActiveUser).mockRejectedValue(new Error('DB error'));

      const result = await useUserStore.getState().restoreSession();

      expect(result).toBe(false);
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  // ==================== changePassword ====================

  describe('changePassword', () => {
    it('changes password when old password is verified', async () => {
      (window as any).electronAPI.auth.hashPassword
        .mockResolvedValueOnce('old_hash')   // hash of old password
        .mockResolvedValueOnce('new_hash');   // hash of new password
      vi.mocked(dbService.verifyPassword).mockResolvedValue(true);
      vi.mocked(dbService.updateUser).mockResolvedValue(undefined);

      const result = await useUserStore.getState().changePassword(
        'user-1',
        'oldPassword',
        'newPassword',
      );

      expect(result).toBe(true);
      expect((window as any).electronAPI.auth.hashPassword).toHaveBeenCalledWith('oldPassword');
      expect((window as any).electronAPI.auth.hashPassword).toHaveBeenCalledWith('newPassword');
      expect(dbService.verifyPassword).toHaveBeenCalledWith('user-1', 'old_hash');
      expect(dbService.updateUser).toHaveBeenCalledWith('user-1', { password_hash: 'new_hash' });
    });

    it('returns false when old password is wrong', async () => {
      (window as any).electronAPI.auth.hashPassword.mockResolvedValue('wrong_hash');
      vi.mocked(dbService.verifyPassword).mockResolvedValue(false);

      const result = await useUserStore.getState().changePassword(
        'user-1',
        'wrongOldPassword',
        'newPassword',
      );

      expect(result).toBe(false);
      // updateUser should NOT be called
      expect(dbService.updateUser).not.toHaveBeenCalled();
    });
  });

  // ==================== updateUser ====================

  describe('updateUser', () => {
    it('updates user data and reloads users', async () => {
      const updatedUser = mockUser({ name: 'updated-name' });
      vi.mocked(dbService.updateUser).mockResolvedValue(undefined);
      vi.mocked(dbService.getUsers).mockResolvedValue([updatedUser]);

      await useUserStore.getState().updateUser('user-1', { name: 'updated-name' });

      expect(dbService.updateUser).toHaveBeenCalledWith('user-1', { name: 'updated-name' });
      expect(dbService.getUsers).toHaveBeenCalled();
    });

    it('refreshes currentUser if the updated user is the logged-in user', async () => {
      // Set current user
      useUserStore.setState({
        currentUser: { ...mockUser(), is_active: true } as any,
        isAuthenticated: true,
      });

      const updatedUser = mockUser({ display_name: 'New Display Name' });
      vi.mocked(dbService.updateUser).mockResolvedValue(undefined);
      vi.mocked(dbService.getUsers).mockResolvedValue([updatedUser]);
      vi.mocked(dbService.getUser).mockResolvedValue(updatedUser);

      await useUserStore.getState().updateUser('user-1', { display_name: 'New Display Name' });

      expect(dbService.getUser).toHaveBeenCalledWith('user-1');
      expect(useUserStore.getState().currentUser!.display_name).toBe('New Display Name');
    });
  });

  // ==================== deleteUser ====================

  describe('deleteUser', () => {
    it('deletes user and reloads the list', async () => {
      vi.mocked(dbService.deleteUser).mockResolvedValue(undefined);
      vi.mocked(dbService.getUsers).mockResolvedValue([]);

      await useUserStore.getState().deleteUser('user-1');

      expect(dbService.deleteUser).toHaveBeenCalledWith('user-1');
      expect(dbService.getUsers).toHaveBeenCalled();
    });

    it('logs out the current user if deleted user is the current user', async () => {
      useUserStore.setState({
        currentUser: { ...mockUser(), is_active: true } as any,
        isAuthenticated: true,
      });

      vi.mocked(dbService.deleteUser).mockResolvedValue(undefined);
      vi.mocked(dbService.getUsers).mockResolvedValue([]);

      await useUserStore.getState().deleteUser('user-1');

      const state = useUserStore.getState();
      expect(state.currentUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
