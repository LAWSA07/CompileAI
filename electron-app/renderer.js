// Access to Electron IPC - will be available after preload
// let electronAPI; // Commented out to avoid redeclaration - will be available from preload

// Services will be handled by the main process
let memoryService, llmService, aiCompletionService, codeGenerationService;

// Default C code
const defaultCode = `#include <stdio.h>

int main() {
    printf("Hello, LAWSA!\n");
    return 0;
}`;

// State variables
let editor = null;
let originalCode = defaultCode;
let currentFilePath = null;

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

// Initialize services with proper error handling
async function initializeServices() {
  try {
    showLoading('Initializing AI services...');
    
    // Initialize project files map first
    if (typeof projectFiles === 'undefined') {
      window.projectFiles = new Map();
    }
    
    // Check service availability from preload
    const serviceStatus = window.serviceStatus || {};
    console.log('Service availability:', serviceStatus);
    
    // Try to create services directly if classes are available
    let services = {};
    
    if (typeof window.LLMService === 'function') {
      try {
        services.llmService = new window.LLMService();
        console.log('✅ LLM service created from window');
      } catch (error) {
        console.error('Failed to create LLM service:', error);
      }
    }
    
    if (typeof window.MemoryService === 'function') {
      try {
        services.memoryService = new window.MemoryService();
        console.log('✅ Memory service created from window');
      } catch (error) {
        console.error('Failed to create Memory service:', error);
      }
    }
    
    if (typeof window.CodeGenerationService === 'function' && services.llmService) {
      try {
        services.codeGenerationService = new window.CodeGenerationService(services.llmService, services.memoryService);
        console.log('✅ Code generation service created from window');
      } catch (error) {
        console.error('Failed to create Code generation service:', error);
      }
    }
    
    // Use the new service creation approach as fallback
    if (Object.keys(services).length === 0 && window.createServices) {
      services = window.createServices();
    }
    
    // Check if we have any services available
    if (Object.keys(services).length === 0) {
      console.warn('No services available, using fallback mode');
      initializeFallbackMode();
      hideLoading();
      return;
    }
    
    // Initialize memory service
    if (services.memoryService) {
      console.log('Initializing MemoryService...');
      try {
        memoryService = services.memoryService;
        const memoryResult = memoryService.initialize('.');
        
        if (!memoryResult) {
          console.warn('Memory service initialization failed, continuing without memory');
          memoryService = null;
        } else {
          console.log('Memory service initialized successfully');
        }
      } catch (error) {
        console.error('Memory service initialization error:', error);
        memoryService = null;
      }
    }
    
    // Initialize LLM service
    if (services.llmService) {
      console.log('Initializing LLMService...');
      try {
        llmService = services.llmService;
        const llmResult = await llmService.initialize();
        
        if (!llmResult.success) {
          console.warn('LLM service initialization failed:', llmResult.error);
          llmService = null;
        } else {
          console.log('LLM service initialized successfully');
        }
      } catch (error) {
        console.error('LLM service initialization error:', error);
        llmService = null;
      }
    }
    
    // Initialize AI completion service
    if (services.aiCompletionService && llmService) {
      console.log('Initializing AICompletionService...');
      try {
        aiCompletionService = services.aiCompletionService;
        console.log('AI completion service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AI completion service:', error);
        aiCompletionService = null;
      }
    }
    
    // Initialize code generation service
    if (services.codeGenerationService) {
      console.log('Initializing CodeGenerationService...');
      try {
        codeGenerationService = services.codeGenerationService;
        console.log('Code generation service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize code generation service:', error);
        codeGenerationService = null;
      }
    }
    
    // Update status based on what's available
    const servicesStatus = getServicesStatus();
    updateAIStatus(servicesStatus);
    
    if (servicesStatus.allAvailable) {
      showToast('🎉 All AI services initialized successfully', 'success');
    } else if (servicesStatus.someAvailable) {
      showToast('⚠️ Some AI services initialized', 'warning');
    } else {
      showToast('⚠️ AI services unavailable - using basic mode', 'warning');
    }
    
    hideLoading();
  } catch (error) {
    console.error('Service initialization error:', error);
    hideLoading();
    showToast('❌ Service initialization failed - using basic mode', 'error');
    initializeFallbackMode();
  }
}

