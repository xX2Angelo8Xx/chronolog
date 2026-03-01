import { BrowserWindow, powerMonitor } from 'electron';

let idleCheckInterval: ReturnType<typeof setInterval> | null = null;
let wasIdle = false;
const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes

export function setupIdleDetector(mainWindow: BrowserWindow) {
  idleCheckInterval = setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime();
    const isIdle = idleTime >= IDLE_THRESHOLD_SECONDS;

    if (isIdle && !wasIdle) {
      wasIdle = true;
      mainWindow.webContents.send('idle:stateChanged', 'idle');
    } else if (!isIdle && wasIdle) {
      wasIdle = false;
      mainWindow.webContents.send('idle:stateChanged', 'active');
    }
  }, 10000); // Check every 10 seconds

  powerMonitor.on('lock-screen', () => {
    mainWindow.webContents.send('idle:stateChanged', 'locked');
  });

  powerMonitor.on('unlock-screen', () => {
    mainWindow.webContents.send('idle:stateChanged', 'active');
  });
}

export function stopIdleDetector() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
}
