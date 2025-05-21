// Renderer process for LAWSA C Compiler

// Access to Electron IPC
const { ipcRenderer } = window.electronAPI;

// Default C code
const defaultCode = `#include <stdio.h>

int main() {
    printf("Hello, LAWSA!\\n");
    return 0;
}`;

// State variables
let editor = null;
let originalCode = defaultCode;
let currentFilePath = null;
let diffEditor = null;

// DOM Elements
const compileBtn = document.getElementById('compile-btn');
const runBtn = document.getElementById('run-btn');
const refactorBtn = document.getElementById('refactor-btn');
const openBtn = document.getElementById('open-btn');
const saveBtn = document.getElementById('save-btn');
const consolePanel = document.getElementById('console-panel');
const assemblyPanel = document.getElementById('assembly-panel');
const diffPanel = document.getElementById('diff-panel');
const currentFileLabel = document.getElementById('current-file');
const statusMessage = document.getElementById('status-message');
const cursorPosition = document.getElementById('cursor-position');
const loadingIndicator = document.getElementById('loading-indicator');
const toastNotification = document.getElementById('toast-notification');

// Initialize Monaco Editor
require.config({ paths: { vs: './node_modules/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function() {
  // Set up editor with C language
  monaco.languages.register({ id: 'c' });
  
  // Create the editor
  editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    value: defaultCode,
    language: 'c',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14,
    minimap: {
      enabled: true
    },
    scrollBeyondLastLine: false,
    renderLineHighlight: 'all',
    lineNumbers: 'on',
    rulers: [],
    wordWrap: 'off'
  });
  
  // Set up resizable panels
  Split(['.editor-container', '.panel-container'], {
    sizes: [75, 25],
    minSize: [200, 100],
    direction: 'vertical',
    gutterSize: 5,
    onDragEnd: function() {
      editor.layout();
    }
  });
  
  // Track cursor position
  editor.onDidChangeCursorPosition(e => {
    const position = e.position;
    cursorPosition.textContent = `Line: ${position.lineNumber}, Column: ${position.column}`;
  });
  
  // Mark the editor as initialized
  statusMessage.textContent = 'Editor Ready';
});

// Tab switching in panels
document.querySelectorAll('.panel-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const panel = tab.getAttribute('data-panel');
    
    // Update active tab
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show selected panel
    document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
    document.getElementById(`${panel}-panel`).classList.add('active');
  });
});

