/**
 * Memory Service for LAWSA Cursor IDE
 * 
 * This service integrates the memory system with the Electron app
 * to provide context-aware AI assistance.
 */

const path = require('path');
const MemoryStore = require('../../../memory-system/memory-store');

class MemoryService {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.memoryStore = new MemoryStore(projectPath);
    this.isInitialized = false;
  }

  /**
   * Initialize the memory service
   */
  async initialize() {
    try {
      // Test memory store
      await this.memoryStore.loadMemory();
      this.isInitialized = true;
      console.log('Memory service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Memory service initialization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update file in memory
   */
  async updateFile(filePath, content, ast = null, errors = [], suggestions = []) {
    try {
      this.memoryStore.updateFileMemory(filePath, content, ast, errors, suggestions);
      
      // Add to history
      this.memoryStore.addToHistory({
        type: 'file_update',
        file: filePath,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating file in memory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update context
   */
  async updateContext(context) {
    try {
      this.memoryStore.updateContext(context);
      return { success: true };
    } catch (error) {
      console.error('Error updating context:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI context
   */
  async getAIContext() {
    try {
      return this.memoryStore.getAIContext();
    } catch (error) {
      console.error('Error getting AI context:', error);
      return null;
    }
  }

  /**
   * Search memory
   */
  async searchMemory(query, type = 'all') {
    try {
      return this.memoryStore.searchMemory(query, type);
    } catch (error) {
      console.error('Error searching memory:', error);
      return [];
    }
  }

  /**
   * Add AI interaction
   */
  async addAIInteraction(interaction) {
    try {
      this.memoryStore.addAIInteraction(interaction);
      return { success: true };
    } catch (error) {
      console.error('Error adding AI interaction:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    try {
      const memory = this.memoryStore.memory;
      return {
        files: Object.keys(memory.files).length,
        history: memory.history.length,
        aiInteractions: memory.aiInteractions.length,
        lastModified: memory.lastModified
      };
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return null;
    }
  }

  /**
   * Clear memory
   */
  async clearMemory() {
    try {
      this.memoryStore.clearMemory();
      return { success: true };
    } catch (error) {
      console.error('Error clearing memory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export memory
   */
  async exportMemory() {
    try {
      return this.memoryStore.exportMemory();
    } catch (error) {
      console.error('Error exporting memory:', error);
      return null;
    }
  }

  /**
   * Import memory
   */
  async importMemory(data) {
    try {
      this.memoryStore.importMemory(data);
      return { success: true };
    } catch (error) {
      console.error('Error importing memory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent history
   */
  async getRecentHistory(limit = 10) {
    try {
      return this.memoryStore.memory.history.slice(-limit);
    } catch (error) {
      console.error('Error getting recent history:', error);
      return [];
    }
  }

  /**
   * Get recent AI interactions
   */
  async getRecentAIInteractions(limit = 5) {
    try {
      return this.memoryStore.memory.aiInteractions.slice(-limit);
    } catch (error) {
      console.error('Error getting recent AI interactions:', error);
      return [];
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath) {
    try {
      const relativePath = path.relative(this.projectPath, filePath);
      return this.memoryStore.memory.files[relativePath] || null;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Get project information
   */
  async getProjectInfo() {
    try {
      return {
        project: this.memoryStore.memory.project,
        context: this.memoryStore.memory.context,
        stats: await this.getMemoryStats()
      };
    } catch (error) {
      console.error('Error getting project info:', error);
      return null;
    }
  }

  /**
   * Check if memory is initialized
   */
  isReady() {
    return this.isInitialized;
  }
}

module.exports = MemoryService; 