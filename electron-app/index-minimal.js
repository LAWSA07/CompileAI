const path = require('path');
const { execFile, exec } = require('child_process');
const fs = require('fs');

// Import Electron modules individually to debug
let app, BrowserWindow, ipcMain, dialog;

try {
  const electron = require('electron');
  console.log('Electron imported, type:', typeof electron);
  
  // Try different ways to access Electron modules
  if (electron.app) {
    ({ app, BrowserWindow, ipcMain, dialog } = electron);
  } else if (electron.default) {
    ({ app, BrowserWindow, ipcMain, dialog } = electron.default);
  } else {
    // Fallback: try to access directly
    app = electron.app || require('electron').app;
    BrowserWindow = electron.BrowserWindow || require('electron').BrowserWindow;
    ipcMain = electron.ipcMain || require('electron').ipcMain;
    dialog = electron.dialog || require('electron').dialog;
  }
  
  if (!app) {
    throw new Error('Could not access Electron app module');
  }
  
  console.log('Electron modules loaded successfully');
} catch (error) {
  console.error('Failed to load Electron:', error);
  process.exit(1);
}

function createWindow() {
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
}

app.whenReady().then(createWindow);

// Basic IPC handlers for compile and run
ipcMain.handle('compile-code', async (event, code) => {
  const tempPath = path.join(app.getPath('temp'), 'lawsa_temp.c');
  const codeWithCRLF = code.replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(tempPath, codeWithCRLF);
  
  const exePath = path.join(__dirname, '../preprocess.exe');
  
  if (!fs.existsSync(exePath)) {
    const errMsg = `Compiler executable not found: ${exePath}`;
    return { stdout: '', stderr: errMsg, error: errMsg, success: false };
  }

  return new Promise((resolve) => {
    execFile(exePath, [tempPath], (error, stdout, stderr) => {
      if (error) {
        resolve({ stdout, stderr, error: error.message, success: false });
      } else {
        resolve({ stdout, stderr, error: null, success: true });
      }
    });
  });
});

ipcMain.handle('run-code', async (event, code) => {
  const tempDir = app.getPath('temp');
  const tempC = path.join(tempDir, 'lawsa_temp_run.c');
  const tempExe = path.join(tempDir, 'lawsa_temp_run.exe');
  fs.writeFileSync(tempC, code.replace(/\r?\n/g, '\r\n'));

  return new Promise((resolve) => {
    exec(`gcc "${tempC}" -o "${tempExe}"`, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        resolve({ output: '', error: compileErr.message, success: false });
        return;
      }

      execFile(tempExe, [], { timeout: 5000 }, (runErr, stdout, stderr) => {
        if (fs.existsSync(tempExe)) {
          try { fs.unlinkSync(tempExe); } catch (e) { }
        }

        if (runErr) {
          resolve({ output: stdout, error: runErr.message, success: false });
        } else {
          resolve({ output: stdout, error: null, success: true });
        }
      });
    });
  });
});

ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      { name: 'C Files', extensions: ['c', 'h'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) {
    return { success: false, content: null, filePath: null };
  }

  const filePath = filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    return { success: true, content, filePath, fileName };
  } catch (error) {
    return { success: false, content: null, filePath, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, { content, filePath }) => {
  let savePath = filePath;
  if (!savePath) {
    const { canceled, filePath: newFilePath } = await dialog.showSaveDialog({
      filters: [
        { name: 'C Files', extensions: ['c', 'h'] },
        { name: 'All Files', extensions: ['*'] }
      ],
    });

    if (canceled || !newFilePath) {
      return { success: false };
    }
    savePath = newFilePath;
  }

  try {
    fs.writeFileSync(savePath, content, 'utf-8');
    const fileName = path.basename(savePath);
    return { success: true, filePath: savePath, fileName };
  } catch (error) {
    return { success: false, error: error.message };
  }
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