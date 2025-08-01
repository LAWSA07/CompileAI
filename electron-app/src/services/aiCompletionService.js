/**
 * AI Completion Service for LAWSA Cursor IDE
 * 
 * This service provides intelligent code completion using the LLM
 * and integrates with Monaco Editor for seamless AI assistance.
 */

const LLMService = require('./llmService');

class AICompletionService {
    constructor(llmService) {
        this.llmService = llmService;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.maxCacheSize = 100;
    }

    registerCompletionProvider(monaco, editor) {
        const completionProvider = {
            provideCompletionItems: async (model, position) => {
                try {
                    const context = this.buildContext(model, position);
                    const cursorPosition = {
                        line: position.lineNumber,
                        column: position.column
                    };
                    
                    const selectedText = this.getSelectedText(editor);
                    
                    const result = await this.llmService.generateCodeCompletion(
                        context,
                        cursorPosition,
                        selectedText
                    );
                    
                    if (result.success) {
                        return this.convertToMonacoCompletions(result.suggestions, position);
                    } else {
                        console.warn('AI completion failed:', result.error);
                        return [];
                    }
                } catch (error) {
                    console.error('Completion provider error:', error);
                    return [];
                }
            },
            
            triggerCharacters: ['.', ' ', '(', '[', '{', '"', '\'', ';', ',', '='],
            autoTrigger: true
        };

        const disposable = monaco.languages.registerCompletionItemProvider('c', completionProvider);
        return disposable;
    }

    async generateCompletions(context, cursorPosition, selectedText = '') {
        try {
            const cacheKey = this.generateCacheKey(context, cursorPosition, selectedText);
            
            // Check cache first
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
            
            const result = await this.llmService.generateCodeCompletion(context, cursorPosition, selectedText);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            // Clean up cache if it gets too large
            if (this.cache.size > this.maxCacheSize) {
                this.clearCache();
            }
            
            return result;
        } catch (error) {
            console.error('Generate completions error:', error);
            return {
                success: false,
                error: error.message,
                suggestions: []
            };
        }
    }

    convertToMonacoCompletions(suggestions, position) {
        const completions = [];
        
        for (const suggestion of suggestions) {
            const completion = {
                label: this.extractLabel(suggestion),
                kind: this.determineCompletionKind(suggestion),
                insertText: suggestion,
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                },
                detail: 'AI Suggestion',
                documentation: {
                    value: `AI-generated completion: ${suggestion}`
                }
            };
            
            completions.push(completion);
        }
        
