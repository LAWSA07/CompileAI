/**
 * AI Completion Service for LAWSA Cursor IDE
 * 
 * This service provides intelligent code completion using the LLM
 * and integrates with Monaco Editor for seamless AI assistance.
 */

class AICompletionService {
  constructor(memoryService, llmService) {
    this.memoryService = memoryService;
    this.llmService = llmService;
    this.completionCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Register Monaco Editor completion provider
   */
  registerCompletionProvider(monaco) {
    monaco.languages.registerCompletionItemProvider('c', {
      provideCompletionItems: async (model, position) => {
        return await this.generateCompletions(model, position);
      }
    });
  }

  /**
   * Generate completions for Monaco Editor
   */
  async generateCompletions(model, position) {
    try {
      // Get current context
      const context = await this.memoryService.getAIContext();
      if (!context) {
        return [];
      }

      // Get selected text
      const selectedText = this.getSelectedText(model, position);
      
      // Get cursor position
      const cursorPosition = {
        line: position.lineNumber,
        column: position.column
      };

      // Check cache first
      const cacheKey = this.generateCacheKey(context, cursorPosition, selectedText);
      const cachedResult = this.completionCache.get(cacheKey);
      
      if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheTimeout) {
        return this.convertToMonacoCompletions(cachedResult.suggestions);
      }

      // Generate new completions
      const result = await this.llmService.generateCodeCompletion(
        context,
        cursorPosition,
        selectedText
      );

      if (!result.success) {
        console.error('AI completion failed:', result.error);
        return [];
      }

      // Cache the result
      this.completionCache.set(cacheKey, {
        suggestions: result.suggestions,
        timestamp: Date.now()
      });

      return this.convertToMonacoCompletions(result.suggestions);
    } catch (error) {
      console.error('Error generating completions:', error);
      return [];
    }
  }

  /**
   * Convert AI suggestions to Monaco completion items
   */
  convertToMonacoCompletions(suggestions) {
    const completions = [];

    for (const suggestion of suggestions) {
      const completion = {
        label: this.extractLabel(suggestion.content),
        kind: this.determineCompletionKind(suggestion.content),
        insertText: suggestion.content,
        detail: `AI Suggestion (${suggestion.confidence * 100}% confidence)`,
        documentation: {
          value: `AI-generated completion based on project context`
        },
        sortText: `ai_${suggestion.confidence}`,
        range: undefined // Monaco will determine the range
      };

      completions.push(completion);
    }

    return completions;
  }

  /**
   * Extract label from suggestion content
   */
  extractLabel(content) {
    // Extract the first meaningful part as label
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    
    if (firstLine.includes(';')) {
      return firstLine.split(';')[0].trim();
    }
    
    if (firstLine.includes('{')) {
      return firstLine.split('{')[0].trim();
    }
    
    return firstLine || 'AI Suggestion';
  }

  /**
   * Determine Monaco completion kind
   */
  determineCompletionKind(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('int ') || lowerContent.includes('char ') || 
        lowerContent.includes('float ') || lowerContent.includes('double ')) {
      return monaco.languages.CompletionItemKind.Variable;
    }
    
    if (lowerContent.includes('(') && lowerContent.includes(')')) {
      return monaco.languages.CompletionItemKind.Function;
    }
    
    if (lowerContent.includes('if') || lowerContent.includes('for') || 
        lowerContent.includes('while') || lowerContent.includes('switch')) {
      return monaco.languages.CompletionItemKind.Snippet;
    }
    
    if (lowerContent.includes('#include')) {
      return monaco.languages.CompletionItemKind.Module;
    }
    
