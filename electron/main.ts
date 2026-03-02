import { app, BrowserWindow, ipcMain, nativeTheme, Notification, shell, Tray, Menu, globalShortcut, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDb } from './database/db';
import { setupTray } from './tray';
import { exportData, importData, validateExportFile } from './data-transfer';
import { setupAutoUpdater } from './auto-updater';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function updateSplashStatus(text: string) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `document.getElementById('status-text').textContent = '${text.replace(/'/g, "\\'")}'`
    ).catch(() => {});
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 40,
    },
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show main window when ready, close splash
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      mainWindow?.show();
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
    }, 500); // brief delay for smooth transition
  });

  mainWindow.on('resize', () => {
    mainWindow?.webContents.send('window:resized');
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  const db = getDb();

  // Database IPC
  ipcMain.handle('db:query', (_event, sql: string, params?: any[]) => {
    const stmt = db.prepare(sql);
    return params ? stmt.all(...params) : stmt.all();
  });

  ipcMain.handle('db:run', (_event, sql: string, params?: any[]) => {
    const stmt = db.prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  });

  ipcMain.handle('db:get', (_event, sql: string, params?: any[]) => {
    const stmt = db.prepare(sql);
    return params ? stmt.get(...params) : stmt.get();
  });

  // App IPC
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPath', (_event, name: string) => app.getPath(name as any));
  ipcMain.handle('app:isMaximized', () => mainWindow?.isMaximized());

  ipcMain.on('app:minimize', () => mainWindow?.minimize());
  ipcMain.on('app:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('app:close', () => mainWindow?.hide());

  // Theme IPC
  ipcMain.handle('theme:get', () => nativeTheme.themeSource);
  ipcMain.on('theme:set', (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme;
  });

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  // Notification IPC
  ipcMain.on('notify', (_event, title: string, body: string) => {
    new Notification({ title, body }).show();
  });

  // Shell IPC
  ipcMain.on('shell:openExternal', (_event, url: string) => {
    shell.openExternal(url);
  });

  // Tray updates
  ipcMain.on('tray:updateTimer', (_event, data) => {
    if (tray) {
      tray.setToolTip(`ChronoLog - ${data.project}: ${data.elapsed}`);
    }
  });

  // User/Auth IPC
  ipcMain.handle('auth:hashPassword', (_event, password: string) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
  });

  ipcMain.handle('auth:verifyPassword', (_event, password: string, hash: string) => {
    const crypto = require('crypto');
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    return inputHash === hash;
  });

  // Data Export/Import IPC
  ipcMain.handle('data:export', async () => {
    try {
      const exportObj = exportData(db);
      const { filePath } = await dialog.showSaveDialog(mainWindow!, {
        title: 'Export ChronoLog Data',
        defaultPath: `ChronoLog-Export-${new Date().toISOString().slice(0, 10)}.chronolog`,
        filters: [
          { name: 'ChronoLog Data', extensions: ['chronolog'] },
          { name: 'JSON', extensions: ['json'] },
        ],
      });
      if (!filePath) return { success: false, cancelled: true };
      fs.writeFileSync(filePath, JSON.stringify(exportObj, null, 2), 'utf-8');
      return { success: true, filePath, stats: exportObj.stats };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('data:import', async (_event, mode: 'replace' | 'merge') => {
    try {
      const { filePaths } = await dialog.showOpenDialog(mainWindow!, {
        title: 'Import ChronoLog Data',
        filters: [
          { name: 'ChronoLog Data', extensions: ['chronolog'] },
          { name: 'JSON', extensions: ['json'] },
        ],
        properties: ['openFile'],
      });
      if (!filePaths || filePaths.length === 0) return { success: false, cancelled: true };

      const raw = fs.readFileSync(filePaths[0], 'utf-8');
      const parsed = JSON.parse(raw);

      if (!validateExportFile(parsed)) {
        return { success: false, error: 'Invalid ChronoLog export file format.' };
      }

      const result = importData(db, parsed, mode);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('data:exportCSV', async () => {
    try {
      const entries = db.prepare(`
        SELECT te.*, j.name as job_name, p.name as project_name, c.name as category_name
        FROM time_entries te
        LEFT JOIN jobs j ON te.job_id = j.id
        LEFT JOIN projects p ON te.project_id = p.id
        LEFT JOIN categories c ON te.category_id = c.id
        ORDER BY te.start_time DESC
      `).all() as any[];

      // Properly escape a value for CSV (RFC 4180)
      const escapeCSV = (value: any): string => {
        if (value == null) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = ['Date', 'Start', 'End', 'Duration (min)', 'Job', 'Project', 'Category', 'Note', 'Manual'];
      const rows = entries.map((e: any) => [
        escapeCSV(e.start_time?.slice(0, 10)),
        escapeCSV(e.start_time?.slice(11, 19)),
        escapeCSV(e.end_time?.slice(11, 19)),
        escapeCSV(e.duration_minutes),
        escapeCSV(e.job_name),
        escapeCSV(e.project_name),
        escapeCSV(e.category_name),
        escapeCSV(e.note),
        escapeCSV(e.is_manual ? 'Yes' : 'No'),
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const { filePath } = await dialog.showSaveDialog(mainWindow!, {
        title: 'Export as CSV',
        defaultPath: `ChronoLog-Export-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (!filePath) return { success: false, cancelled: true };
      fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf-8'); // BOM for Excel
      return { success: true, filePath, count: entries.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    mainWindow?.webContents.send('shortcut:toggleTimer');
    if (!mainWindow?.isVisible()) {
      mainWindow?.show();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Show splash screen immediately
    createSplashWindow();

    // Initialize database
    updateSplashStatus('Initializing database...');
    initDatabase();

    // Set up IPC handlers and register shortcuts in parallel
    updateSplashStatus('Setting up services...');
    setupIPC();
    registerGlobalShortcuts();

    // Create main window (hidden)
    updateSplashStatus('Loading interface...');
    createWindow();

    // Set up system tray
    updateSplashStatus('Setting up system tray...');
    tray = setupTray(mainWindow!);

    // Set up auto-updater
    updateSplashStatus('Checking for updates...');
    setupAutoUpdater(mainWindow!);

    updateSplashStatus('Almost ready...');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    mainWindow?.removeAllListeners('close');
    mainWindow?.close();
  });
}