        return completions;
    }

    extractLabel(suggestion) {
        // Extract the most relevant part for the label
        const lines = suggestion.split('\n');
        const firstLine = lines[0].trim();
        
        // Try to extract function name, variable name, or keyword
        const functionMatch = firstLine.match(/(\w+)\s*\(/);
        if (functionMatch) {
            return functionMatch[1];
        }
        
        const variableMatch = firstLine.match(/(\w+)\s*[=;]/);
        if (variableMatch) {
            return variableMatch[1];
        }
        
        const keywordMatch = firstLine.match(/(\w+)/);
        if (keywordMatch) {
            return keywordMatch[1];
        }
        
        return firstLine.substring(0, 20) + (firstLine.length > 20 ? '...' : '');
    }

    determineCompletionKind(suggestion) {
        const lowerSuggestion = suggestion.toLowerCase();
        
        if (lowerSuggestion.includes('(') && lowerSuggestion.includes(')')) {
            return monaco.languages.CompletionItemKind.Function;
        }
        
        if (lowerSuggestion.includes('int ') || lowerSuggestion.includes('char ') || 
            lowerSuggestion.includes('float ') || lowerSuggestion.includes('double ') ||
            lowerSuggestion.includes('void ')) {
            return monaco.languages.CompletionItemKind.Variable;
        }
        
        if (lowerSuggestion.includes('if') || lowerSuggestion.includes('while') ||
            lowerSuggestion.includes('for') || lowerSuggestion.includes('return')) {
            return monaco.languages.CompletionItemKind.Keyword;
        }
        
        if (lowerSuggestion.includes('#include') || lowerSuggestion.includes('#define')) {
            return monaco.languages.CompletionItemKind.Snippet;
        }
        
        return monaco.languages.CompletionItemKind.Text;
    }

    getSelectedText(editor) {
        const selection = editor.getSelection();
        if (selection.isEmpty()) {
            return '';
        }
        
        return editor.getModel().getValueInRange(selection);
    }

    generateCacheKey(context, cursorPosition, selectedText) {
        return `${context.substring(0, 100)}_${cursorPosition.line}_${cursorPosition.column}_${selectedText.substring(0, 50)}`;
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            timeout: this.cacheTimeout
        };
    }

    buildContext(model, position) {
        const lineCount = model.getLineCount();
        const contextLines = [];
        
        // Get lines around the cursor position
        const startLine = Math.max(1, position.lineNumber - 10);
        const endLine = Math.min(lineCount, position.lineNumber + 10);
        
        for (let i = startLine; i <= endLine; i++) {
            const lineContent = model.getLineContent(i);
            if (i === position.lineNumber) {
                // Mark current line
                contextLines.push(`// Current line (${i}): ${lineContent}`);
            } else {
                contextLines.push(`// Line ${i}: ${lineContent}`);
            }
        }
        
        return contextLines.join('\n');
    }

    async generateInlineSuggestions(editor, position) {
        try {
            const model = editor.getModel();
            const context = this.buildContext(model, position);
            const cursorPosition = {
                line: position.lineNumber,
                column: position.column
            };
            
            const result = await this.llmService.generateCodeCompletion(context, cursorPosition);
            
            if (result.success && result.suggestions.length > 0) {
                return result.suggestions[0]; // Return the first suggestion as inline
            }
            
            return null;
        } catch (error) {
            console.error('Inline suggestions error:', error);
            return null;
        }
    }

    async generateFunctionSignatures(context, functionName) {
        try {
            const prompt = `Generate function signature for: ${functionName}`;
            const result = await this.llmService.generateCodeCompletion(context, { line: 1, column: 1 }, prompt);
            
            if (result.success) {
                return result.suggestions.filter(s => s.includes(functionName));
            }
            
            return [];
        } catch (error) {
            console.error('Function signature generation error:', error);
            return [];
        }
    }

    extractFunctionName(lineContent, cursorColumn) {
        // Extract function name from current line
        const beforeCursor = lineContent.substring(0, cursorColumn);
        const words = beforeCursor.split(/\s+/);
        
        for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i].trim();
            if (word && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
                return word;
            }
        }
        
        return null;
    }

    findFunctionInContext(context, functionName) {
        const lines = context.split('\n');
        
        for (const line of lines) {
            if (line.includes(functionName) && line.includes('(')) {
                return line.trim();
            }
        }
        
        return null;
    }

    async generateVariableSuggestions(context, variableType) {
        try {
            const prompt = `Suggest variable names for type: ${variableType}`;
            const result = await this.llmService.generateCodeCompletion(context, { line: 1, column: 1 }, prompt);
            
            if (result.success) {
                return result.suggestions.filter(s => s.includes(variableType));
            }
            
            return [];
        } catch (error) {
            console.error('Variable suggestions error:', error);
            return [];
        }
    }

    async testService() {
        try {
            const testContext = 'int main() {\n    int x = 10;\n    ';
            const testPosition = { line: 2, column: 5 };
            
            const result = await this.generateCompletions(testContext, testPosition);
            
            return {
                success: result.success,
                message: result.success ? 'AI completion service is working' : 'AI completion service failed',
                suggestions: result.suggestions?.length || 0
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'AI completion service test failed'
            };
        }
    }
}

module.exports = AICompletionService; 