// Compile button handler
compileBtn.addEventListener('click', async () => {
  const code = editor.getValue();
  showLoading('Compiling...');
  
  try {
    const result = await ipcRenderer.invoke('compile-c', code);
    
    if (result.success) {
      showToast('Compilation successful', 'success');
      updateConsole(`Compilation successful\n${result.stdout}`);
      
      // Check if result contains assembly code, show in assembly panel
      if (result.assembly) {
        assemblyPanel.textContent = result.assembly;
        // Show assembly tab
        document.querySelector('.panel-tab[data-panel="assembly"]').click();
      }
    } else {
      showToast('Compilation failed', 'error');
      updateConsole(`Compilation failed\n${result.stderr}`);
    }
  } catch (error) {
    showToast('Error during compilation', 'error');
    updateConsole(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Run button handler
runBtn.addEventListener('click', async () => {
  const code = editor.getValue();
  showLoading('Running...');
  
  try {
    const result = await ipcRenderer.invoke('run-c', code);
    
    if (result.success) {
      showToast('Program executed successfully', 'success');
      updateConsole(`Program output:\n${result.output}\n\nProcess details:\n${result.process}`);
    } else {
      showToast('Execution failed', 'error');
      updateConsole(`Execution failed\n${result.process}\n${result.error || ''}`);
    }
  } catch (error) {
    showToast('Error during execution', 'error');
    updateConsole(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Refactor button handler
refactorBtn.addEventListener('click', async () => {
  const code = editor.getValue();
  originalCode = code;
  
  showLoading('Refactoring code with AI...');
  
  try {
    const refactoredCode = await ipcRenderer.invoke('send-code-to-llm', code);
    
    // Log the received code for debugging
    console.log("Original code:", originalCode);
    console.log("Refactored code:", refactoredCode);
    
    // Set up the diff editor in the diff panel
    diffPanel.innerHTML = '';
    const diffContainer = document.createElement('div');
    diffContainer.style.width = '100%';
    diffContainer.style.height = 'calc(100% - 50px)'; // Leave room for the button
    diffPanel.appendChild(diffContainer);
    
    // Show the diff panel first so monaco can calculate sizes correctly
    document.querySelector('.panel-tab[data-panel="diff"]').click();
    
    // Create diff editor with modified settings
    diffEditor = monaco.editor.createDiffEditor(diffContainer, {
      originalEditable: false,
      readOnly: false,
      renderSideBySide: true,
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14
    });
    
    // Wait a bit for the DOM to update before setting models
    setTimeout(() => {
      const originalModel = monaco.editor.createModel(originalCode, 'c');
      const modifiedModel = monaco.editor.createModel(refactoredCode, 'c');
      
      diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
      });
      
      // Force a layout update
      diffEditor.layout();
      
      // Also display a text summary of changes in console
      updateConsole(`Refactoring completed.\n\nOriginal size: ${originalCode.length} bytes\nRefactored size: ${refactoredCode.length} bytes`);
    }, 100);
    
    // Create apply button
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply Refactoring';
    applyBtn.className = 'toolbar-button';
    applyBtn.style.margin = '10px';
    applyBtn.addEventListener('click', () => {
      editor.setValue(refactoredCode);
      document.querySelector('.panel-tab[data-panel="console"]').click();
      diffPanel.removeChild(applyBtn);
      showToast('Refactoring applied', 'success');
    });
    
    diffPanel.appendChild(applyBtn);
    
    showToast('Refactoring suggestion ready', 'success');
  } catch (error) {
    showToast('Error during refactoring', 'error');
    updateConsole(`Error: ${error.message}`);
  } finally {
    hideLoading();
  }
});

// Open button handler
openBtn.addEventListener('click', async () => {
  try {
    const result = await ipcRenderer.invoke('open-file');
    
    if (result.success) {
      editor.setValue(result.content);
      currentFilePath = result.filePath;
      currentFileLabel.textContent = result.filePath.split(/[/\\]/).pop(); // Show just the filename
      showToast('File opened', 'success');
    }
  } catch (error) {
    showToast('Error opening file', 'error');
    updateConsole(`Error: ${error.message}`);
  }
});

// Save button handler
saveBtn.addEventListener('click', async () => {
  try {
    const content = editor.getValue();
    const result = await ipcRenderer.invoke('save-file', { content, filePath: currentFilePath });
    
    if (result.success) {
      currentFilePath = result.filePath;
      currentFileLabel.textContent = result.filePath.split(/[/\\]/).pop(); // Show just the filename
      showToast('File saved', 'success');
    }
  } catch (error) {
    showToast('Error saving file', 'error');
    updateConsole(`Error: ${error.message}`);
  }
});

// Helper function to update console
function updateConsole(text) {
  consolePanel.textContent = text;
  
  // If console panel is not active, highlight its tab
  if (!document.getElementById('console-panel').classList.contains('active')) {
    const consoleTab = document.querySelector('.panel-tab[data-panel="console"]');
    consoleTab.style.fontWeight = 'bold';
    consoleTab.style.color = '#3c9bf9';
    
    // Reset when clicked
    consoleTab.addEventListener('click', function resetTab() {
      consoleTab.style.fontWeight = 'normal';
      consoleTab.style.color = '';
      consoleTab.removeEventListener('click', resetTab);
    }, { once: true });
  }
}

// Helper function to show loading indicator
function showLoading(message = 'Processing...') {
  loadingIndicator.textContent = message;
  loadingIndicator.style.display = 'block';
  statusMessage.textContent = message;
}

// Helper function to hide loading indicator
function hideLoading() {
  loadingIndicator.style.display = 'none';
  statusMessage.textContent = 'Ready';
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
  toastNotification.textContent = message;
  toastNotification.className = 'toast';
  
  if (type === 'success') {
    toastNotification.style.backgroundColor = '#4caf50';
  } else if (type === 'error') {
    toastNotification.style.backgroundColor = '#f44336';
  } else {
    toastNotification.style.backgroundColor = '#3c9bf9';
  }
  
  toastNotification.classList.add('show');
  
  setTimeout(() => {
    toastNotification.classList.remove('show');
  }, 3000);
} 