// Initialize fallback mode when services aren't available
function initializeFallbackMode() {
  console.log('Initializing fallback mode...');
  
  // Initialize basic project files map
  if (typeof projectFiles === 'undefined') {
    window.projectFiles = new Map();
  }
  
  // Set all services to null
  memoryService = null;
  llmService = null;
  aiCompletionService = null;
  codeGenerationService = null;
  
  // Check if Qwen AI is available
  const qwenAvailable = window.qwenAI && window.qwenAI.isAvailable;
  
  // Update UI to reflect basic mode or Qwen availability
  updateAIStatus({
    allAvailable: false,
    someAvailable: qwenAvailable,
    basicMode: !qwenAvailable,
    qwenAvailable: qwenAvailable
  });
  
  console.log('Fallback mode initialized');
}

// Get status of all services
function getServicesStatus() {
  const memory = memoryService && memoryService.isReady();
  const llm = llmService && llmService.isInitialized;
  const completion = aiCompletionService !== null;
  const generation = codeGenerationService !== null;
  
  return {
    memory,
    llm,
    completion,
    generation,
    allAvailable: memory && llm && completion && generation,
    someAvailable: memory || llm || completion || generation,
    basicMode: !memory && !llm && !completion && !generation
  };
}

// Update AI status in the UI
function updateAIStatus(status) {
  const aiStatusElement = document.getElementById('ai-status');
  if (aiStatusElement) {
    if (status.allAvailable) {
      aiStatusElement.textContent = '🤖 AI Ready';
      aiStatusElement.style.color = '#4caf50';
    } else if (status.qwenAvailable) {
      aiStatusElement.textContent = '🤖 Qwen AI';
      aiStatusElement.style.color = '#4caf50';
    } else if (status.someAvailable) {
      aiStatusElement.textContent = '🤖 AI Partial';
      aiStatusElement.style.color = '#ff9800';
    } else {
      aiStatusElement.textContent = '🤖 AI Unavailable';
      aiStatusElement.style.color = '#f44336';
    }
  }
}

// Initialize Monaco Editor with proper CDN loading
function initializeMonacoFromCDN() {
  if (typeof require !== 'undefined' && require.config) {
    // Use AMD loader if available
    require.config({
      paths: {
        vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs'
      }
    });
    require(['vs/editor/editor.main'], async function() {
      console.log('Monaco Editor loaded via AMD');
      await initializeMonacoEditor();
    });
  } else if (typeof monaco !== 'undefined') {
    // Monaco already loaded globally
    console.log('Monaco Editor available globally');
    initializeMonacoEditor();
  } else {
    // Wait for Monaco to load from CDN
    console.log('Waiting for Monaco Editor to load from CDN...');
    const checkMonaco = setInterval(() => {
      if (typeof monaco !== 'undefined') {
        clearInterval(checkMonaco);
        console.log('Monaco Editor loaded from CDN');
        initializeMonacoEditor();
      }
    }, 100);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkMonaco);
      if (typeof monaco === 'undefined') {
        console.error('Monaco Editor failed to load from CDN');
        showToast('Monaco Editor failed to load', 'error');
        // Initialize basic functionality without Monaco
        initializeBasicEditor();
      }
    }, 10000);
  }
}

// Initialize Monaco Editor when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMonacoFromCDN);
} else {
  initializeMonacoFromCDN();
}

async function initializeMonacoEditor() {
  try {
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
    if (typeof Split !== 'undefined') {
      Split(['.editor-container', '.panel-container'], {
        sizes: [75, 25],
        minSize: [200, 100],
        direction: 'vertical',
        gutterSize: 5,
        onDragEnd: function() {
          editor.layout();
        }
      });
    }
    
    // Track cursor position
    editor.onDidChangeCursorPosition(e => {
      const position = e.position;
      cursorPosition.textContent = `Line: ${position.lineNumber}, Column: ${position.column}`;
      
      // Update context in memory
      if (memoryService && memoryService.isReady()) {
        try {
          memoryService.updateContext({
            cursorPosition: { line: position.lineNumber, column: position.column }
          });
        } catch (error) {
          console.warn('Failed to update cursor position in memory:', error);
        }
      }
    });
    
    // Track content changes
    editor.onDidChangeModelContent(e => {
      const content = editor.getValue();
      
      // Update file in memory
      if (memoryService && memoryService.isReady() && currentFilePath) {
        try {
          memoryService.updateFile(currentFilePath, content);
        } catch (error) {
          console.warn('Failed to update file in memory:', error);
        }
      }
      
      // Update context
      if (memoryService && memoryService.isReady()) {
        try {
          memoryService.updateContext({
            selectedCode: getSelectedText()
          });
        } catch (error) {
          console.warn('Failed to update context in memory:', error);
        }
      }
    });
    
    // Mark the editor as initialized
    statusMessage.textContent = '🟢 Editor Ready';
    console.log('Monaco Editor initialized successfully');
    
    // Initialize services after editor is ready
    await initializeServices();
    
    // Setup generate button after services are initialized
    setupGenerateButton();
    
    // Register AI completion provider after services are ready
    if (aiCompletionService) {
      try {
        aiCompletionService.registerCompletionProvider(monaco, editor);
        console.log('AI completion provider registered');
      } catch (error) {
        console.warn('Failed to register AI completion provider:', error);
      }
    }
    
  } catch (error) {
    console.error('Error initializing Monaco Editor:', error);
    showToast('Monaco Editor initialization failed', 'error');
    // Fall back to basic editor
    initializeBasicEditor();
  }
}