    return monaco.languages.CompletionItemKind.Text;
  }

  /**
   * Get selected text from model
   */
  getSelectedText(model, position) {
    const selection = model.getSelection();
    if (selection.isEmpty()) {
      return '';
    }
    
    return model.getValueInRange(selection);
  }

  /**
   * Generate cache key
   */
  generateCacheKey(context, cursorPosition, selectedText) {
    const currentFile = context.currentFile?.path || '';
    const content = context.currentFile?.content || '';
    
    return `${currentFile}_${cursorPosition.line}_${cursorPosition.column}_${selectedText}_${content.length}`;
  }

  /**
   * Clear completion cache
   */
  clearCache() {
    this.completionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.completionCache.size,
      timeout: this.cacheTimeout
    };
  }

  /**
   * Generate inline suggestions
   */
  async generateInlineSuggestions(model, position) {
    try {
      const context = await this.memoryService.getAIContext();
      if (!context) {
        return [];
      }

      const selectedText = this.getSelectedText(model, position);
      const cursorPosition = {
        line: position.lineNumber,
        column: position.column
      };

      const result = await this.llmService.generateCodeCompletion(
        context,
        cursorPosition,
        selectedText
      );

      if (!result.success) {
        return [];
      }

      return result.suggestions.filter(s => s.type === 'inline');
    } catch (error) {
      console.error('Error generating inline suggestions:', error);
      return [];
    }
  }

  /**
   * Generate function signature suggestions
   */
  async generateFunctionSignatures(model, position) {
    try {
      const context = await this.memoryService.getAIContext();
      if (!context) {
        return [];
      }

      const lineContent = model.getLineContent(position.lineNumber);
      const beforeCursor = lineContent.substring(0, position.column - 1);
      
      // Check if we're in a function call
      if (beforeCursor.includes('(') && !beforeCursor.includes(')')) {
        const functionName = this.extractFunctionName(beforeCursor);
        
        // Look for function in context
        const functionInfo = this.findFunctionInContext(context, functionName);
        
        if (functionInfo) {
          return [{
            label: functionInfo.signature,
            insertText: functionInfo.parameters.join(', '),
            detail: `Function: ${functionInfo.name}`,
            documentation: {
              value: `Function defined in ${functionInfo.file}`
            }
          }];
        }
      }

      return [];
    } catch (error) {
      console.error('Error generating function signatures:', error);
      return [];
    }
  }

  /**
   * Extract function name from line content
   */
  extractFunctionName(lineContent) {
    const match = lineContent.match(/(\w+)\s*\(/);
    return match ? match[1] : '';
  }

  /**
   * Find function in context
   */
  findFunctionInContext(context, functionName) {
    for (const [filePath, fileIndex] of Object.entries(context.index.files)) {
      for (const func of fileIndex.functions) {
        if (func.name === functionName) {
          return {
            name: func.name,
            signature: `${func.returnType} ${func.name}()`,
            parameters: [],
            file: filePath
          };
        }
      }
    }
    return null;
  }

  /**
   * Generate variable suggestions
   */
  async generateVariableSuggestions(model, position) {
    try {
      const context = await this.memoryService.getAIContext();
      if (!context) {
        return [];
      }

      const suggestions = [];
      
      // Get variables from current file
      const currentFile = context.currentFile?.path;
      if (currentFile && context.index.files[currentFile]) {
        for (const variable of context.index.files[currentFile].variables) {
          suggestions.push({
            label: variable.name,
            insertText: variable.name,
            detail: `Variable: ${variable.type}`,
            kind: monaco.languages.CompletionItemKind.Variable
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating variable suggestions:', error);
      return [];
    }
  }

  /**
   * Test the completion service
   */
  async testService() {
    try {
      const testContext = {
        currentFile: {
          path: 'test.c',
          content: '#include <stdio.h>\n\nint main() {\n    printf("Hello");\n    return 0;\n}'
        },
        projectFiles: ['test.c'],
        index: {
          files: {
            'test.c': {
              functions: [{ name: 'main', returnType: 'int', line: 4 }],
              variables: [{ name: 'i', type: 'int', line: 5 }],
              imports: ['stdio.h']
            }
          }
        }
      };

      const result = await this.llmService.generateCodeCompletion(
        testContext,
        { line: 5, column: 1 }
      );

      return {
        success: result.success,
        suggestions: result.suggestions?.length || 0,
        message: 'AI completion service is working correctly'
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