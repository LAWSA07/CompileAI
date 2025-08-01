/**
 * Code Generation Service for LAWSA Cursor IDE
 * 
 * This service handles AI-powered code generation and automatic
 * project structure creation based on user prompts.
 */

const LLMService = require('./llmService');
const path = require('path');
const fs = require('fs').promises;

class CodeGenerationService {
    constructor(llmService, memoryService) {
        this.llmService = llmService;
        this.memoryService = memoryService;
        this.projectStructure = new Map();
        this.generatedFiles = new Map();
    }

    async generateProjectFromPrompt(prompt, projectPath = null) {
        try {
            // Step 1: Analyze prompt and generate project structure
            const structureResult = await this.generateProjectStructure(prompt);
            
            if (!structureResult.success) {
                throw new Error(structureResult.error);
            }

            // Step 2: Generate code for each file
            const codeResult = await this.generateCodeFiles(structureResult.structure, prompt);
            
            if (!codeResult.success) {
                throw new Error(codeResult.error);
            }

            // Step 3: Create files and folders if project path is provided
            if (projectPath) {
                await this.createProjectFiles(codeResult.files, projectPath);
            }

            return {
                success: true,
                structure: structureResult.structure,
                files: codeResult.files,
                mainFile: this.determineMainFile(codeResult.files),
                explanation: codeResult.explanation
            };

        } catch (error) {
            console.error('Code generation error:', error);
            return {
                success: false,
                error: error.message,
                files: [],
                structure: null
            };
        }
    }

