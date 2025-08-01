console.log('Starting Electron app debug v2...');

try {
  console.log('Attempting to require electron...');
  const electron = require('electron');
  console.log('Electron object:', Object.keys(electron));
  console.log('App object:', electron.app);
  
  const { app, BrowserWindow, ipcMain, dialog } = electron;
  console.log('Destructured successfully');
  console.log('App:', app);
  console.log('BrowserWindow:', BrowserWindow);
  
  if (!app) {
    throw new Error('App is undefined after destructuring');
  }
  
  function createWindow() {
    console.log('Creating window...');
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        preload: require('path').join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    win.loadFile('index.html');
    console.log('Window created successfully');
  }
  
  console.log('Setting up app ready handler...');
  app.whenReady().then(() => {
    console.log('App is ready, creating window...');
    createWindow();
  });
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      createWindow();
    }
  });
  
  console.log('Electron app setup completed successfully');
  
} catch (error) {
  console.error('Error during app initialization:', error);
  process.exit(1);
}