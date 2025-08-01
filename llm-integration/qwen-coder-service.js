/**
 * Qwen Coder Service for LAWSA Cursor IDE
 * 
 * This module provides specialized AI assistance using the Qwen Coder model
 * with compiler-aware prompts and context management.
 */

const OpenRouterClient = require('./openrouter-client');

class QwenCoderService {
  constructor(apiKey) {
    this.client = new OpenRouterClient(apiKey);
    this.model = 'qwen/qwen2.5-coder-7b-instruct';
    
    // Compiler-aware system prompts
    this.systemPrompts = {
      codeCompletion: this.getCodeCompletionSystemPrompt(),
      codeRefactoring: this.getCodeRefactoringSystemPrompt(),
      errorDiagnosis: this.getErrorDiagnosisSystemPrompt(),
      codeGeneration: this.getCodeGenerationSystemPrompt(),
      codeReview: this.getCodeReviewSystemPrompt()
    };
  }

  /**
   * Get system prompt for code completion
   */
  getCodeCompletionSystemPrompt() {
    return `You are an expert C programmer and compiler developer. You are working on the LAWSA C compiler project, which is an educational C compiler that translates C code to x86-64 assembly.

Your task is to provide intelligent code completion suggestions for C code. Consider:
- The current file context and surrounding code
- Function signatures and variable declarations
- C language syntax and best practices
- Compiler-specific patterns and conventions
- The LAWSA compiler's capabilities and limitations

Provide only the code completion, no explanations unless specifically requested.`;
  }

  /**
   * Get system prompt for code refactoring
   */
  getCodeRefactoringSystemPrompt() {
    return `You are an expert C programmer and compiler developer working on the LAWSA C compiler project.

Your task is to refactor C code to improve:
- Readability and maintainability
- Performance and efficiency
- Code structure and organization
- Adherence to C best practices
- Compatibility with the LAWSA compiler

Provide the refactored code with minimal explanations. Focus on practical improvements that work with the LAWSA compiler's capabilities.`;
  }

  /**
   * Get system prompt for error diagnosis
   */
  getErrorDiagnosisSystemPrompt() {
    return `You are an expert C programmer and compiler developer working on the LAWSA C compiler project.

Your task is to diagnose and fix C compilation errors. Consider:
- The specific error message and location
- The LAWSA compiler's parsing and code generation capabilities
- Common C programming mistakes and their fixes
- Compiler-specific limitations and workarounds
- Best practices for the LAWSA compiler

Provide clear explanations of the error and practical fixes that work with the LAWSA compiler.`;
  }

  /**
   * Get system prompt for code generation
   */
  getCodeGenerationSystemPrompt() {
    return `You are an expert C programmer and compiler developer working on the LAWSA C compiler project.

Your task is to generate C code based on requirements. Consider:
- The LAWSA compiler's supported C language subset
- x86-64 assembly generation requirements
- Educational clarity and learning objectives
- Performance and efficiency considerations
- Best practices for compiler development

Generate working C code that can be compiled by the LAWSA compiler and produces correct x86-64 assembly.`;
  }

  /**
   * Get system prompt for code review
   */
  getCodeReviewSystemPrompt() {
    return `You are an expert C programmer and compiler developer working on the LAWSA C compiler project.

Your task is to review C code for:
- Correctness and functionality
- Performance and efficiency
- Readability and maintainability
- Adherence to C best practices
- Compatibility with the LAWSA compiler
- Educational value and learning opportunities

Provide constructive feedback and specific suggestions for improvement.`;
  }