    async generateProjectStructure(prompt) {
        try {
            const systemPrompt = `You are an expert project architect for C programming projects using the LAWSA compiler.

Your task is to analyze the user's prompt and create a logical project structure with appropriate files and folders.

LAWSA Compiler capabilities:
- Integer arithmetic and local variables
- Basic control flow (if, while, for)
- Function definitions and calls
- Blocks and return statements
- Assignment operations
- Basic type system (int, char, float, double, void)
- Preprocessor directives (#include, #define, #ifdef, etc.)

Respond with a JSON structure like this:
{
  "structure": {
    "type": "project",
    "name": "project_name",
    "files": [
      {
        "name": "main.c",
        "type": "source",
        "purpose": "Main entry point"
      },
      {
        "name": "utils.c",
        "type": "source", 
        "purpose": "Utility functions"
      },
      {
        "name": "utils.h",
        "type": "header",
        "purpose": "Function declarations"
      }
    ],
    "folders": [
      {
        "name": "src",
        "files": ["main.c", "utils.c"]
      },
      {
        "name": "include", 
        "files": ["utils.h"]
      }
    ]
  }
}

Keep it simple and focused on the LAWSA compiler's capabilities.`;

            const userPrompt = `Create a project structure for: ${prompt}

Please provide a logical file and folder organization for this C project.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const response = await this.llmService.client.generateCompletion(
                this.llmService.model, 
                messages, 
                { ...this.llmService.defaultOptions, temperature: 0.3 }
            );

            const content = response.choices?.[0]?.message?.content || '';
            const structureData = this.extractJsonFromResponse(content);

            if (!structureData || !structureData.structure) {
                throw new Error('Failed to parse project structure from AI response');
            }

            return {
                success: true,
                structure: structureData.structure
            };

        } catch (error) {
            console.error('Project structure generation error:', error);
            return {
                success: false,
                error: error.message,
                structure: null
            };
        }
    }

    async generateCodeFiles(structure, originalPrompt) {
        try {
            const files = [];
            const allFiles = structure.files || [];

            // Generate code for each file
            for (const fileInfo of allFiles) {
                const codeResult = await this.generateFileCode(fileInfo, structure, originalPrompt);
                
                if (codeResult.success) {
                    files.push({
                        name: fileInfo.name,
                        content: codeResult.code,
                        type: fileInfo.type,
                        purpose: fileInfo.purpose
                    });
                }
            }

            return {
                success: true,
                files: files,
                explanation: `Generated ${files.length} files for the project based on your prompt.`
            };

        } catch (error) {
            console.error('Code files generation error:', error);
            return {
                success: false,
                error: error.message,
                files: []
            };
        }
    }

    async generateFileCode(fileInfo, structure, originalPrompt) {
        try {
            const isHeaderFile = fileInfo.name.endsWith('.h');
            const isMainFile = fileInfo.name === 'main.c';

            const systemPrompt = `You are an expert C programmer working with the LAWSA compiler.

LAWSA Compiler capabilities:
- Integer arithmetic and local variables
- Basic control flow (if, while, for)
- Function definitions and calls
- Blocks and return statements
- Assignment operations
- Basic type system (int, char, float, double, void)
- Preprocessor directives (#include, #define, #ifdef, etc.)

Generate clean, well-commented C code that:
- Is compatible with LAWSA compiler
- Follows C programming best practices
- Includes appropriate error handling
- Has clear function and variable names
- Is properly formatted and indented

${isHeaderFile ? 'Generate a header file with function declarations and necessary includes.' : ''}
${isMainFile ? 'Generate a main function that demonstrates the functionality.' : ''}`;

            const userPrompt = `Original request: ${originalPrompt}

File: ${fileInfo.name}
Purpose: ${fileInfo.purpose}
Type: ${fileInfo.type}

${isHeaderFile ? 
  'Generate the header file with function declarations and necessary #define statements.' :
  'Generate the C source code for this file. Include necessary #include statements and implement the functions.'
}

Project structure context:
${JSON.stringify(structure, null, 2)}

Please provide only the C code without explanation or markdown formatting.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const response = await this.llmService.client.generateCompletion(
                this.llmService.model,
                messages,
                { ...this.llmService.defaultOptions, temperature: 0.2 }
            );

            const code = response.choices?.[0]?.message?.content || '';
            const cleanCode = this.cleanGeneratedCode(code);

            return {
                success: true,
                code: cleanCode
            };

        } catch (error) {
            console.error(`File code generation error for ${fileInfo.name}:`, error);
            return {
                success: false,
                error: error.message,
                code: ''
            };
        }
    }

    async createProjectFiles(files, projectPath) {
        try {
            // Ensure project directory exists
            await fs.mkdir(projectPath, { recursive: true });

            // Create each file
            for (const file of files) {
                const filePath = path.join(projectPath, file.name);
                await fs.writeFile(filePath, file.content, 'utf8');
                console.log(`Created file: ${filePath}`);
            }

            return true;
        } catch (error) {
            console.error('Error creating project files:', error);
            throw error;
        }
    }

    determineMainFile(files) {
        // Find main.c or the first .c file
        const mainFile = files.find(f => f.name === 'main.c');
        if (mainFile) return mainFile;

        const cFile = files.find(f => f.name.endsWith('.c'));
        return cFile || files[0];
    }

    extractJsonFromResponse(content) {
        try {
            // Try to find JSON in the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // If no explicit JSON found, try parsing the entire content
            return JSON.parse(content);
        } catch (error) {
            console.error('JSON parsing error:', error);
            return null;
        }
    }

    cleanGeneratedCode(code) {
        // Remove markdown code blocks if present
        const cleanCode = code
            .replace(/```c?\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return cleanCode;
    }

    async generateMultiFileProject(prompt, complexity = 'simple') {
        try {
            const complexityPrompts = {
                simple: 'Create a simple single-file project',
                medium: 'Create a project with 2-3 files including headers',
                complex: 'Create a well-structured project with multiple modules'
            };

            const enhancedPrompt = `${complexityPrompts[complexity]}: ${prompt}`;
            
            return await this.generateProjectFromPrompt(enhancedPrompt);
        } catch (error) {
            console.error('Multi-file project generation error:', error);
            return {
                success: false,
                error: error.message,
                files: []
            };
        }
    }

    getGeneratedFiles() {
        return Array.from(this.generatedFiles.values());
    }

    clearGeneratedFiles() {
        this.generatedFiles.clear();
        this.projectStructure.clear();
    }

    async testService() {
        try {
            const testPrompt = 'Create a simple calculator program';
            const result = await this.generateProjectFromPrompt(testPrompt);
            
            return {
                success: result.success,
                message: result.success ? 'Code generation service is working' : 'Code generation service failed',
                filesGenerated: result.files?.length || 0
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Code generation service test failed'
            };
        }
    }
}

module.exports = CodeGenerationService;
