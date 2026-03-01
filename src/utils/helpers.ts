/**
 * Format seconds into HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format minutes into a human-readable string (e.g., "2h 30min")
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '0min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Format minutes as decimal hours (e.g., 2.5h)
 */
export function formatHoursDecimal(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get start of week (Monday) for a given date
 */
export function getStartOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get end of week (Sunday) for a given date
 */
export function getEndOfWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get start of month
 */
export function getStartOfMonth(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString().split('T')[0];
}

/**
 * Get end of month
 */
export function getEndOfMonth(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return d.toISOString().split('T')[0];
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string, locale = 'de-DE'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Format time from ISO string
 */
export function formatTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calculate XP needed for next level (100 XP per level)
 */
export function xpForLevel(level: number): number {
  return level * 100;
}

/**
 * Calculate XP progress within current level
 */
export function xpProgress(xp: number, level: number): number {
  const baseXP = (level - 1) * 100;
  return xp - baseXP;
}

/**
 * Predefined color palette for jobs/projects/categories
 */
export const COLOR_PALETTE = [
  '#0078d4', // Blue
  '#107c10', // Green
  '#d83b01', // Orange
  '#b4009e', // Purple
  '#e74856', // Red
  '#00b7c3', // Teal
  '#8764b8', // Violet
  '#ca5010', // Burnt Orange
  '#038387', // Dark Teal
  '#c239b3', // Fuchsia
  '#498205', // Olive
  '#da3b01', // Red-Orange
  '#7719aa', // Dark Purple
  '#4f6bed', // Indigo
  '#69797e', // Steel
  '#e3008c', // Magenta
];

/**
 * Get day name from index (0=Monday for ISO weeks)
 */
export function getDayName(dayIndex: number, locale = 'de-DE', format: 'long' | 'short' = 'short'): string {
  const date = new Date(2024, 0, dayIndex + 1); // 2024-01-01 is Monday
  return date.toLocaleDateString(locale, { weekday: format });
}
