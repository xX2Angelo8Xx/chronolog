// ==================== Core Types ====================

export interface User {
  id: string;
  name: string;
  display_name: string | null;
  password_hash: string;
  avatar_color: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  display_name?: string;
  password: string;
  avatar_color?: string;
}

export interface Job {
  id: string;
  name: string;
  color: string;
  hourly_rate: number | null;
  currency: string;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  job_id: string;
  name: string;
  color: string;
  description: string | null;
  hourly_rate_override: number | null;
  is_favorite: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  job_name?: string;
  job_color?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  job_id: string;
  project_id: string | null;
  category_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  note: string | null;
  is_manual: boolean;
  is_running: boolean;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  job_name?: string;
  job_color?: string;
  project_name?: string;
  project_color?: string;
  category_name?: string;
  category_color?: string;
  tags?: Tag[];
  breaks?: Break[];
}

export interface Break {
  id: string;
  time_entry_id: string;
  start_time: string;
  end_time: string | null;
  break_type: 'coffee' | 'lunch';
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  name: string;
  goal_type: 'daily' | 'weekly' | 'monthly';
  target_hours: number;
  job_id: string | null;
  project_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  current_hours?: number;
  progress_percent?: number;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  unlocked_at: string | null;
  created_at: string;
}

export interface Gamification {
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_log_date: string | null;
}

export interface Setting {
  key: string;
  value: string;
}

// ==================== Form / Input Types ====================

export interface CreateJobInput {
  name: string;
  color: string;
  hourly_rate?: number | null;
  currency?: string;
}

export interface CreateProjectInput {
  job_id: string;
  name: string;
  color: string;
  description?: string;
  hourly_rate_override?: number | null;
}

export interface CreateCategoryInput {
  name: string;
  icon?: string;
  color: string;
}

export interface CreateTimeEntryInput {
  job_id: string;
  project_id?: string | null;
  category_id?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  note?: string;
  is_manual?: boolean;
  tag_ids?: string[];
  user_id?: string | null;
}

export interface UpdateTimeEntryInput {
  id: string;
  job_id?: string;
  project_id?: string | null;
  category_id?: string | null;
  start_time?: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  note?: string;
  tag_ids?: string[];
}

// ==================== Dashboard / Analytics Types ====================

export interface DayStats {
  date: string;
  total_minutes: number;
  work_minutes: number;
  break_minutes: number;
  coffee_breaks: number;
  lunch_breaks: number;
  entries_count: number;
}

export interface PeriodStats {
  total_minutes: number;
  work_minutes: number;
  break_minutes: number;
  average_daily_minutes: number;
  days_worked: number;
  entries_count: number;
  by_job: { job_id: string; job_name: string; color: string; minutes: number }[];
  by_project: { project_id: string; project_name: string; color: string; minutes: number }[];
  by_category: { category_id: string; category_name: string; color: string; minutes: number }[];
}

export type TimePeriod = 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

// ==================== Timer State ====================

export type TimerStatus = 'idle' | 'running' | 'paused';

export type BreakType = 'coffee' | 'lunch';

export type ThemeMode = 'light' | 'dark' | 'system';

// ==================== Navigation ====================

export type NavPage = 'dashboard' | 'timer' | 'entries' | 'analytics' | 'goals' | 'manage' | 'settings';
