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
        this.memory = {
            project: {
                id: this.generateProjectId(),
                name: path.basename(projectPath),
                path: projectPath,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            files: {},
            context: {
                currentFile: null,
                cursorPosition: { line: 0, column: 0 },
                selectedText: '',
                compilationState: 'idle',
                lastError: null,
                suggestions: []
            },
            history: [],
            aiInteractions: []
        };
        
        this.ensureMemoryDirectory();
        this.loadMemory();
    }

    generateProjectId() {
        return crypto.createHash('md5').update(this.projectPath).digest('hex');
    }

    ensureMemoryDirectory() {
        if (!fs.existsSync(this.memoryPath)) {
            fs.mkdirSync(this.memoryPath, { recursive: true });
        }
    }

    loadMemory() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = fs.readFileSync(this.memoryFile, 'utf8');
                const loaded = JSON.parse(data);
                this.memory = { ...this.memory, ...loaded };
                this.memory.project.lastModified = new Date().toISOString();
            }
        } catch (error) {
            console.error('Error loading memory:', error);
        }
    }

    saveMemory() {
        try {
            this.memory.project.lastModified = new Date().toISOString();
            fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
        } catch (error) {
            console.error('Error saving memory:', error);
        }
    }

    updateFileMemory(filePath, content, ast = null, errors = []) {
        const relativePath = path.relative(this.projectPath, filePath);
        this.memory.files[relativePath] = {
            content,
            ast,
            errors,
            lastModified: new Date().toISOString(),
            functions: this.extractFunctions(content),
            variables: this.extractVariables(content),
            imports: this.extractImports(content)
        };
        this.saveMemory();
    }

    updateFileIndex(filePath, content) {
        const relativePath = path.relative(this.projectPath, filePath);
        if (!this.memory.files[relativePath]) {
            this.memory.files[relativePath] = {};
        }
        
        this.memory.files[relativePath].content = content;
        this.memory.files[relativePath].lastModified = new Date().toISOString();
        this.memory.files[relativePath].functions = this.extractFunctions(content);
        this.memory.files[relativePath].variables = this.extractVariables(content);
        this.memory.files[relativePath].imports = this.extractImports(content);
        
        this.saveMemory();
    }

    extractFunctions(content) {
        const functions = [];
        const functionRegex = /(\w+)\s+(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            functions.push({
                returnType: match[1],
                name: match[2],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return functions;
    }

    extractVariables(content) {
        const variables = [];
        const varRegex = /(\w+)\s+(\w+)\s*[=;]/g;
        let match;
        
        while ((match = varRegex.exec(content)) !== null) {
            variables.push({
                type: match[1],
                name: match[2],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return variables;
    }

    extractImports(content) {
        const imports = [];
        const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
        let match;
        
        while ((match = includeRegex.exec(content)) !== null) {
            imports.push({
                header: match[1],
                line: content.substring(0, match.index).split('\n').length
            });
        }
        
        return imports;
    }

    updateContext(context) {
        this.memory.context = { ...this.memory.context, ...context };
        this.saveMemory();
    }

    addToHistory(action, details) {
        this.memory.history.push({
            action,
            details,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 history entries
        if (this.memory.history.length > 1000) {
            this.memory.history = this.memory.history.slice(-1000);
        }
        
        this.saveMemory();
    }

    addAIInteraction(type, prompt, response, metadata = {}) {
        this.memory.aiInteractions.push({
            type,
            prompt,
            response,
            metadata,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 500 AI interactions
        if (this.memory.aiInteractions.length > 500) {
            this.memory.aiInteractions = this.memory.aiInteractions.slice(-500);
        }
        
        this.saveMemory();
    }

    getAIContext() {
        const recentInteractions = this.memory.aiInteractions.slice(-10);
        const currentFile = this.memory.context.currentFile;
        const fileContent = currentFile ? this.memory.files[currentFile]?.content : '';
        
        return {
            currentFile,
            fileContent,
            recentInteractions,
            projectStructure: Object.keys(this.memory.files),
            context: this.memory.context
        };
    }

    searchMemory(query) {
        const results = [];
        
        // Search in file contents
        for (const [filePath, fileData] of Object.entries(this.memory.files)) {
            if (fileData.content && fileData.content.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    type: 'file',
                    path: filePath,
                    content: fileData.content
                });
            }
        }
        
        // Search in AI interactions
        for (const interaction of this.memory.aiInteractions) {
            if (interaction.prompt.toLowerCase().includes(query.toLowerCase()) ||
                interaction.response.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    type: 'ai_interaction',
                    interaction
                });
            }
        }
        
        return results;
    }

    clearMemory() {
        this.memory = {
            project: this.memory.project,
            files: {},
            context: {
                currentFile: null,
                cursorPosition: { line: 0, column: 0 },
                selectedText: '',
                compilationState: 'idle',
                lastError: null,
                suggestions: []
            },
            history: [],
            aiInteractions: []
        };
        this.saveMemory();
    }

    exportMemory() {
        return JSON.stringify(this.memory, null, 2);
    }

    importMemory(memoryData) {
        try {
            const imported = JSON.parse(memoryData);
            this.memory = { ...this.memory, ...imported };
            this.saveMemory();
            return true;
        } catch (error) {
            console.error('Error importing memory:', error);
            return false;
        }
    }
}

module.exports = MemoryStore; 