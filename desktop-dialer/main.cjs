// Aetheris Desktop Dialer
// Electron wrapper for PopTox (https://www.poptox.com/dialpad).
//
// Why this exists:
//   PopTox blocks iframe embedding (X-Frame-Options: SAMEORIGIN), so it can't
//   run inside the Aetheris web portal. Electron loads it as a native window
//   which ignores that browser-level restriction, and a persistent user-data
//   session keeps you signed in between launches.
//
// Custom URL scheme:
//   aetheris-dialer://call?number=+14155550123
//   Triggered from the web portal "Call via Desktop Dialer" button.
//   The main window comes to the front and the number is auto-pasted into
//   PopTox's dial field via the preload script.

const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');

const POPTOX_URL = 'https://www.poptox.com/dialpad';
const PROTOCOL = 'aetheris-dialer';

let mainWindow = null;
let pendingNumber = null;

// Register the custom protocol so the OS routes aetheris-dialer:// links to us.
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Only one instance — a second launch (e.g. from a browser link) focuses the
// existing window and forwards the number.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const url = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS delivers the deep link via 'open-url'.
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function parseNumber(url) {
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('number') || '';
    return raw.replace(/[^\d+]/g, '');
  } catch {
    return '';
  }
}

function handleDeepLink(url) {
  const number = parseNumber(url);
  if (!number) return;
  if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('dial-number', number);
  } else {
    pendingNumber = number;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 780,
    minWidth: 380,
    minHeight: 640,
    title: 'Aetheris Dialer',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:aetheris-dialer', // keeps PopTox login between launches
    },
  });

  // Grant mic permission to poptox.com automatically (needed for calls).
  session.fromPartition('persist:aetheris-dialer').setPermissionRequestHandler(
    (_wc, permission, callback, details) => {
      const allowed = ['media', 'audioCapture'];
      const fromPoptox = details?.requestingUrl?.includes('poptox.com');
      callback(allowed.includes(permission) && fromPoptox);
    },
  );

  mainWindow.loadURL(POPTOX_URL);

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingNumber) {
      mainWindow.webContents.send('dial-number', pendingNumber);
      pendingNumber = null;
    }
  });

  // Open external links in the user's default browser, not inside the dialer.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://www.poptox.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // If launched via protocol on Windows/Linux, argv contains the URL.
  const launchUrl = process.argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  if (launchUrl) pendingNumber = parseNumber(launchUrl);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Log dial requests so the rep can confirm the handoff worked.
ipcMain.on('dial-log', (_e, msg) => {
  console.log('[dialer]', msg);
});
