// Renderer process for LAWSA Cursor IDE

// Access to Electron IPC
const { ipcRenderer } = window.electronAPI;

// Import services
const MemoryService = require('./src/services/memoryService');
const LLMService = require('./src/services/llmService');
const AICompletionService = require('./src/services/aiCompletionService');
const CodeGenerationService = require('./src/services/codeGenerationService');

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
let codeGenerationService = null;

// Project state
let projectFiles = new Map();
let currentProject = null;

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
    memoryService = new MemoryService();
    const memoryResult = memoryService.initialize(process.cwd());
    
    if (!memoryResult) {
      console.error('Memory service initialization failed');
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
      aiCompletionService = new AICompletionService(llmService);
      codeGenerationService = new CodeGenerationService(llmService, memoryService);
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
    aiCompletionService.registerCompletionProvider(monaco, editor);
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
      memoryService.updateFile(currentFilePath, code);
    }
    
    // Compile using the LAWSA compiler
    const result = await ipcRenderer.invoke('compile-code', code);
    
    if (result.success) {
      updateConsole(result.output);
      updateAssembly(result.assembly);
      showToast('Compilation successful', 'success');
      
      // Add to memory history
      if (memoryService) {
        memoryService.addToHistory('compilation', {
          success: true,
          output: result.output
        });
      }
    } else {
      updateConsole(result.error);
      showToast('Compilation failed', 'error');
      
      // Try AI error diagnosis
      if (llmService && memoryService) {
        const context = memoryService.getAIContext();
        const diagnosis = await llmService.diagnoseError(result.error, code, context);
        
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
      const context = memoryService.getAIContext();
      const result = await llmService.generateCodeRefactoring(textToRefactor, 'Improve code quality and readability');
      
      if (result.success) {
        refactoredCode = result.refactoredCode;
        
        // Add AI interaction to memory
        memoryService.addAIInteraction('refactoring', 
          `Refactor this code: ${textToRefactor}`, 
          result.explanation, 
          { originalCode: textToRefactor, refactoredCode: refactoredCode }
        );
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
        memoryService.updateFile(currentFilePath, result.content);
        memoryService.updateContext({
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
        memoryService.updateFile(currentFilePath, content);
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

// Generate button handler - setup after DOM is loaded
function setupGenerateButton() {
  const generateBtn = document.getElementById('generate-btn');
  console.log('Generate button element:', generateBtn);

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      console.log('Generate button clicked!');
      
      const promptInput = document.getElementById('prompt-input');
      console.log('Prompt input element:', promptInput);
      
      if (!promptInput) {
        showToast('Prompt input not found', 'error');
        return;
      }
      
      const promptText = promptInput.value.trim();
      console.log('Prompt text:', promptText);

      if (!promptText) {
        showToast('Please enter a prompt to generate code.', 'warning');
        return;
      }

      console.log('Code generation service:', codeGenerationService);
      if (!codeGenerationService) {
        showToast('Code generation service not available. Please wait for initialization.', 'error');
        return;
      }

  showLoading('🚀 Generating project structure...');
  showGenerationProgress(true);

  try {
    const result = await codeGenerationService.generateProjectFromPrompt(promptText);

    if (result.success) {
      currentProject = result.structure;
      projectFiles.clear();

      // Add all generated files to project
      result.files.forEach(file => {
        projectFiles.set(file.name, file);
      });

      // Update file explorer
      updateFileExplorer();

      // Set main file in editor
      if (result.mainFile) {
        editor.setValue(result.mainFile.content);
        currentFileLabel.textContent = result.mainFile.name;
        currentFilePath = result.mainFile.name;
      }

      // Update generation panel with explanation
      updateGenerationPanel(result);

      showToast('🎉 Project generated successfully!', 'success');
      
      // Clear prompt input
      promptInput.value = '';
      
      // Add to memory
      if (memoryService) {
        memoryService.addAIInteraction('code_generation', promptText, result.explanation, {
          projectStructure: result.structure,
          filesGenerated: result.files.length
        });
      }
    } else {
      throw new Error(result.error || 'Failed to generate project');
    }
  } catch (error) {
    console.error('Project generation error:', error);
    showToast('❌ Failed to generate project: ' + error.message, 'error');
    updateGenerationPanel({ error: error.message });
  } finally {
    hideLoading();
    showGenerationProgress(false);
  }
    });
  } else {
    console.error('Generate button not found!');
  }
}

// File explorer update function
function updateFileExplorer() {
  const explorer = document.getElementById('file-explorer');
  if (!explorer) return;
  
  explorer.innerHTML = '';

  if (projectFiles.size === 0) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'file-item';
    emptyItem.textContent = '📂 No files generated yet';
    emptyItem.style.opacity = '0.6';
    explorer.appendChild(emptyItem);
    return;
  }

  projectFiles.forEach((file, fileName) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.file = fileName;
    
    // Add appropriate icon based on file type
    const icon = fileName.endsWith('.h') ? '📋' : fileName.endsWith('.c') ? '📄' : '📄';
    fileItem.innerHTML = `${icon} ${fileName}`;
    
    fileItem.addEventListener('click', () => {
      // Remove active class from all items
      document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
      fileItem.classList.add('active');
      
      // Load file content in editor
      editor.setValue(file.content);
      currentFileLabel.textContent = fileName;
      currentFilePath = fileName;
      
      // Update memory with current file
      if (memoryService) {
        memoryService.updateContext({
          currentFile: fileName
        });
      }
    });

    explorer.appendChild(fileItem);
  });
  
  // Update file count in status bar
  const fileCountElement = document.getElementById('file-count');
  if (fileCountElement) {
    const count = projectFiles.size;
    fileCountElement.textContent = `${count} file${count !== 1 ? 's' : ''}`;
  }
}

