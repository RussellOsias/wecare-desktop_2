const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const auth = require('./auth');
require('electron-reloader')(module);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
    show: false // Don't show until ready
  });

  // Load the login page first
  mainWindow.loadFile(path.join(__dirname, '../renderer/views/login.html'));

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Auth IPC handlers
ipcMain.handle('attempt-login', async (event, credentials) => {
  return await auth.attemptLogin(credentials);
});

ipcMain.handle('validate-session', async (event, token) => {
  return await auth.validateSession(token);
});