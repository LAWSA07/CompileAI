// Renderer process for LAWSA Cursor IDE

// Access to Electron IPC
const { ipcRenderer } = window.electronAPI;

// Import services
const MemoryService = require('./src/services/memoryService');
const LLMService = require('./src/services/llmService');
const AICompletionService = require('./src/services/aiCompletionService');

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

// Services
let memoryService = null;
let llmService = null;
let aiCompletionService = null;

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

// Initialize services
async function initializeServices() {
  try {
    showLoading('Initializing AI services...');
    
    // Initialize memory service
    memoryService = new MemoryService(process.cwd());
    const memoryResult = await memoryService.initialize();
    
    if (!memoryResult.success) {
      console.error('Memory service initialization failed:', memoryResult.error);
      showToast('Memory service failed to initialize', 'error');
    }
    
    // Initialize LLM service
    const apiKey = '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';
    llmService = new LLMService(apiKey);
    const llmResult = await llmService.initialize();
    
    if (!llmResult.success) {
      console.error('LLM service initialization failed:', llmResult.error);
      showToast('LLM service failed to initialize', 'error');
    }
    
    // Initialize AI completion service
    if (memoryService && llmService) {
      aiCompletionService = new AICompletionService(memoryService, llmService);
      showToast('AI services initialized successfully', 'success');
    }
    
    hideLoading();
  } catch (error) {
    console.error('Service initialization error:', error);
    hideLoading();
    showToast('Service initialization failed', 'error');
  }
}

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
    wordWrap: 'off',
    suggestOnTriggerCharacters: true,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    }
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
    
    // Update context in memory
    if (memoryService) {
      memoryService.updateContext({
        cursorPosition: { line: position.lineNumber, column: position.column }
      });
    }
  });
  
  // Track content changes
  editor.onDidChangeModelContent(e => {
    const content = editor.getValue();
    
    // Update file in memory
    if (memoryService && currentFilePath) {
      memoryService.updateFile(currentFilePath, content);
    }
    
    // Update context
    if (memoryService) {
      memoryService.updateContext({
        selectedCode: getSelectedText()
      });
    }
  });
  
  // Register AI completion provider
  if (aiCompletionService) {
    aiCompletionService.registerCompletionProvider(monaco);
  }
  
  // Mark the editor as initialized
  statusMessage.textContent = 'Editor Ready';
  
  // Initialize services after editor is ready
  initializeServices();
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
    // Update memory with current code
    if (memoryService && currentFilePath) {
      await memoryService.updateFile(currentFilePath, code);
    }
    
    // Compile using the LAWSA compiler
    const result = await ipcRenderer.invoke('compile-code', code);
    
    if (result.success) {
      updateConsole(result.output);
      updateAssembly(result.assembly);
      showToast('Compilation successful', 'success');
      
      // Add to memory history
      if (memoryService) {
        memoryService.addToHistory({
          type: 'compilation',
          success: true,
          output: result.output
        });
      }
    } else {
      updateConsole(result.error);
      showToast('Compilation failed', 'error');
      
      // Try AI error diagnosis
      if (llmService && memoryService) {
        const context = await memoryService.getAIContext();
        const diagnosis = await llmService.diagnoseError(context, result.error, code);
        
        if (diagnosis.success) {
          updateConsole(`AI Diagnosis: ${diagnosis.diagnosis}`);
          if (diagnosis.suggestedFix) {
            updateConsole(`Suggested Fix:\n${diagnosis.suggestedFix}`);
          }
        }
      }
    }
  } catch (error) {
    updateConsole(`Error: ${error.message}`);
    showToast('Compilation error', 'error');
  } finally {
    hideLoading();
  }
});

// Run button handler
runBtn.addEventListener('click', async () => {
  const code = editor.getValue();
  showLoading('Running...');
  
  try {
    const result = await ipcRenderer.invoke('run-code', code);
    
    if (result.success) {
      updateConsole(`Program output:\n${result.output}`);
      showToast('Program executed successfully', 'success');
    } else {
      updateConsole(`Runtime error: ${result.error}`);
      showToast('Runtime error', 'error');
    }
  } catch (error) {
    updateConsole(`Error: ${error.message}`);
    showToast('Execution error', 'error');
  } finally {
    hideLoading();
  }
});