// Generation panel update function
function updateGenerationPanel(result) {
  const generationPanel = document.getElementById('generation-panel');
  if (!generationPanel) return;
  
  if (result.error) {
    generationPanel.innerHTML = `
      <div style="color: #f44336; padding: 12px;">
        <h3>❌ Generation Failed</h3>
        <p>Error: ${result.error}</p>
        <p style="margin-top: 8px; opacity: 0.8;">Please try again with a different prompt or check your API connection.</p>
      </div>
    `;
    return;
  }
  
  const filesHtml = result.files?.map(file => 
    `<div style="margin: 4px 0; padding: 4px 8px; background-color: var(--bg-color); border-radius: 4px;">
      <span style="color: var(--accent-color);">${file.name}</span> - ${file.purpose || 'Source file'}
    </div>`
  ).join('') || '';
  
  generationPanel.innerHTML = `
    <div style="padding: 12px;">
      <h3 style="color: var(--accent-color); margin-bottom: 12px;">🎉 Generation Successful</h3>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin-bottom: 8px;">Project Structure:</h4>
        <div style="background-color: var(--bg-color); padding: 8px; border-radius: 4px; font-family: monospace;">
          ${result.structure?.name || 'Generated Project'}
        </div>
      </div>
      
      ${result.files?.length ? `
        <div style="margin-bottom: 16px;">
          <h4 style="margin-bottom: 8px;">Generated Files (${result.files.length}):</h4>
          ${filesHtml}
        </div>
      ` : ''}
      
      ${result.explanation ? `
        <div>
          <h4 style="margin-bottom: 8px;">Explanation:</h4>
          <div style="background-color: var(--bg-color); padding: 8px; border-radius: 4px; line-height: 1.5;">
            ${result.explanation}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  // Switch to generation tab
  document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.panel-tab[data-panel="generation"]')?.classList.add('active');
  
  document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
  generationPanel.classList.add('active');
}

// Generation progress function
function showGenerationProgress(show) {
  const progressElement = document.getElementById('generation-progress');
  const progressFill = document.getElementById('progress-fill');
  
  if (!progressElement || !progressFill) return;
  
  if (show) {
    progressElement.style.display = 'block';
    
    // Animate progress bar
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressFill.style.width = `${progress}%`;
    }, 500);
    
    // Store interval for cleanup
    progressElement.dataset.interval = interval;
  } else {
    // Complete progress and hide
    progressFill.style.width = '100%';
    
    const interval = progressElement.dataset.interval;
    if (interval) {
      clearInterval(interval);
    }
    
    setTimeout(() => {
      progressElement.style.display = 'none';
      progressFill.style.width = '0%';
    }, 500);
  }
}

// Initialize AI suggestions on editor focus
editor?.onDidFocusEditorWidget(() => {
  if (aiCompletionService) {
    // Trigger AI suggestions
    const position = editor.getPosition();
    aiCompletionService.generateCompletions(editor.getModel(), position);
  }
});

// Initialize file explorer
updateFileExplorer();

// Setup generate button after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  setupGenerateButton();
});

// Also try to setup immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupGenerateButton);
} else {
  setupGenerateButton();
}