// Fallback basic editor without Monaco
function initializeBasicEditor() {
  const editorContainer = document.getElementById('monaco-editor');
  editorContainer.innerHTML = `
    <textarea id="basic-editor" style="
      width: 100%;
      height: 100%;
      background-color: #1e1e1e;
      color: #e0e0e0;
      border: none;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      padding: 10px;
      resize: none;
      outline: none;
    ">${defaultCode}</textarea>
  `;
  
  const basicEditor = document.getElementById('basic-editor');
  
  // Create a simple editor interface
  editor = {
    getValue: () => basicEditor.value,
    setValue: (value) => { basicEditor.value = value; },
    getSelection: () => ({ isEmpty: () => true }),
    getValueInRange: () => '',
    layout: () => {},
    onDidChangeCursorPosition: () => {},
    onDidChangeModelContent: () => {}
  };
  
  statusMessage.textContent = '🟡 Basic Editor (Monaco unavailable)';
  console.log('Basic editor initialized as fallback');
  
  // Initialize services
  initializeServices().then(() => {
    setupGenerateButton();
  });
}

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
    if (memoryService && memoryService.isReady() && currentFilePath) {
      try {
        memoryService.updateFile(currentFilePath, code);
      } catch (error) {
        console.warn('Failed to update file in memory:', error);
      }
    }
    
    // Compile using the LAWSA compiler
    const result = await window.electronAPI.invoke('compile-code', code);
    
    if (result.success) {
      updateConsole(result.stdout || result.output || 'Compilation successful');
      if (result.assembly) {
        updateAssembly(result.assembly);
      }
      showToast('✅ Compilation successful', 'success');
      
      // Add to memory history
      if (memoryService && memoryService.isReady()) {
        try {
          memoryService.addToHistory('compilation', {
            success: true,
            output: result.stdout || result.output
          });
        } catch (error) {
          console.warn('Failed to add compilation to history:', error);
        }
      }
    } else {
      const errorMsg = result.error || result.stderr || 'Compilation failed';
      updateConsole(errorMsg);
      showToast('❌ Compilation failed', 'error');
      
      // Try AI error diagnosis if available
      if (llmService && llmService.isInitialized) {
        try {
          const context = memoryService && memoryService.isReady() ?
            memoryService.getAIContext() : '';
          const diagnosis = await llmService.diagnoseError(errorMsg, code, context);
          
          if (diagnosis.success) {
            updateConsole(`\n🤖 AI Diagnosis: ${diagnosis.diagnosis}`);
            if (diagnosis.suggestedFix) {
              updateConsole(`\n💡 Suggested Fix:\n${diagnosis.suggestedFix}`);
            }
          }
        } catch (error) {
          console.warn('AI error diagnosis failed:', error);
        }
      }
    }
  } catch (error) {
    const errorMsg = `Compilation error: ${error.message}`;
    updateConsole(errorMsg);
    showToast('❌ Compilation error', 'error');
    console.error('Compile button error:', error);
  } finally {
    hideLoading();
  }
});