// Refactor button handler
refactorBtn.addEventListener('click', async () => {
  const code = editor.getValue();
  const selectedText = getSelectedText();
  const textToRefactor = selectedText || code;
  
  if (!textToRefactor.trim()) {
    showToast('No code to refactor', 'warning');
    return;
  }
  
  showLoading('AI Refactoring...');
  
  try {
    let refactoredCode;
    
    if (llmService && memoryService) {
      // Use AI refactoring
      const context = await memoryService.getAIContext();
      const result = await llmService.generateCodeRefactoring(context, textToRefactor);
      
      if (result.success) {
        refactoredCode = result.refactoredCode;
        
        // Add AI interaction to memory
        await memoryService.addAIInteraction({
          type: 'refactoring',
          originalCode: textToRefactor,
          refactoredCode: refactoredCode,
          explanation: result.explanation
        });
      } else {
        throw new Error(result.error);
      }
    } else {
      // Fallback to local refactoring
      const localRefactor = require('./src/services/localRefactorService');
      refactoredCode = await localRefactor.refactorCCode(textToRefactor);
    }
    
    if (selectedText) {
      // Replace selected text
      const selection = editor.getSelection();
      editor.executeEdits('refactor', [{
        range: selection,
        text: refactoredCode
      }]);
    } else {
      // Replace entire content
      editor.setValue(refactoredCode);
    }
    
    showDiff(selectedText || code, refactoredCode);
    showToast('Code refactored successfully', 'success');
    
  } catch (error) {
    updateConsole(`Refactoring error: ${error.message}`);
    showToast('Refactoring failed', 'error');
  } finally {
    hideLoading();
  }
});

// Open button handler
openBtn.addEventListener('click', async () => {
  try {
    const result = await ipcRenderer.invoke('open-file');
    
    if (result.success) {
      currentFilePath = result.filePath;
      editor.setValue(result.content);
      currentFileLabel.textContent = result.fileName;
      
      // Update memory
      if (memoryService) {
        await memoryService.updateFile(currentFilePath, result.content);
        await memoryService.updateContext({
          currentFile: currentFilePath
        });
      }
      
      showToast('File opened successfully', 'success');
    }
  } catch (error) {
    showToast('Failed to open file', 'error');
  }
});

// Save button handler
saveBtn.addEventListener('click', async () => {
  const content = editor.getValue();
  
  try {
    const result = await ipcRenderer.invoke('save-file', {
      filePath: currentFilePath,
      content: content
    });
    
    if (result.success) {
      currentFilePath = result.filePath;
      currentFileLabel.textContent = result.fileName;
      
      // Update memory
      if (memoryService) {
        await memoryService.updateFile(currentFilePath, content);
      }
      
      showToast('File saved successfully', 'success');
    }
  } catch (error) {
    showToast('Failed to save file', 'error');
  }
});

// Utility functions
function getSelectedText() {
  const selection = editor.getSelection();
  if (selection.isEmpty()) {
    return '';
  }
  return editor.getValueInRange(selection);
}

function updateConsole(text) {
  consolePanel.innerHTML = `<pre>${text}</pre>`;
  
  // Switch to console tab
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.panel-tab[data-panel="console"]').classList.add('active');
  
  document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
  consolePanel.classList.add('active');
}

function updateAssembly(assembly) {
  assemblyPanel.innerHTML = `<pre>${assembly}</pre>`;
}

function showDiff(original, modified) {
  const diff = require('diff-match-patch');
  const dmp = new diff();
  const diffs = dmp.diff_main(original, modified);
  dmp.diff_cleanupSemantic(diffs);
  
  let diffHtml = '';
  diffs.forEach(([type, text]) => {
    switch (type) {
      case 1: // Insert
        diffHtml += `<span style="background-color: #4caf50; color: white;">${text}</span>`;
        break;
      case -1: // Delete
        diffHtml += `<span style="background-color: #f44336; color: white;">${text}</span>`;
        break;
      default: // Equal
        diffHtml += text;
    }
  });
  
  diffPanel.innerHTML = `<pre>${diffHtml}</pre>`;
  
  // Switch to diff tab
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.panel-tab[data-panel="diff"]').classList.add('active');
  
  document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
  diffPanel.classList.add('active');
}

function showLoading(message = 'Processing...') {
  loadingIndicator.textContent = message;
  loadingIndicator.style.display = 'block';
}

function hideLoading() {
  loadingIndicator.style.display = 'none';
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notification');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 's':
        e.preventDefault();
        saveBtn.click();
        break;
      case 'o':
        e.preventDefault();
        openBtn.click();
        break;
      case 'Enter':
        e.preventDefault();
        compileBtn.click();
        break;
    }
  }
});

// Initialize AI suggestions on editor focus
editor?.onDidFocusEditorWidget(() => {
  if (aiCompletionService) {
    // Trigger AI suggestions
    const position = editor.getPosition();
    aiCompletionService.generateCompletions(editor.getModel(), position);
  }
}); 