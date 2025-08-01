const { contextBridge, ipcRenderer } = require('electron');

// Import service classes with error handling
const path = require('path');
let MemoryService, LLMService, AICompletionService, CodeGenerationService;

try {
    MemoryService = require(path.join(__dirname, 'src', 'services', 'memoryService'));
    console.log('✅ MemoryService loaded');
} catch (error) {
    console.error('❌ Failed to load MemoryService:', error.message);
    MemoryService = null;
}

try {
    LLMService = require(path.join(__dirname, 'src', 'services', 'llmService'));
    console.log('✅ LLMService loaded');
} catch (error) {
    console.error('❌ Failed to load LLMService:', error.message);
    LLMService = null;
}

try {
    AICompletionService = require(path.join(__dirname, 'src', 'services', 'aiCompletionService'));
    console.log('✅ AICompletionService loaded');
} catch (error) {
    console.error('❌ Failed to load AICompletionService:', error.message);
    AICompletionService = null;
}

try {
    CodeGenerationService = require(path.join(__dirname, 'src', 'services', 'codeGenerationService'));
    console.log('✅ CodeGenerationService loaded');
} catch (error) {
    console.error('❌ Failed to load CodeGenerationService:', error.message);
    CodeGenerationService = null;
}

// Expose a limited set of functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Expose the invoke function for IPC communication
  invoke: (channel, ...args) => {
    // Define a whitelist of allowed channels for security
    const allowedChannels = [
      'compile-c',
      'run-c',
      'send-code-to-llm',
      'open-file',
      'save-file',
      'compile-code',
      'run-code'
    ];
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.error(`Attempted to invoke unauthorized channel: ${channel}`);
    return Promise.reject(new Error(`Unauthorized channel: ${channel}`));
  }
});

// Expose service classes to the renderer (only if successfully loaded)
if (MemoryService) {
    contextBridge.exposeInMainWorld('MemoryService', MemoryService);
}
if (LLMService) {
    contextBridge.exposeInMainWorld('LLMService', LLMService);
}
if (AICompletionService) {
    contextBridge.exposeInMainWorld('AICompletionService', AICompletionService);
}
if (CodeGenerationService) {
    contextBridge.exposeInMainWorld('CodeGenerationService', CodeGenerationService);
}

// Expose service availability status
contextBridge.exposeInMainWorld('serviceStatus', {
    memoryService: !!MemoryService,
    llmService: !!LLMService,
    aiCompletionService: !!AICompletionService,
    codeGenerationService: !!CodeGenerationService
});

// Helper function to initialize Electron API
contextBridge.exposeInMainWorld('initializeElectronAPI', () => {
  try {
    // Check if electronAPI is available
    if (typeof window.electronAPI === 'undefined') {
      console.error('electronAPI not available');
      return false;
    }
    
    // Check service availability and report status
    const status = window.serviceStatus || {};
    console.log('Service availability:', status);
    
    // Initialize available services
    const availableServices = [];
    if (status.memoryService) availableServices.push('MemoryService');
    if (status.llmService) availableServices.push('LLMService');
    if (status.aiCompletionService) availableServices.push('AICompletionService');
    if (status.codeGenerationService) availableServices.push('CodeGenerationService');
    
    console.log(`Electron API initialized with ${availableServices.length} services:`, availableServices);
    
    // Return true if at least electronAPI is available
    return true;
  } catch (error) {
    console.error('Error initializing Electron API:', error);
    return false;
  }
});

// Helper function to create service instances
contextBridge.exposeInMainWorld('createServices', () => {
  try {
    const services = {};
    
    // Create LLM service instance if available
    if (LLMService) {
      services.llmService = new LLMService();
      console.log('✅ LLM service instance created');
    }
    
    // Create Memory service instance if available
    if (MemoryService) {
      services.memoryService = new MemoryService();
      console.log('✅ Memory service instance created');
    }
    
    // Create Code Generation service if both LLM and Memory are available
    if (CodeGenerationService && services.llmService && services.memoryService) {
      services.codeGenerationService = new CodeGenerationService(services.llmService, services.memoryService);
      console.log('✅ Code generation service instance created');
    }
    
    // Create AI Completion service if available
    if (AICompletionService) {
      services.aiCompletionService = new AICompletionService();
      console.log('✅ AI completion service instance created');
    }
    
    return services;
  } catch (error) {
    console.error('Error creating service instances:', error);
    return {};
  }
});
