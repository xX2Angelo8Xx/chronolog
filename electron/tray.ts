import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron';
import path from 'path';

export function setupTray(mainWindow: BrowserWindow): Tray {
  // Use a simple icon - in production this would be a proper .ico file
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  
  let trayIcon: Electron.NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
  } catch {
    // Fallback: create a simple 16x16 icon
    trayIcon = nativeImage.createEmpty();
  }

  const tray = new Tray(trayIcon.isEmpty() ? nativeImage.createFromBuffer(Buffer.alloc(16 * 16 * 4, 0x80)) : trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'ChronoLog öffnen',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Timer Start/Stop',
      click: () => {
        mainWindow.webContents.send('shortcut:toggleTimer');
      },
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => {
        mainWindow.removeAllListeners('close');
        mainWindow.close();
        app.quit();
      },
    },
  ]);

  tray.setToolTip('ChronoLog - Kein aktiver Timer');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}
