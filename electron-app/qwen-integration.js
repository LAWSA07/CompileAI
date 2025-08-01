/**
 * Direct Qwen Integration for Electron App
 * This bypasses the complex service loading and provides direct access to Qwen
 */

// Simple Qwen integration that works directly in the renderer
class SimpleQwenIntegration {
    constructor() {
        this.apiKey = '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';
        this.model = 'qwen/qwen3-coder:free';
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.isAvailable = true;
    }

    async makeRequest(messages, options = {}) {
        const {
            maxTokens = 2048,
            temperature = 0.1,
            topP = 1,
            frequencyPenalty = 0,
            presencePenalty = 0
        } = options;

        const data = {
            model: this.model,
            messages,
            max_tokens: maxTokens,
            temperature,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty
        };

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://lawsa-cursor-ide.com',
                    'X-Title': 'LAWSA Cursor IDE'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Qwen API Error:', error);
            throw error;
        }
    }

    async generateCode(requirements, context = '') {
        // Detect if user is asking for non-C code
        const lowerReq = requirements.toLowerCase();
        const isWebRequest = lowerReq.includes('html') || lowerReq.includes('css') || lowerReq.includes('javascript') ||
                           lowerReq.includes('web') || lowerReq.includes('react') || lowerReq.includes('vue') ||
                           lowerReq.includes('angular') || lowerReq.includes('frontend');
        
        let systemPrompt, userPrompt;
        
        if (isWebRequest) {
            // Web development prompt
            systemPrompt = `You are an expert web developer. Generate clean, modern HTML, CSS, and JavaScript code.

Create responsive, well-structured web applications with:
- Semantic HTML5
- Modern CSS (Flexbox/Grid)
- Vanilla JavaScript or requested frameworks
- Accessible and user-friendly interfaces
- Clean, commented code`;

            userPrompt = `Requirements: ${requirements}

Context: ${context}

Please generate the appropriate web code (HTML, CSS, JavaScript) that meets these requirements.`;
        } else {
            // C programming prompt for LAWSA compiler
            systemPrompt = `You are an expert C programming assistant for the LAWSA C compiler IDE.

LAWSA compiler supports:
- Integer arithmetic and local variables
- Basic control flow (if, while, for)
- Function definitions and calls
- Blocks and return statements
- Assignment operations
- Basic type system (int, char, float, double, void)
- Preprocessor directives (#include, #define, #ifdef, etc.)

Generate clean, well-commented C code that is compatible with LAWSA compiler.`;

            userPrompt = `Requirements: ${requirements}

Context: ${context}

Please generate C code that meets these requirements and is compatible with the LAWSA compiler.`;
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const response = await this.makeRequest(messages);
            const content = response.choices?.[0]?.message?.content || '';
            
            // Extract code from response - handle multiple code blocks
            const codeBlocks = [];
            const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
            let match;
            
            while ((match = codeBlockRegex.exec(content)) !== null) {
                const language = match[1] || 'text';
                const code = match[2].trim();
                codeBlocks.push({ language, code });
            }
            
            // If no code blocks found, treat entire content as code
            if (codeBlocks.length === 0) {
                const language = isWebRequest ? 'html' : 'c';
                codeBlocks.push({ language, code: content.trim() });
            }
            
            // Create files based on detected code blocks
            const files = [];
            let mainFile = null;
            
            if (isWebRequest) {
                // For web requests, create appropriate files
                const htmlCode = codeBlocks.find(block => block.language === 'html')?.code ||
                               codeBlocks.find(block => !block.language || block.language === 'text')?.code || '';
                const cssCode = codeBlocks.find(block => block.language === 'css')?.code || '';
                const jsCode = codeBlocks.find(block => block.language === 'javascript' || block.language === 'js')?.code || '';
                
                if (htmlCode) {
                    files.push({ name: 'index.html', content: htmlCode, purpose: 'Main HTML file' });
                    mainFile = { name: 'index.html', content: htmlCode };
                }
                if (cssCode) {
                    files.push({ name: 'style.css', content: cssCode, purpose: 'CSS styles' });
                }
                if (jsCode) {
                    files.push({ name: 'script.js', content: jsCode, purpose: 'JavaScript functionality' });
                }
                
                // If no specific files, create a single HTML file with embedded styles
                if (files.length === 0) {
                    files.push({ name: 'index.html', content: content.trim(), purpose: 'Web application' });
                    mainFile = { name: 'index.html', content: content.trim() };
                }
            } else {
                // For C code requests
                const cCode = codeBlocks.find(block => block.language === 'c')?.code ||
                             codeBlocks[0]?.code || content.trim();
                files.push({ name: 'main.c', content: cCode, purpose: 'Generated C code' });
                mainFile = { name: 'main.c', content: cCode };
            }
            
            return {
                success: true,
                generatedCode: mainFile?.content || '',
                explanation: content,
                files,
                mainFile,
                structure: {
                    name: isWebRequest ? 'Generated Web Project' : 'Generated C Project'
                }
            };
        } catch (error) {
            console.error('Code generation error:', error);
            return {
                success: false,
                error: error.message,
                generatedCode: '',
                explanation: `Error: ${error.message}`
            };
        }
    }

    async diagnoseError(errorMessage, code, context = '') {
        const systemPrompt = `You are an expert C programming assistant specializing in error diagnosis for the LAWSA C compiler.

Analyze compilation errors and provide:
- Clear explanations of what caused the error
- Specific suggestions for fixing the issue
- Code examples showing the correct approach`;

        const userPrompt = `Compilation Error: ${errorMessage}

Code:
\`\`\`c
${code}
\`\`\`

Context: ${context}

Please diagnose the error and provide a solution.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const response = await this.makeRequest(messages);
            const content = response.choices?.[0]?.message?.content || '';
            
            return {
                success: true,
                diagnosis: content,
                explanation: content
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                diagnosis: `Error diagnosis failed: ${error.message}`
            };
        }
    }

    async generateCompletion(context, cursorPosition) {
        const systemPrompt = `You are an expert C programming assistant. Provide intelligent code completion suggestions for the current cursor position.

Consider the LAWSA compiler capabilities and provide relevant completions.`;

        const userPrompt = `Context: ${context}

Cursor Position: Line ${cursorPosition.line}, Column ${cursorPosition.column}

Please provide intelligent code completion suggestions.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        try {
            const response = await this.makeRequest(messages);
            const content = response.choices?.[0]?.message?.content || '';
            
            return {
                success: true,
                suggestions: content.split('\n').filter(line => line.trim()).slice(0, 5),
                explanation: content
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                suggestions: []
            };
        }
    }

    getStatus() {
        return {
            available: this.isAvailable,
            model: this.model,
            provider: 'OpenRouter'
        };
    }
}

// Make it globally available
window.SimpleQwenIntegration = SimpleQwenIntegration;

// Create instance
window.qwenAI = new SimpleQwenIntegration();

console.log('🤖 Simple Qwen Integration loaded');