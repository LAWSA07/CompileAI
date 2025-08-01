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
        this.defaultOptions = {
            maxTokens: 2048,
            temperature: 0.1,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0
        };
    }

    getCodeCompletionSystemPrompt() {
        return `You are an expert C programming assistant integrated into the LAWSA C compiler IDE. Your task is to provide intelligent code completion suggestions.

Key responsibilities:
- Analyze the current code context and cursor position
- Suggest relevant function names, variable names, and code snippets
- Provide context-aware completions based on the current file and project structure
- Follow C programming best practices and the LAWSA compiler's capabilities
- Consider the current compilation state and any recent errors

Current LAWSA compiler supports:
- Integer arithmetic and local variables
- Basic control flow (if, while, for)
- Function definitions and calls
- Blocks and return statements
- Assignment operations
- Basic type system (int, char, float, double, void)
- Preprocessor directives (#include, #define, #ifdef, etc.)

Provide concise, accurate completions that integrate seamlessly with the existing codebase.`;
    }

    getCodeRefactoringSystemPrompt() {
        return `You are an expert C programming assistant specializing in code refactoring within the LAWSA C compiler IDE.

Your task is to refactor C code to improve:
- Readability and maintainability
- Performance optimization
- Code structure and organization
- Error handling and robustness
- Adherence to C programming best practices

Consider the LAWSA compiler's capabilities:
- Integer arithmetic and local variables
- Basic control flow (if, while, for)
- Function definitions and calls
- Blocks and return statements
- Assignment operations
- Basic type system (int, char, float, double, void)
- Preprocessor directives (#include, #define, #ifdef, etc.)

Provide refactored code that:
- Maintains the original functionality
- Improves code quality and structure
- Is compatible with the LAWSA compiler
- Includes clear explanations of changes made`;
    }

    getErrorDiagnosisSystemPrompt() {
        return `You are an expert C programming assistant specializing in error diagnosis for the LAWSA C compiler.

Your task is to analyze compilation errors and provide:
- Clear explanations of what caused the error
- Specific suggestions for fixing the issue
- Code examples showing the correct approach
- Prevention tips for similar errors

Consider the LAWSA compiler's specific error patterns:
- Syntax errors in C code
- Type mismatches and declaration issues
- Missing semicolons, brackets, or parentheses
- Undefined variables or functions
- Preprocessor directive errors
- Memory and scope issues

Provide actionable, step-by-step solutions that help users understand and fix their compilation errors.`;
    }

    getCodeGenerationSystemPrompt() {
        return `You are an expert C programming assistant for the LAWSA C compiler IDE, specializing in code generation.

Your task is to generate C code based on user requirements, considering:
- LAWSA compiler capabilities and limitations
- C programming best practices
- Efficient and readable code structure
- Proper error handling and validation

LAWSA compiler supports:
- Integer arithmetic and local variables
- Basic control flow (if, while, for)
- Function definitions and calls
- Blocks and return statements
- Assignment operations
- Basic type system (int, char, float, double, void)
- Preprocessor directives (#include, #define, #ifdef, etc.)

Generate code that:
- Is immediately compilable with LAWSA
- Follows C programming conventions
- Includes appropriate comments and documentation
- Handles edge cases and error conditions
- Is optimized for the LAWSA compiler's capabilities`;
    }

    getCodeReviewSystemPrompt() {
        return `You are an expert C programming code reviewer for the LAWSA C compiler IDE.

Your task is to review C code and provide feedback on:
- Code quality and readability
- Potential bugs and issues
- Performance optimizations
- Security considerations
- Adherence to C programming best practices
- Compatibility with LAWSA compiler

Consider LAWSA compiler specifics:
- Supported language features and limitations
- Common compilation issues
- Performance characteristics
- Error patterns and debugging tips

Provide constructive feedback that helps improve code quality while working within LAWSA's capabilities.`;
    }

    async generateCodeCompletion(context, cursorPosition, selectedText = '') {
        const prompt = this.buildCompletionPrompt(context, cursorPosition, selectedText);
        const systemPrompt = this.getCodeCompletionSystemPrompt();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await this.client.generateCompletion(this.model, messages, this.defaultOptions);
            return this.parseCompletionResponse(response);
        } catch (error) {
            console.error('Code completion error:', error);
            throw error;
        }
    }

    async generateCodeRefactoring(code, requirements = '') {
        const prompt = this.buildRefactoringPrompt(code, requirements);
        const systemPrompt = this.getCodeRefactoringSystemPrompt();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await this.client.generateCompletion(this.model, messages, this.defaultOptions);
            return this.parseRefactoringResponse(response);
        } catch (error) {
            console.error('Code refactoring error:', error);
            throw error;
        }
    }

    async diagnoseError(errorMessage, code, context = '') {
        const prompt = this.buildErrorDiagnosisPrompt(errorMessage, code, context);
        const systemPrompt = this.getErrorDiagnosisSystemPrompt();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await this.client.generateCompletion(this.model, messages, this.defaultOptions);
            return this.parseErrorDiagnosisResponse(response);
        } catch (error) {
            console.error('Error diagnosis error:', error);
            throw error;
        }
    }

    async generateCode(requirements, context = '') {
        const prompt = this.buildCodeGenerationPrompt(requirements, context);
        const systemPrompt = this.getCodeGenerationSystemPrompt();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await this.client.generateCompletion(this.model, messages, this.defaultOptions);
            return this.parseCodeGenerationResponse(response);
        } catch (error) {
            console.error('Code generation error:', error);
            throw error;
        }
    }

    async reviewCode(code, focusAreas = []) {
        const prompt = this.buildCodeReviewPrompt(code, focusAreas);
        const systemPrompt = this.getCodeReviewSystemPrompt();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await this.client.generateCompletion(this.model, messages, this.defaultOptions);
            return this.parseCodeReviewResponse(response);
        } catch (error) {
            console.error('Code review error:', error);
            throw error;
        }
    }

    buildCompletionPrompt(context, cursorPosition, selectedText) {
        return `Context: ${context}

Cursor Position: Line ${cursorPosition.line}, Column ${cursorPosition.column}
Selected Text: ${selectedText}

Please provide intelligent code completion suggestions for the current cursor position. Consider the surrounding code context and provide relevant completions.`;
    }

    buildRefactoringPrompt(code, requirements) {
        return `Code to refactor:
\`\`\`c
${code}
\`\`\`

Refactoring requirements: ${requirements}

Please provide refactored code that improves the original while maintaining functionality.`;
    }

    buildErrorDiagnosisPrompt(errorMessage, code, context) {
        return `Compilation Error: ${errorMessage}

Code:
\`\`\`c
${code}
\`\`\`

Context: ${context}

Please diagnose the error and provide a solution.`;
    }

    buildCodeGenerationPrompt(requirements, context) {
        return `Requirements: ${requirements}

Context: ${context}

Please generate C code that meets these requirements and is compatible with the LAWSA compiler.`;
    }

    buildCodeReviewPrompt(code, focusAreas) {
        return `Code to review:
\`\`\`c
${code}
\`\`\`

Focus areas: ${focusAreas.join(', ')}

Please provide a comprehensive code review.`;
    }

    parseCompletionResponse(response) {
        const content = response.choices?.[0]?.message?.content || '';
        return {
            suggestions: this.extractSuggestions(content),
            explanation: content
        };
    }

    parseRefactoringResponse(response) {
        const content = response.choices?.[0]?.message?.content || '';
        return {
            refactoredCode: this.extractSuggestedFix(content),
            explanation: content,
            changes: this.extractChanges(content)
        };
    }

    parseErrorDiagnosisResponse(response) {
        const content = response.choices?.[0]?.message?.content || '';
        return {
            diagnosis: content,
            suggestedFix: this.extractSuggestedFix(content),
            explanation: content
        };
    }

    parseCodeGenerationResponse(response) {
        const content = response.choices?.[0]?.message?.content || '';
        return {
            generatedCode: this.extractSuggestedFix(content),
            explanation: content
        };
    }

    parseCodeReviewResponse(response) {
        const content = response.choices?.[0]?.message?.content || '';
        return {
            review: content,
            suggestions: this.extractReviewSuggestions(content),
            issues: this.extractIssues(content)
        };
    }

    extractSuggestedFix(content) {
        const codeBlockRegex = /```c?\s*\n([\s\S]*?)\n```/;
        const match = content.match(codeBlockRegex);
        return match ? match[1].trim() : '';
    }

    extractSuggestions(content) {
        const suggestions = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.trim() && !line.startsWith('```')) {
                suggestions.push(line.trim());
            }
        }
        
        return suggestions;
    }

    extractChanges(content) {
        const changes = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.includes('change') || line.includes('improve') || line.includes('fix')) {
                changes.push(line.trim());
            }
        }
        
        return changes;
    }

    extractReviewSuggestions(content) {
        const suggestions = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.includes('suggestion') || line.includes('recommend') || line.includes('consider')) {
                suggestions.push(line.trim());
            }
        }
        
        return suggestions;
    }

    extractIssues(content) {
        const issues = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            if (line.includes('issue') || line.includes('problem') || line.includes('error') || line.includes('bug')) {
                issues.push(line.trim());
            }
        }
        
        return issues;
    }

    async testService() {
        try {
            const testResponse = await this.generateCodeCompletion('int main() {\n    int x = 10;\n    ', { line: 2, column: 5 });
            return {
                success: true,
                message: 'Qwen Coder service is working correctly',
                testResponse
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