// Run button handler
runBtn.addEventListener('click', async () => {
  const code = editor.getValue();
  showLoading('Running...');
  
  try {
    const result = await window.electronAPI.invoke('run-code', code);
    
    if (result.success) {
      const output = result.output || result.stdout || 'Program executed successfully';
      updateConsole(`🚀 Program output:\n${output}`);
      showToast('✅ Program executed successfully', 'success');
      
      // Add to memory history
      if (memoryService && memoryService.isReady()) {
        try {
          memoryService.addToHistory('execution', {
            success: true,
            output: output
          });
        } catch (error) {
          console.warn('Failed to add execution to history:', error);
        }
      }
    } else {
      const errorMsg = result.error || result.stderr || 'Runtime error occurred';
      updateConsole(`❌ Runtime error: ${errorMsg}`);
      showToast('❌ Runtime error', 'error');
    }
  } catch (error) {
    const errorMsg = `Execution error: ${error.message}`;
    updateConsole(errorMsg);
    showToast('❌ Execution error', 'error');
    console.error('Run button error:', error);
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
    showToast('⚠️ No code to refactor', 'warning');
    return;
  }
  
  showLoading('🤖 AI Refactoring...');
  
  try {
    let refactoredCode;
    
    if (llmService && llmService.isInitialized) {
      // Use AI refactoring
      try {
        const context = memoryService && memoryService.isReady() ?
          memoryService.getAIContext() : '';
        const result = await llmService.generateCodeRefactoring(textToRefactor, 'Improve code quality and readability');
        
        if (result.success) {
          refactoredCode = result.refactoredCode;
          
          // Add AI interaction to memory
          if (memoryService && memoryService.isReady()) {
            try {
              memoryService.addAIInteraction('refactoring',
                `Refactor this code: ${textToRefactor}`,
                result.explanation,
                { originalCode: textToRefactor, refactoredCode: refactoredCode }
              );
            } catch (error) {
              console.warn('Failed to add refactoring to memory:', error);
            }
          }
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.warn('AI refactoring failed, using basic formatting:', error);
        refactoredCode = textToRefactor.trim();
        showToast('⚠️ Using basic formatting (AI refactoring failed)', 'warning');
      }
    } else {
      // Fallback to local refactoring - just format the code
      refactoredCode = textToRefactor.trim();
      showToast('⚠️ Using basic formatting (AI services unavailable)', 'warning');
    }
    
    if (selectedText && editor.executeEdits) {
      // Replace selected text (Monaco Editor)
      const selection = editor.getSelection();
      editor.executeEdits('refactor', [{
        range: selection,
        text: refactoredCode
      }]);
    } else {
      // Replace entire content or fallback for basic editor
      editor.setValue(refactoredCode);
    }
    
    showDiff(selectedText || code, refactoredCode);
    showToast('✅ Code refactored successfully', 'success');
    
  } catch (error) {
    updateConsole(`❌ Refactoring error: ${error.message}`);
    showToast('❌ Refactoring failed', 'error');
    console.error('Refactor button error:', error);
  } finally {
    hideLoading();
  }
});

// Open button handler
openBtn.addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.invoke('open-file');
    
    if (result.success) {
      currentFilePath = result.filePath;
      const fileName = result.fileName || result.filePath.split(/[/\\]/).pop();
      editor.setValue(result.content);
      currentFileLabel.textContent = fileName;
      
      // Update memory
      if (memoryService && memoryService.isReady()) {
        try {
          memoryService.updateFile(currentFilePath, result.content);
          memoryService.updateContext({
            currentFile: currentFilePath
          });
        } catch (error) {
          console.warn('Failed to update memory with opened file:', error);
        }
      }
      
      showToast('📂 File opened successfully', 'success');
    } else {
      showToast('❌ Failed to open file', 'error');
    }
  } catch (error) {
    showToast('❌ Failed to open file', 'error');
    console.error('Open file error:', error);
  }
});

