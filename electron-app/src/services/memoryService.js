/**
 * Memory Service for LAWSA Cursor IDE
 * 
 * This service integrates the memory system with the Electron app
 * to provide context-aware AI assistance.
 */

const path = require('path');
const MemoryStore = require('../../../memory-system/memory-store');

class MemoryService {
    constructor() {
        this.memoryStore = null;
        this.isInitialized = false;
    }

    initialize(projectPath) {
        try {
            this.memoryStore = new MemoryStore(projectPath);
            this.isInitialized = true;
            console.log('Memory service initialized for project:', projectPath);
            return true;
        } catch (error) {
            console.error('Failed to initialize memory service:', error);
            return false;
        }
    }

    updateFile(filePath, content) {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            this.memoryStore.updateFileIndex(filePath, content);
            return { success: true };
        } catch (error) {
            console.error('Error updating file in memory:', error);
            return { success: false, error: error.message };
        }
    }

    updateContext(context) {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            this.memoryStore.updateContext(context);
            return { success: true };
        } catch (error) {
            console.error('Error updating context in memory:', error);
            return { success: false, error: error.message };
        }
    }

    getAIContext() {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            return this.memoryStore.getAIContext();
        } catch (error) {
            console.error('Error getting AI context:', error);
            return null;
        }
    }

    searchMemory(query) {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            return this.memoryStore.searchMemory(query);
        } catch (error) {
            console.error('Error searching memory:', error);
            return [];
        }
    }

    addAIInteraction(type, prompt, response, metadata = {}) {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            this.memoryStore.addAIInteraction(type, prompt, response, metadata);
            return { success: true };
        } catch (error) {
            console.error('Error adding AI interaction:', error);
            return { success: false, error: error.message };
        }
    }

    getMemoryStats() {
        if (!this.isInitialized) {
            return { initialized: false };
        }
        
        try {
            const memory = this.memoryStore.memory;
            return {
                initialized: true,
                projectId: memory.project.id,
                projectName: memory.project.name,
                filesCount: Object.keys(memory.files).length,
                historyCount: memory.history.length,
                aiInteractionsCount: memory.aiInteractions.length,
                lastModified: memory.project.lastModified
            };
        } catch (error) {
            console.error('Error getting memory stats:', error);
            return { initialized: false, error: error.message };
        }
    }

    clearMemory() {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            this.memoryStore.clearMemory();
            return { success: true };
        } catch (error) {
            console.error('Error clearing memory:', error);
            return { success: false, error: error.message };
        }
    }

    exportMemory() {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            return this.memoryStore.exportMemory();
        } catch (error) {
            console.error('Error exporting memory:', error);
            return null;
        }
    }

    importMemory(memoryData) {
        if (!this.isInitialized) {
            throw new Error('Memory service not initialized');
        }
        
        try {
            const success = this.memoryStore.importMemory(memoryData);
            return { success };
        } catch (error) {
            console.error('Error importing memory:', error);
            return { success: false, error: error.message };
        }
    }

    getRecentHistory(limit = 10) {
        if (!this.isInitialized) {
            return [];
        }
        
        try {
            const history = this.memoryStore.memory.history;
            return history.slice(-limit).reverse();
        } catch (error) {
            console.error('Error getting recent history:', error);
            return [];
        }
    }

    getRecentAIInteractions(limit = 10) {
        if (!this.isInitialized) {
            return [];
        }
        
        try {
            const interactions = this.memoryStore.memory.aiInteractions;
            return interactions.slice(-limit).reverse();
        } catch (error) {
            console.error('Error getting recent AI interactions:', error);
            return [];
        }
    }

    getFileInfo(filePath) {
        if (!this.isInitialized) {
            return null;
        }
        
        try {
            const relativePath = path.relative(this.memoryStore.projectPath, filePath);
            return this.memoryStore.memory.files[relativePath] || null;
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }

    getProjectInfo() {
        if (!this.isInitialized) {
            return null;
        }
        
        try {
            return this.memoryStore.memory.project;
        } catch (error) {
            console.error('Error getting project info:', error);
            return null;
        }
    }

    isReady() {
        return this.isInitialized && this.memoryStore !== null;
    }
}

module.exports = MemoryService; 