import type Database from 'better-sqlite3';
import { app } from 'electron';
import os from 'os';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChronoLogExport {
  format: 'chronolog-export';
  version: 1;
  exportedAt: string;
  appVersion: string;
  machineName: string;
  data: {
    jobs: any[];
    projects: any[];
    categories: any[];
    tags: any[];
    time_entries: any[];
    breaks: any[];
    goals: any[];
    achievements: any[];
    gamification: any[];
    settings: any[];
    audit_log: any[];
  };
  stats: {
    totalEntries: number;
    totalJobs: number;
    totalProjects: number;
    dateRange: { from: string; to: string } | null;
  };
}

export interface ImportResult {
  success: boolean;
  imported: { [table: string]: number };
  skipped: { [table: string]: number };
  errors: string[];
}

// Tables ordered to respect foreign key constraints (parents before children)
const TABLE_NAMES = [
  'jobs',
  'projects',
  'categories',
  'tags',
  'time_entries',
  'breaks',
  'goals',
  'achievements',
  'gamification',
  'settings',
  'audit_log',
] as const;

// Reverse order for deletion (children before parents)
const DELETE_ORDER = [...TABLE_NAMES].reverse();

type TableName = (typeof TABLE_NAMES)[number];

// ── Export ──────────────────────────────────────────────────────────────────────

export function exportData(db: Database.Database): ChronoLogExport {
  const readAll = db.transaction(() => {
    const data = {} as ChronoLogExport['data'];

    for (const table of TABLE_NAMES) {
      data[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }

    return data;
  });

  const data = readAll();

  // Build date range from time_entries
  let dateRange: ChronoLogExport['stats']['dateRange'] = null;
  if (data.time_entries.length > 0) {
    const range = db
      .prepare(
        `SELECT MIN(start_time) as "from", MAX(start_time) as "to" FROM time_entries`
      )
      .get() as { from: string; to: string } | undefined;

    if (range?.from && range?.to) {
      dateRange = { from: range.from, to: range.to };
    }
  }

  return {
    format: 'chronolog-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    machineName: os.hostname(),
    data,
    stats: {
      totalEntries: data.time_entries.length,
      totalJobs: data.jobs.length,
      totalProjects: data.projects.length,
      dateRange,
    },
  };
}

// ── Import ─────────────────────────────────────────────────────────────────────

export function importData(
  db: Database.Database,
  data: ChronoLogExport,
  mode: 'replace' | 'merge'
): ImportResult {
  const result: ImportResult = {
    success: false,
    imported: {},
    skipped: {},
    errors: [],
  };

  // Initialise counters
  for (const table of TABLE_NAMES) {
    result.imported[table] = 0;
    result.skipped[table] = 0;
  }

  try {
    const performImport = db.transaction(() => {
      if (mode === 'replace') {
        // Disable FK checks while deleting to avoid ordering issues
        db.pragma('foreign_keys = OFF');

        for (const table of DELETE_ORDER) {
          db.prepare(`DELETE FROM ${table}`).run();
        }

        db.pragma('foreign_keys = ON');
      }

      for (const table of TABLE_NAMES) {
        const rows = data.data[table];
        if (!rows || rows.length === 0) continue;

        for (const row of rows) {
          try {
            const columns = Object.keys(row);
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map((col) => row[col]);

            const verb =
              mode === 'merge' ? 'INSERT OR IGNORE' : 'INSERT';

            const sql = `${verb} INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
            const stmt = db.prepare(sql);
            const info = stmt.run(...values);

            if (info.changes > 0) {
              result.imported[table]++;
            } else {
              result.skipped[table]++;
            }
          } catch (err) {
            const message =
              err instanceof Error ? err.message : String(err);
            result.errors.push(`[${table}] ${message}`);
            result.skipped[table]++;
          }
        }
      }
    });

    performImport();
    result.success = result.errors.length === 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Transaction failed: ${message}`);
    result.success = false;
  }

  return result;
}

// ── Validation ─────────────────────────────────────────────────────────────────

export function validateExportFile(data: unknown): data is ChronoLogExport {
  if (data === null || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  if (obj.format !== 'chronolog-export') return false;
  if (obj.version !== 1) return false;
  if (typeof obj.exportedAt !== 'string') return false;
  if (typeof obj.appVersion !== 'string') return false;
  if (typeof obj.machineName !== 'string') return false;

  if (obj.data === null || typeof obj.data !== 'object') return false;

  const tableData = obj.data as Record<string, unknown>;
  for (const table of TABLE_NAMES) {
    if (!Array.isArray(tableData[table])) return false;
  }

  if (obj.stats === null || typeof obj.stats !== 'object') return false;

  const stats = obj.stats as Record<string, unknown>;
  if (typeof stats.totalEntries !== 'number') return false;
  if (typeof stats.totalJobs !== 'number') return false;
  if (typeof stats.totalProjects !== 'number') return false;
  if (
    stats.dateRange !== null &&
    (typeof stats.dateRange !== 'object' ||
      typeof (stats.dateRange as any).from !== 'string' ||
      typeof (stats.dateRange as any).to !== 'string')
  ) {
    return false;
  }

  return true;
}
