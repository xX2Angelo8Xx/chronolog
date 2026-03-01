import { create } from 'zustand';
import type { User } from '@/types';
import * as dbService from '@/services/database';

interface UserState {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  loadUsers: () => Promise<void>;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (name: string, displayName: string, password: string, avatarColor: string) => Promise<User | null>;
  updateUser: (id: string, data: Partial<{ name: string; display_name: string; avatar_color: string }>) => Promise<void>;
  changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  users: [],
  isAuthenticated: false,
  isLoading: false,

  loadUsers: async () => {
    const users = await dbService.getUsers();
    set({ users: users.map(mapUser) });
  },

  login: async (userId: string, password: string) => {
    try {
      const user = await dbService.getUser(userId);
      if (!user) return false;

      // Default user with empty password_hash — accept any password
      if (!user.password_hash) {
        await dbService.loginUser(userId);
        set({ currentUser: mapUser(user), isAuthenticated: true });
        return true;
      }

      const hash = await window.electronAPI.auth.hashPassword(password);
      const valid = user.password_hash === hash;
      if (!valid) return false;

      await dbService.loginUser(userId);
      set({ currentUser: mapUser(user), isAuthenticated: true });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },

  createUser: async (name, displayName, password, avatarColor) => {
    try {
      const hash = await window.electronAPI.auth.hashPassword(password);
      const user = await dbService.createUser({
        name,
        display_name: displayName || name,
        password_hash: hash,
        avatar_color: avatarColor,
      });
      await get().loadUsers();
      return mapUser(user);
    } catch {
      return null;
    }
  },

  updateUser: async (id, data) => {
    await dbService.updateUser(id, data);
    await get().loadUsers();
    const current = get().currentUser;
    if (current?.id === id) {
      const updated = await dbService.getUser(id);
      if (updated) set({ currentUser: mapUser(updated) });
    }
  },

  changePassword: async (userId, oldPassword, newPassword) => {
    const oldHash = await window.electronAPI.auth.hashPassword(oldPassword);
    const valid = await dbService.verifyPassword(userId, oldHash);
    if (!valid) return false;

    const newHash = await window.electronAPI.auth.hashPassword(newPassword);
    await dbService.updateUser(userId, { password_hash: newHash });
    return true;
  },

  deleteUser: async (id) => {
    await dbService.deleteUser(id);
    await get().loadUsers();
    if (get().currentUser?.id === id) {
      set({ currentUser: null, isAuthenticated: false });
    }
  },

  restoreSession: async () => {
    try {
      set({ isLoading: true });
      const user = await dbService.getActiveUser();
      if (user) {
        // Auto-restore session but still require login
        set({ isLoading: false });
        return false; // Don't auto-login, require password
      }
      set({ isLoading: false });
      return false;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },
}));

function mapUser(raw: any): User {
  return {
    ...raw,
    is_active: raw.is_active === 1 || raw.is_active === true,
  };
}
