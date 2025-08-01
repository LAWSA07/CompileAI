console.log('Starting Electron app debug...');

try {
  console.log('Attempting to require electron...');
  const { app, BrowserWindow, ipcMain, dialog } = require('electron');
  console.log('Electron imported successfully');
  
  console.log('Attempting to require other modules...');
  const path = require('path');
  const { execFile, exec } = require('child_process');
  const fs = require('fs');
  console.log('Core modules imported successfully');
  
  console.log('Testing service imports...');
  let llmService;
  try {
    llmService = require('./src/services/togetherAIService');
    console.log('TogetherAI service imported successfully');
  } catch (error) {
    console.warn('TogetherAI service not available:', error.message);
    llmService = null;
  }
  
  function createWindow() {
    console.log('Creating window...');
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
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