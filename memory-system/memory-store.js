/**
 * Memory Store - Persistent memory system for LAWSA Cursor IDE
 * 
 * This module provides persistent storage for project context, AI interactions,
 * and development history to enable context-aware AI assistance.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MemoryStore {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.memoryPath = path.join(projectPath, '.lawsa-memory');
    this.memoryFile = path.join(this.memoryPath, 'memory.json');
    this.indexFile = path.join(this.memoryPath, 'index.json');
    this.historyFile = path.join(this.memoryPath, 'history.json');
    
    this.memory = {
      project: {
        id: this.generateProjectId(),
        name: path.basename(projectPath),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      },
      files: {},
      context: {
        currentFile: null,
        cursorPosition: { line: 1, column: 1 },
        selectedCode: '',
        compilerState: 'idle',
        lastCompilation: null
      },
      history: [],
      aiInteractions: []
    };
    
    this.index = {
      files: {},
      functions: {},
      variables: {},
      errors: {},
      suggestions: {}
    };
    
    this.ensureMemoryDirectory();
    this.loadMemory();
  }

  /**
   * Generate a unique project ID
   */
  generateProjectId() {
    const projectHash = crypto.createHash('md5')
      .update(this.projectPath)
      .digest('hex');
    return `lawsa-${projectHash.substring(0, 8)}`;
  }

  /**
   * Ensure memory directory exists
   */
  ensureMemoryDirectory() {
    if (!fs.existsSync(this.memoryPath)) {
      fs.mkdirSync(this.memoryPath, { recursive: true });
    }
  }

  /**
   * Load memory from disk
   */
  loadMemory() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = fs.readFileSync(this.memoryFile, 'utf8');
        this.memory = { ...this.memory, ...JSON.parse(data) };
      }
      
      if (fs.existsSync(this.indexFile)) {
        const data = fs.readFileSync(this.indexFile, 'utf8');
        this.index = { ...this.index, ...JSON.parse(data) };
      }
      
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        this.memory.history = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    }
  }

  /**
   * Save memory to disk
   */
  saveMemory() {
    try {
      this.memory.lastModified = new Date().toISOString();
      
      fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
      fs.writeFileSync(this.indexFile, JSON.stringify(this.index, null, 2));
      fs.writeFileSync(this.historyFile, JSON.stringify(this.memory.history, null, 2));
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }

  /**
   * Update file memory
   */
  updateFileMemory(filePath, content, ast = null, errors = [], suggestions = []) {
    const relativePath = path.relative(this.projectPath, filePath);
    
    this.memory.files[relativePath] = {
      path: relativePath,
      content: content,
      ast: ast,
      errors: errors,
      suggestions: suggestions,
      lastModified: new Date().toISOString(),
      size: content.length
    };

    // Update index
    this.updateFileIndex(relativePath, content, ast);
    
    this.saveMemory();
  }

  /**
   * Update file index for fast searching
   */
  updateFileIndex(filePath, content, ast) {
    this.index.files[filePath] = {
      functions: this.extractFunctions(content, ast),
      variables: this.extractVariables(content, ast),
      imports: this.extractImports(content),
      lastIndexed: new Date().toISOString()
    };
  }

  /**
   * Extract functions from content/AST
   */
  extractFunctions(content, ast) {
    const functions = [];
    
    // Simple regex-based function extraction
    const functionRegex = /(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      functions.push({
        name: match[2],
        returnType: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return functions;
  }

  /**
   * Extract variables from content/AST
   */
  extractVariables(content, ast) {
    const variables = [];
    
    // Simple regex-based variable extraction
    const varRegex = /(int|char|float|double|void)\s+(\w+)\s*[=;]/g;
    let match;
    
    while ((match = varRegex.exec(content)) !== null) {
      variables.push({
        name: match[2],
        type: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    return variables;
  }

  /**
   * Extract imports from content
   */
  extractImports(content) {
    const imports = [];
    
    // Extract #include statements
    const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
    let match;
    
    while ((match = includeRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Update context
   */
  updateContext(context) {
    this.memory.context = { ...this.memory.context, ...context };
    this.saveMemory();
  }

  /**
   * Add to history
   */
  addToHistory(entry) {
    this.memory.history.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 entries
    if (this.memory.history.length > 1000) {
      this.memory.history = this.memory.history.slice(-1000);
    }
    
    this.saveMemory();
  }

  /**
   * Add AI interaction
   */
  addAIInteraction(interaction) {
    this.memory.aiInteractions.push({
      ...interaction,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 500 AI interactions
    if (this.memory.aiInteractions.length > 500) {
      this.memory.aiInteractions = this.memory.aiInteractions.slice(-500);
    }
    
    this.saveMemory();
  }

  /**
   * Get context for AI
   */
  getAIContext() {
    const currentFile = this.memory.context.currentFile;
    const fileMemory = currentFile ? this.memory.files[currentFile] : null;
    
    return {
      project: this.memory.project,
      context: this.memory.context,
      currentFile: fileMemory,
      recentHistory: this.memory.history.slice(-10),
      recentAIInteractions: this.memory.aiInteractions.slice(-5),
      projectFiles: Object.keys(this.memory.files),
      index: this.index
    };
  }

  /**
   * Search memory
   */
  searchMemory(query, type = 'all') {
    const results = [];
    
    switch (type) {
      case 'files':
        results.push(...this.searchFiles(query));
        break;
      case 'functions':
        results.push(...this.searchFunctions(query));
        break;
      case 'variables':
        results.push(...this.searchVariables(query));
        break;
      case 'history':
        results.push(...this.searchHistory(query));
        break;
      default:
        results.push(
          ...this.searchFiles(query),
          ...this.searchFunctions(query),
          ...this.searchVariables(query),
          ...this.searchHistory(query)
        );
    }
    
    return results;
  }

  /**
   * Search files
   */
  searchFiles(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [filePath, fileData] of Object.entries(this.memory.files)) {
      if (filePath.toLowerCase().includes(lowerQuery) ||
          fileData.content.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'file',
          path: filePath,
          data: fileData
        });
      }
    }
    
    return results;
  }

  /**
   * Search functions
   */
  searchFunctions(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [filePath, fileIndex] of Object.entries(this.index.files)) {
      for (const func of fileIndex.functions) {
        if (func.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'function',
            file: filePath,
            data: func
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Search variables
   */
  searchVariables(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [filePath, fileIndex] of Object.entries(this.index.files)) {
      for (const variable of fileIndex.variables) {
        if (variable.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'variable',
            file: filePath,
            data: variable
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Search history
   */
  searchHistory(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const entry of this.memory.history) {
      if (JSON.stringify(entry).toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'history',
          data: entry
        });
      }
    }
    
    return results;
  }

  /**
   * Clear memory
   */
  clearMemory() {
    this.memory = {
      project: this.memory.project,
      files: {},
      context: {
        currentFile: null,
        cursorPosition: { line: 1, column: 1 },
        selectedCode: '',
        compilerState: 'idle',
        lastCompilation: null
      },
      history: [],
      aiInteractions: []
    };
    
    this.index = {
      files: {},
      functions: {},
      variables: {},
      errors: {},
      suggestions: {}
    };
    
    this.saveMemory();
  }

  /**
   * Export memory
   */
  exportMemory() {
    return {
      memory: this.memory,
      index: this.index
    };
  }

  /**
   * Import memory
   */
  importMemory(data) {
    if (data.memory) {
      this.memory = { ...this.memory, ...data.memory };
    }
    if (data.index) {
      this.index = { ...this.index, ...data.index };
    }
    this.saveMemory();
  }
}

module.exports = MemoryStore; 