// Save button handler
saveBtn.addEventListener('click', async () => {
  const content = editor.getValue();
  
  try {
    const result = await window.electronAPI.invoke('save-file', {
      filePath: currentFilePath,
      content: content
    });
    
    if (result.success) {
      currentFilePath = result.filePath;
      const fileName = result.fileName || result.filePath.split(/[/\\]/).pop();
      currentFileLabel.textContent = fileName;
      
      // Update memory
      if (memoryService && memoryService.isReady()) {
        try {
          memoryService.updateFile(currentFilePath, content);
        } catch (error) {
          console.warn('Failed to update memory with saved file:', error);
        }
      }
      
      showToast('💾 File saved successfully', 'success');
    } else {
      showToast('❌ Failed to save file', 'error');
    }
  } catch (error) {
    showToast('❌ Failed to save file', 'error');
    console.error('Save file error:', error);
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
  // Simple diff display without external library
  const diffHtml = `
    <div style="display: flex; height: 100%;">
      <div style="flex: 1; padding: 8px; border-right: 1px solid #333;">
        <h4 style="margin: 0 0 8px 0; color: #f44336;">Original</h4>
        <pre style="margin: 0; white-space: pre-wrap; font-size: 12px;">${original}</pre>
      </div>
      <div style="flex: 1; padding: 8px;">
        <h4 style="margin: 0 0 8px 0; color: #4caf50;">Refactored</h4>
        <pre style="margin: 0; white-space: pre-wrap; font-size: 12px;">${modified}</pre>
      </div>
    </div>
  `;
  
  diffPanel.innerHTML = diffHtml;
  
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

// Fallback code generation function
function generateBasicCode(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  let generatedCode = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`;
  
  let explanation = 'Generated a basic Hello World C program.';
  
  if (lowerPrompt.includes('calculator')) {
    generatedCode = `#include <stdio.h>

int main() {
    int a, b, result;
    char operation;
    
    printf("Enter first number: ");
    scanf("%d", &a);
    
    printf("Enter operation (+, -, *, /): ");
    scanf(" %c", &operation);
    
    printf("Enter second number: ");
    scanf("%d", &b);
    
    switch(operation) {
        case '+':
            result = a + b;
            break;
        case '-':
            result = a - b;
            break;
        case '*':
            result = a * b;
            break;
        case '/':
            if(b != 0)
                result = a / b;
            else {
                printf("Error: Division by zero!\\n");
                return 1;
            }
            break;
        default:
            printf("Error: Invalid operation!\\n");
            return 1;
    }
    
    printf("Result: %d\\n", result);
    return 0;
}`;
    explanation = 'Generated a basic calculator program with add, subtract, multiply, and divide operations.';
  } else if (lowerPrompt.includes('loop') || lowerPrompt.includes('count')) {
    generatedCode = `#include <stdio.h>

int main() {
    int i;
    
    printf("Counting from 1 to 10:\\n");
    for(i = 1; i <= 10; i++) {
        printf("%d ", i);
    }
    printf("\\n");
    
    return 0;
}`;
    explanation = 'Generated a counting loop program.';
  } else if (lowerPrompt.includes('array') || lowerPrompt.includes('list')) {
    generatedCode = `#include <stdio.h>

int main() {
    int numbers[5] = {1, 2, 3, 4, 5};
    int i;
    
    printf("Array elements: ");
    for(i = 0; i < 5; i++) {
        printf("%d ", numbers[i]);
    }
    printf("\\n");
    
    return 0;
}`;
    explanation = 'Generated an array demonstration program.';
  }
  
  return {
    success: true,
    files: [{
      name: 'main.c',
      content: generatedCode,
      purpose: 'Main program file'
    }],
    mainFile: {
      name: 'main.c',
      content: generatedCode
    },
    structure: {
      name: 'Generated C Project'
    },
    explanation
  };
}

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
      
      showLoading('🚀 Generating code...');
      showGenerationProgress(true);

      try {
        let result;
        
        if (codeGenerationService) {
          // Use AI service if available
          result = await codeGenerationService.generateProjectFromPrompt(promptText);
        } else if (window.qwenAI && window.qwenAI.isAvailable) {
          // Use simple Qwen integration
          console.log('Using Qwen AI integration');
          showToast('Using Qwen AI for code generation', 'info');
          result = await window.qwenAI.generateCode(promptText, 'LAWSA C compiler project');
        } else {
          // Use fallback generation
          console.log('Using fallback code generation');
          showToast('Using basic code generation (AI service unavailable)', 'warning');
          result = generateBasicCode(promptText);
        }

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

          showToast('🎉 Code generated successfully!', 'success');
          
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
          throw new Error(result.error || 'Failed to generate code');
        }
      } catch (error) {
        console.error('Code generation error:', error);
        showToast('❌ Failed to generate code: ' + error.message, 'error');
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

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');
  
  // Initialize electronAPI
  if (typeof window.initializeElectronAPI === 'function') {
    if (window.initializeElectronAPI()) {
      console.log('Electron API initialized successfully');
    } else {
      console.error('Failed to initialize Electron API');
      showToast('Failed to initialize Electron API', 'error');
    }
  } else {
    console.warn('initializeElectronAPI not available from preload');
  }
  
  // Setup generate button immediately for fallback functionality
  setupGenerateButton();
});

// Also try to setup immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initializeElectronAPI === 'function' && window.initializeElectronAPI()) {
      console.log('Electron API initialized successfully');
    }
    setupGenerateButton();
  });
} else {
  // DOM is already ready
  if (initializeElectronAPI()) {
    console.log('Electron API initialized successfully');
  }
  setupGenerateButton();
}