  /**
   * Generate code completion suggestions
   */
  async generateCodeCompletion(context, cursorPosition, selectedCode = '') {
    const prompt = this.buildCompletionPrompt(context, cursorPosition, selectedCode);
    
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.client.generateCompletion(messages, {
        model: this.model,
        systemPrompt: this.systemPrompts.codeCompletion,
        temperature: 0.1,
        maxTokens: 1024
      });

      return this.parseCompletionResponse(response);
    } catch (error) {
      console.error('Code completion error:', error);
      throw error;
    }
  }

  /**
   * Generate code refactoring suggestions
   */
  async generateCodeRefactoring(context, code, refactoringType = 'general') {
    const prompt = this.buildRefactoringPrompt(context, code, refactoringType);
    
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.client.generateCompletion(messages, {
        model: this.model,
        systemPrompt: this.systemPrompts.codeRefactoring,
        temperature: 0.2,
        maxTokens: 2048
      });

      return this.parseRefactoringResponse(response);
    } catch (error) {
      console.error('Code refactoring error:', error);
      throw error;
    }
  }

  /**
   * Diagnose compilation errors
   */
  async diagnoseError(context, errorMessage, code) {
    const prompt = this.buildErrorDiagnosisPrompt(context, errorMessage, code);
    
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.client.generateCompletion(messages, {
        model: this.model,
        systemPrompt: this.systemPrompts.errorDiagnosis,
        temperature: 0.1,
        maxTokens: 1024
      });

      return this.parseErrorDiagnosisResponse(response);
    } catch (error) {
      console.error('Error diagnosis error:', error);
      throw error;
    }
  }

  /**
   * Generate code based on requirements
   */
  async generateCode(context, requirements) {
    const prompt = this.buildCodeGenerationPrompt(context, requirements);
    
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.client.generateCompletion(messages, {
        model: this.model,
        systemPrompt: this.systemPrompts.codeGeneration,
        temperature: 0.3,
        maxTokens: 2048
      });

      return this.parseCodeGenerationResponse(response);
    } catch (error) {
      console.error('Code generation error:', error);
      throw error;
    }
  }

  /**
   * Review code and provide feedback
   */
  async reviewCode(context, code) {
    const prompt = this.buildCodeReviewPrompt(context, code);
    
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.client.generateCompletion(messages, {
        model: this.model,
        systemPrompt: this.systemPrompts.codeReview,
        temperature: 0.2,
        maxTokens: 1024
      });

      return this.parseCodeReviewResponse(response);
    } catch (error) {
      console.error('Code review error:', error);
      throw error;
    }
  }

  /**
   * Build completion prompt
   */
  buildCompletionPrompt(context, cursorPosition, selectedCode) {
    const { currentFile, projectFiles, index } = context;
    
    let prompt = `Context: You are working on the LAWSA C compiler project.\n\n`;
    
    if (currentFile) {
      prompt += `Current file: ${currentFile.path}\n`;
      prompt += `Cursor position: Line ${cursorPosition.line}, Column ${cursorPosition.column}\n\n`;
      
      if (selectedCode) {
        prompt += `Selected code:\n\`\`\`c\n${selectedCode}\n\`\`\`\n\n`;
      }
      
      prompt += `Current file content:\n\`\`\`c\n${currentFile.content}\n\`\`\`\n\n`;
    }
    
    prompt += `Available functions in project:\n`;
    for (const [filePath, fileIndex] of Object.entries(index.files)) {
      for (const func of fileIndex.functions) {
        prompt += `- ${func.returnType} ${func.name}() (in ${filePath})\n`;
      }
    }
    
    prompt += `\nPlease provide intelligent code completion suggestions for the current cursor position.`;
    
    return prompt;
  }

  /**
   * Build refactoring prompt
   */
  buildRefactoringPrompt(context, code, refactoringType) {
    let prompt = `Context: You are working on the LAWSA C compiler project.\n\n`;
    prompt += `Code to refactor:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
    prompt += `Refactoring type: ${refactoringType}\n\n`;
    prompt += `Please refactor this code to improve readability, maintainability, and adherence to C best practices while ensuring compatibility with the LAWSA compiler.`;
    
    return prompt;
  }

  /**
   * Build error diagnosis prompt
   */
  buildErrorDiagnosisPrompt(context, errorMessage, code) {
    let prompt = `Context: You are working on the LAWSA C compiler project.\n\n`;
    prompt += `Error message: ${errorMessage}\n\n`;
    prompt += `Code with error:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
    prompt += `Please diagnose this compilation error and provide a fix that works with the LAWSA compiler.`;
    
    return prompt;
  }

  /**
   * Build code generation prompt
   */
  buildCodeGenerationPrompt(context, requirements) {
    let prompt = `Context: You are working on the LAWSA C compiler project.\n\n`;
    prompt += `Requirements:\n${requirements}\n\n`;
    prompt += `Please generate C code that meets these requirements and can be compiled by the LAWSA compiler.`;
    
    return prompt;
  }

  /**
   * Build code review prompt
   */
  buildCodeReviewPrompt(context, code) {
    let prompt = `Context: You are working on the LAWSA C compiler project.\n\n`;
    prompt += `Code to review:\n\`\`\`c\n${code}\n\`\`\`\n\n`;
    prompt += `Please review this code for correctness, performance, readability, and compatibility with the LAWSA compiler.`;
    
    return prompt;
  }

  /**
   * Parse completion response
   */
  parseCompletionResponse(response) {
    const content = response.choices?.[0]?.message?.content || '';
    
    // Extract code suggestions
    const suggestions = [];
    const codeBlocks = content.match(/```c?\n([\s\S]*?)\n```/g);
    
    if (codeBlocks) {
      for (const block of codeBlocks) {
        const code = block.replace(/```c?\n/, '').replace(/\n```/, '');
        suggestions.push({
          type: 'code',
          content: code,
          confidence: 0.9
        });
      }
    }
    
    // Extract inline suggestions
    const inlineSuggestions = content.match(/([a-zA-Z_][a-zA-Z0-9_]*\s*[=;(){}[\]]*)/g);
    if (inlineSuggestions) {
      for (const suggestion of inlineSuggestions) {
        suggestions.push({
          type: 'inline',
          content: suggestion.trim(),
          confidence: 0.7
        });
      }
    }
    
    return {
      suggestions,
      explanation: content,
      model: this.model
    };
  }

  /**
   * Parse refactoring response
   */
  parseRefactoringResponse(response) {
    const content = response.choices?.[0]?.message?.content || '';
    
    // Extract refactored code
    const codeBlocks = content.match(/```c?\n([\s\S]*?)\n```/g);
    const refactoredCode = codeBlocks ? codeBlocks[0].replace(/```c?\n/, '').replace(/\n```/, '') : content;
    
    return {
      refactoredCode,
      explanation: content,
      model: this.model
    };
  }

  /**
   * Parse error diagnosis response
   */
  parseErrorDiagnosisResponse(response) {
    const content = response.choices?.[0]?.message?.content || '';
    
    return {
      diagnosis: content,
      suggestedFix: this.extractSuggestedFix(content),
      model: this.model
    };
  }

  /**
   * Parse code generation response
   */
  parseCodeGenerationResponse(response) {
    const content = response.choices?.[0]?.message?.content || '';
    
    // Extract generated code
    const codeBlocks = content.match(/```c?\n([\s\S]*?)\n```/g);
    const generatedCode = codeBlocks ? codeBlocks[0].replace(/```c?\n/, '').replace(/\n```/, '') : content;
    
    return {
      generatedCode,
      explanation: content,
      model: this.model
    };
  }

  /**
   * Parse code review response
   */
  parseCodeReviewResponse(response) {
    const content = response.choices?.[0]?.message?.content || '';
    
    return {
      review: content,
      suggestions: this.extractReviewSuggestions(content),
      model: this.model
    };
  }

  /**
   * Extract suggested fix from diagnosis
   */
  extractSuggestedFix(content) {
    const fixMatch = content.match(/Suggested fix:\s*\n```c?\n([\s\S]*?)\n```/);
    return fixMatch ? fixMatch[1] : null;
  }

  /**
   * Extract review suggestions
   */
  extractReviewSuggestions(content) {
    const suggestions = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[-*]\s+/)) {
        suggestions.push(line.replace(/^[-*]\s+/, ''));
      }
    }
    
    return suggestions;
  }

  /**
   * Test the service
   */
  async testService() {
    try {
      const testContext = {
        currentFile: {
          path: 'test.c',
          content: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
        },
        projectFiles: ['test.c'],
        index: {
          files: {
            'test.c': {
              functions: [{ name: 'main', returnType: 'int', line: 4 }],
              variables: [],
              imports: ['stdio.h']
            }
          }
        }
      };
      
      const completion = await this.generateCodeCompletion(testContext, { line: 5, column: 1 });
      return {
        success: true,
        completion: completion,
        message: 'Qwen Coder service is working correctly'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Qwen Coder service test failed'
      };
    }
  }
}

module.exports = QwenCoderService; 