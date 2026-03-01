// Database service layer - communicates with Electron main process via IPC

const db = window.electronAPI.db;

// ==================== Jobs ====================

export async function getJobs(includeArchived = false): Promise<any[]> {
  const sql = includeArchived
    ? 'SELECT * FROM jobs ORDER BY sort_order, name'
    : 'SELECT * FROM jobs WHERE is_archived = 0 ORDER BY sort_order, name';
  return db.query(sql);
}

export async function getJob(id: string): Promise<any> {
  return db.get('SELECT * FROM jobs WHERE id = ?', [id]);
}

export async function createJob(data: { name: string; color: string; hourly_rate?: number | null; currency?: string }): Promise<any> {
  const id = crypto.randomUUID();
  await db.run(
    'INSERT INTO jobs (id, name, color, hourly_rate, currency) VALUES (?, ?, ?, ?, ?)',
    [id, data.name, data.color, data.hourly_rate ?? null, data.currency ?? 'EUR']
  );
  return getJob(id);
}

export async function updateJob(id: string, data: Partial<{ name: string; color: string; hourly_rate: number | null; currency: string; is_archived: number; sort_order: number }>): Promise<any> {
  const fields = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
  const values = Object.values(data);
  await db.run(`UPDATE jobs SET ${fields}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
  return getJob(id);
}

export async function deleteJob(id: string): Promise<void> {
  await db.run('DELETE FROM jobs WHERE id = ?', [id]);
}

// ==================== Projects ====================

export async function getProjects(jobId?: string, includeArchived = false): Promise<any[]> {
  let sql = `SELECT p.*, j.name as job_name, j.color as job_color 
             FROM projects p JOIN jobs j ON p.job_id = j.id`;
  const conditions: string[] = [];
  const params: any[] = [];

  if (jobId) {
    conditions.push('p.job_id = ?');
    params.push(jobId);
  }
  if (!includeArchived) {
    conditions.push('p.is_archived = 0');
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY p.is_favorite DESC, p.sort_order, p.name';

  return db.query(sql, params);
}

export async function getProject(id: string): Promise<any> {
  return db.get(
    `SELECT p.*, j.name as job_name, j.color as job_color 
     FROM projects p JOIN jobs j ON p.job_id = j.id WHERE p.id = ?`,
    [id]
  );
}

export async function createProject(data: { job_id: string; name: string; color: string; description?: string; hourly_rate_override?: number | null }): Promise<any> {
  const id = crypto.randomUUID();
  await db.run(
    'INSERT INTO projects (id, job_id, name, color, description, hourly_rate_override) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.job_id, data.name, data.color, data.description ?? null, data.hourly_rate_override ?? null]
  );
  return getProject(id);
}

export async function updateProject(id: string, data: Partial<{ job_id: string; name: string; color: string; description: string; hourly_rate_override: number | null; is_favorite: number; is_archived: number; sort_order: number }>): Promise<any> {
  const fields = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
  const values = Object.values(data);
  await db.run(`UPDATE projects SET ${fields}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
  return getProject(id);
}

export async function deleteProject(id: string): Promise<void> {
  await db.run('DELETE FROM projects WHERE id = ?', [id]);
}

// ==================== Categories ====================

export async function getCategories(includeArchived = false): Promise<any[]> {
  const sql = includeArchived
    ? 'SELECT * FROM categories ORDER BY sort_order, name'
    : 'SELECT * FROM categories WHERE is_archived = 0 ORDER BY sort_order, name';
  return db.query(sql);
}

export async function createCategory(data: { name: string; color: string; icon?: string }): Promise<any> {
  const id = crypto.randomUUID();
  await db.run(
    'INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
    [id, data.name, data.color, data.icon ?? null]
  );
  return db.get('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function updateCategory(id: string, data: Partial<{ name: string; color: string; icon: string; is_archived: number; sort_order: number }>): Promise<any> {
  const fields = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
  const values = Object.values(data);
  await db.run(`UPDATE categories SET ${fields}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
  return db.get('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function deleteCategory(id: string): Promise<void> {
  await db.run('DELETE FROM categories WHERE id = ?', [id]);
}

// ==================== Tags ====================

export async function getTags(): Promise<any[]> {
  return db.query('SELECT * FROM tags ORDER BY name');
}

export async function createTag(data: { name: string; color?: string }): Promise<any> {
  const id = crypto.randomUUID();
  await db.run('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)', [id, data.name, data.color ?? '#6b7280']);
  return db.get('SELECT * FROM tags WHERE id = ?', [id]);
}

export async function deleteTag(id: string): Promise<void> {
  await db.run('DELETE FROM tags WHERE id = ?', [id]);
}

// ==================== Time Entries ====================

export async function getTimeEntries(options: {
  startDate?: string;
  endDate?: string;
  jobId?: string;
  projectId?: string;
  categoryId?: string;
  limit?: number;
}): Promise<any[]> {
  let sql = `SELECT te.*, 
    j.name as job_name, j.color as job_color,
    p.name as project_name, p.color as project_color,
    c.name as category_name, c.color as category_color
    FROM time_entries te
    LEFT JOIN jobs j ON te.job_id = j.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN categories c ON te.category_id = c.id`;

  const conditions: string[] = [];
  const params: any[] = [];

  if (options.startDate) {
    conditions.push('te.start_time >= ?');
    params.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push('te.start_time <= ?');
    params.push(options.endDate);
  }
  if (options.jobId) {
    conditions.push('te.job_id = ?');
    params.push(options.jobId);
  }
  if (options.projectId) {
    conditions.push('te.project_id = ?');
    params.push(options.projectId);
  }
  if (options.categoryId) {
    conditions.push('te.category_id = ?');
    params.push(options.categoryId);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY te.start_time DESC';

  if (options.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  const entries = await db.query(sql, params);

  // Load breaks and tags for each entry
  for (const entry of entries) {
    entry.breaks = await db.query('SELECT * FROM breaks WHERE time_entry_id = ? ORDER BY start_time', [entry.id]);
    const tagRows = await db.query(
      `SELECT t.* FROM tags t JOIN time_entry_tags tet ON t.id = tet.tag_id WHERE tet.time_entry_id = ?`,
      [entry.id]
    );
    entry.tags = tagRows;
  }

  return entries;
}

export async function getTimeEntry(id: string): Promise<any> {
  const entry = await db.get(
    `SELECT te.*, 
      j.name as job_name, j.color as job_color,
      p.name as project_name, p.color as project_color,
      c.name as category_name, c.color as category_color
    FROM time_entries te
    LEFT JOIN jobs j ON te.job_id = j.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN categories c ON te.category_id = c.id
    WHERE te.id = ?`,
    [id]
  );
  if (entry) {
    entry.breaks = await db.query('SELECT * FROM breaks WHERE time_entry_id = ? ORDER BY start_time', [entry.id]);
    entry.tags = await db.query(
      'SELECT t.* FROM tags t JOIN time_entry_tags tet ON t.id = tet.tag_id WHERE tet.time_entry_id = ?',
      [entry.id]
    );
  }
  return entry;
}

export async function createTimeEntry(data: {
  job_id: string;
  project_id?: string | null;
  category_id?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  note?: string;
  is_manual?: boolean;
  is_running?: boolean;
  tag_ids?: string[];
}): Promise<any> {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO time_entries (id, job_id, project_id, category_id, start_time, end_time, duration_minutes, note, is_manual, is_running)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.job_id,
      data.project_id ?? null,
      data.category_id ?? null,
      data.start_time,
      data.end_time ?? null,
      data.duration_minutes ?? null,
      data.note ?? null,
      data.is_manual ? 1 : 0,
      data.is_running ? 1 : 0,
    ]
  );

  // Add tags
  if (data.tag_ids && data.tag_ids.length > 0) {
    for (const tagId of data.tag_ids) {
      await db.run('INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }

  return getTimeEntry(id);
}

export async function updateTimeEntry(id: string, data: Partial<{
  job_id: string;
  project_id: string | null;
  category_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  note: string;
  is_running: number;
  tag_ids: string[];
}>): Promise<any> {
  const { tag_ids, ...fields } = data;
  
  if (Object.keys(fields).length > 0) {
    const setClauses = Object.entries(fields).map(([key]) => `${key} = ?`).join(', ');
    const values = Object.values(fields);
    await db.run(`UPDATE time_entries SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
  }

  if (tag_ids !== undefined) {
    await db.run('DELETE FROM time_entry_tags WHERE time_entry_id = ?', [id]);
    for (const tagId of tag_ids) {
      await db.run('INSERT INTO time_entry_tags (time_entry_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }

  return getTimeEntry(id);
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await db.run('DELETE FROM time_entries WHERE id = ?', [id]);
}

export async function getRunningEntry(): Promise<any | null> {
  return db.get(
    `SELECT te.*, 
      j.name as job_name, j.color as job_color,
      p.name as project_name, p.color as project_color,
      c.name as category_name, c.color as category_color
    FROM time_entries te
    LEFT JOIN jobs j ON te.job_id = j.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN categories c ON te.category_id = c.id
    WHERE te.is_running = 1
    LIMIT 1`
  );
}

// ==================== Breaks ====================

export async function createBreak(data: { time_entry_id: string; start_time: string; break_type: 'coffee' | 'lunch' }): Promise<any> {
  const id = crypto.randomUUID();
  await db.run(
    'INSERT INTO breaks (id, time_entry_id, start_time, break_type, is_active) VALUES (?, ?, ?, ?, 1)',
    [id, data.time_entry_id, data.start_time, data.break_type]
  );
  return db.get('SELECT * FROM breaks WHERE id = ?', [id]);
}

export async function endBreak(id: string, endTime: string): Promise<any> {
  const brk = await db.get('SELECT * FROM breaks WHERE id = ?', [id]);
  if (brk) {
    const start = new Date(brk.start_time);
    const end = new Date(endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    await db.run(
      'UPDATE breaks SET end_time = ?, duration_minutes = ?, is_active = 0 WHERE id = ?',
      [endTime, durationMinutes, id]
    );
  }
  return db.get('SELECT * FROM breaks WHERE id = ?', [id]);
}

export async function getActiveBreak(timeEntryId: string): Promise<any | null> {
  return db.get('SELECT * FROM breaks WHERE time_entry_id = ? AND is_active = 1', [timeEntryId]);
}

// ==================== Goals ====================

export async function getGoals(): Promise<any[]> {
  return db.query(
    `SELECT g.*, j.name as job_name, p.name as project_name 
     FROM goals g 
     LEFT JOIN jobs j ON g.job_id = j.id 
     LEFT JOIN projects p ON g.project_id = p.id 
     WHERE g.is_active = 1 ORDER BY g.goal_type, g.name`
  );
}

export async function createGoal(data: { name: string; goal_type: string; target_hours: number; job_id?: string | null; project_id?: string | null }): Promise<any> {
  const id = crypto.randomUUID();
  await db.run(
    'INSERT INTO goals (id, name, goal_type, target_hours, job_id, project_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, data.name, data.goal_type, data.target_hours, data.job_id ?? null, data.project_id ?? null]
  );
  return db.get('SELECT * FROM goals WHERE id = ?', [id]);
}

export async function updateGoal(id: string, data: Partial<{ name: string; goal_type: string; target_hours: number; is_active: number }>): Promise<void> {
  const fields = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
  const values = Object.values(data);
  await db.run(`UPDATE goals SET ${fields}, updated_at = datetime('now') WHERE id = ?`, [...values, id]);
}

export async function deleteGoal(id: string): Promise<void> {
  await db.run('DELETE FROM goals WHERE id = ?', [id]);
}

// ==================== Gamification ====================

export async function getGamification(): Promise<any> {
  return db.get('SELECT * FROM gamification WHERE id = 1');
}

export async function addXP(amount: number): Promise<any> {
  const current = await getGamification();
  const newXP = current.xp + amount;
  const newLevel = Math.floor(newXP / 100) + 1; // 100 XP per level
  await db.run('UPDATE gamification SET xp = ?, level = ?, updated_at = datetime(\'now\') WHERE id = 1', [newXP, newLevel]);
  return getGamification();
}

export async function updateStreak(logDate: string): Promise<any> {
  const current = await getGamification();
  const lastLog = current.last_log_date;
  let newStreak = current.current_streak;

  if (lastLog) {
    const lastDate = new Date(lastLog);
    const currentDate = new Date(logDate);
    const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
    // If same day, keep streak
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(current.longest_streak, newStreak);
  await db.run(
    'UPDATE gamification SET current_streak = ?, longest_streak = ?, last_log_date = ?, updated_at = datetime(\'now\') WHERE id = 1',
    [newStreak, longestStreak, logDate]
  );
  return getGamification();
}

export async function getAchievements(): Promise<any[]> {
  return db.query('SELECT * FROM achievements ORDER BY unlocked_at DESC NULLS LAST, name');
}

export async function unlockAchievement(key: string): Promise<void> {
  await db.run(
    'UPDATE achievements SET unlocked_at = datetime(\'now\') WHERE key = ? AND unlocked_at IS NULL',
    [key]
  );
}

// ==================== Settings ====================

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.query('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows as any[]) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime(\'now\')',
    [key, value, value]
  );
}

// ==================== Stats Queries ====================

export async function getDayStats(date: string): Promise<any> {
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const entries = await db.query(
    `SELECT te.*, 
      COALESCE(te.duration_minutes, 
        CASE WHEN te.end_time IS NOT NULL 
          THEN (julianday(te.end_time) - julianday(te.start_time)) * 1440 
          ELSE (julianday('now') - julianday(te.start_time)) * 1440 
        END
      ) as calc_duration
    FROM time_entries te 
    WHERE te.start_time >= ? AND te.start_time <= ?`,
    [startOfDay, endOfDay]
  );

  let totalMinutes = 0;
  let breakMinutes = 0;
  let coffeeBreaks = 0;
  let lunchBreaks = 0;

  for (const entry of entries as any[]) {
    totalMinutes += entry.calc_duration || 0;

    const breaks = await db.query(
      'SELECT * FROM breaks WHERE time_entry_id = ? AND end_time IS NOT NULL',
      [entry.id]
    );

    for (const brk of breaks as any[]) {
      const brkDuration = brk.duration_minutes || 0;
      if (brk.break_type === 'coffee') {
        coffeeBreaks++;
        // Coffee breaks ≤ 15 min count as work time, so don't subtract
        if (brkDuration > 15) {
          breakMinutes += brkDuration;
        }
      } else {
        lunchBreaks++;
        breakMinutes += brkDuration;
      }
    }
  }

  return {
    date,
    total_minutes: totalMinutes,
    work_minutes: totalMinutes - breakMinutes,
    break_minutes: breakMinutes,
    coffee_breaks: coffeeBreaks,
    lunch_breaks: lunchBreaks,
    entries_count: entries.length,
  };
}

export async function getWeekStats(startDate: string, endDate: string): Promise<any> {
  const entries = await db.query(
    `SELECT te.job_id, te.project_id, te.category_id,
      j.name as job_name, j.color as job_color,
      p.name as project_name, p.color as project_color,
      c.name as category_name, c.color as category_color,
      COALESCE(te.duration_minutes,
        CASE WHEN te.end_time IS NOT NULL 
          THEN (julianday(te.end_time) - julianday(te.start_time)) * 1440 
          ELSE 0 END
      ) as calc_duration
    FROM time_entries te
    LEFT JOIN jobs j ON te.job_id = j.id
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN categories c ON te.category_id = c.id
    WHERE te.start_time >= ? AND te.start_time <= ? AND te.is_running = 0`,
    [startDate, endDate]
  );

  const byJob: Record<string, { job_id: string; job_name: string; color: string; minutes: number }> = {};
  const byProject: Record<string, { project_id: string; project_name: string; color: string; minutes: number }> = {};
  const byCategory: Record<string, { category_id: string; category_name: string; color: string; minutes: number }> = {};

  let totalMinutes = 0;

  for (const e of entries as any[]) {
    const duration = e.calc_duration || 0;
    totalMinutes += duration;

    if (e.job_id) {
      if (!byJob[e.job_id]) byJob[e.job_id] = { job_id: e.job_id, job_name: e.job_name, color: e.job_color, minutes: 0 };
      byJob[e.job_id].minutes += duration;
    }
    if (e.project_id) {
      if (!byProject[e.project_id]) byProject[e.project_id] = { project_id: e.project_id, project_name: e.project_name, color: e.project_color, minutes: 0 };
      byProject[e.project_id].minutes += duration;
    }
    if (e.category_id) {
      if (!byCategory[e.category_id]) byCategory[e.category_id] = { category_id: e.category_id, category_name: e.category_name, color: e.category_color, minutes: 0 };
      byCategory[e.category_id].minutes += duration;
    }
  }

  return {
    total_minutes: totalMinutes,
    entries_count: entries.length,
    by_job: Object.values(byJob),
    by_project: Object.values(byProject),
    by_category: Object.values(byCategory),
  };
}

// ==================== Backup ====================

export async function createBackup(): Promise<void> {
  await db.run('SELECT 1'); // noop – placeholder for real backup logic
}
