const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      const validChannels = [
        'compile-c',
        'run-c',
        'send-code-to-llm',
        'open-file',
        'save-file'
      ];
      
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      
      return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
    }
  }
}); 