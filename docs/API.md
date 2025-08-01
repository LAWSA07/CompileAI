# LAWSA Cursor IDE API Documentation

## Overview

The LAWSA Cursor IDE provides a comprehensive API for integrating AI-powered development features with the LAWSA C compiler. This document outlines the available services and their interfaces.

## Services

### MemoryService

The memory service provides persistent storage and retrieval for project context, history, and AI interactions.

#### Constructor
```javascript
const memoryService = new MemoryService();
```

#### Methods

##### `initialize(projectPath)`
Initializes the memory service for a specific project.
- **Parameters:**
  - `projectPath` (string): Path to the project directory
- **Returns:** `boolean` - Success status

##### `updateFile(filePath, content)`
Updates the memory with file content and extracts metadata.
- **Parameters:**
  - `filePath` (string): Path to the file
  - `content` (string): File content
- **Returns:** `object` - Success status and metadata

##### `updateContext(context)`
Updates the current context (cursor position, selected text, etc.).
- **Parameters:**
  - `context` (object): Context information
- **Returns:** `object` - Success status

##### `getAIContext()`
Retrieves context information for AI operations.
- **Returns:** `object` - AI context including current file, recent interactions, and project structure

##### `addAIInteraction(type, prompt, response, metadata)`
Records an AI interaction for future reference.
- **Parameters:**
  - `type` (string): Type of interaction (completion, refactoring, etc.)
  - `prompt` (string): The prompt sent to AI
  - `response` (string): The AI response
  - `metadata` (object): Additional metadata
- **Returns:** `object` - Success status

##### `searchMemory(query)`
Searches through stored memory for relevant information.
- **Parameters:**
  - `query` (string): Search query
- **Returns:** `array` - Search results

### LLMService

The LLM service provides AI-powered code assistance using the Qwen Coder model via OpenRouter.

#### Constructor
```javascript
const llmService = new LLMService(apiKey);
```

#### Methods

##### `initialize()`
Initializes the LLM service and tests the connection.
- **Returns:** `Promise<object>` - Initialization result

##### `generateCodeCompletion(context, cursorPosition, selectedText)`
Generates code completion suggestions.
- **Parameters:**
  - `context` (string): Code context around cursor
  - `cursorPosition` (object): {line, column}
  - `selectedText` (string): Currently selected text
- **Returns:** `Promise<object>` - Completion suggestions

##### `generateCodeRefactoring(code, requirements)`
Refactors code based on requirements.
- **Parameters:**
  - `code` (string): Code to refactor
  - `requirements` (string): Refactoring requirements
- **Returns:** `Promise<object>` - Refactored code and explanation

##### `diagnoseError(errorMessage, code, context)`
Diagnoses compilation errors and suggests fixes.
- **Parameters:**
  - `errorMessage` (string): Error message
  - `code` (string): Code with error
  - `context` (string): Additional context
- **Returns:** `Promise<object>` - Diagnosis and suggested fix

##### `generateCode(requirements, context)`
Generates code based on requirements.
- **Parameters:**
  - `requirements` (string): Code requirements
  - `context` (string): Additional context
- **Returns:** `Promise<object>` - Generated code and explanation

##### `reviewCode(code, focusAreas)`
Reviews code and provides feedback.
- **Parameters:**
  - `code` (string): Code to review
  - `focusAreas` (array): Areas to focus on
- **Returns:** `Promise<object>` - Review feedback and suggestions

### AICompletionService

The AI completion service integrates with Monaco Editor to provide intelligent code completion.

#### Constructor
```javascript
const aiCompletionService = new AICompletionService(llmService);
```

#### Methods

##### `registerCompletionProvider(monaco, editor)`
Registers the AI completion provider with Monaco Editor.
- **Parameters:**
  - `monaco` (object): Monaco Editor instance
  - `editor` (object): Editor instance
- **Returns:** `object` - Disposable for cleanup

##### `generateCompletions(context, cursorPosition, selectedText)`
Generates completion suggestions for a given context.
- **Parameters:**
  - `context` (string): Code context
  - `cursorPosition` (object): {line, column}
  - `selectedText` (string): Selected text
- **Returns:** `Promise<object>` - Completion suggestions

##### `convertToMonacoCompletions(suggestions, position)`
Converts AI suggestions to Monaco completion items.
- **Parameters:**
  - `suggestions` (array): AI suggestions
  - `position` (object): Cursor position
- **Returns:** `array` - Monaco completion items

## Configuration

### OpenRouter Configuration
```json
{
  "apiKey": "your-api-key",
  "baseURL": "https://openrouter.ai/api/v1",
  "model": "qwen/qwen2.5-coder-7b-instruct",
  "maxTokens": 2048,
  "temperature": 0.1
}
```

### Memory Configuration
```json
{
  "storage": {
    "type": "json",
    "directory": ".lawsa-memory"
  },
  "history": {
    "maxEntries": 1000
  },
  "aiInteractions": {
    "maxEntries": 500
  }
}
```

## Error Handling

All services return consistent error objects:

```javascript
{
  success: false,
  error: "Error message",
  source: "service-name"
}
```

## Usage Examples

### Basic Setup
```javascript
// Initialize services
const memoryService = new MemoryService();
memoryService.initialize(projectPath);

const llmService = new LLMService(apiKey);
await llmService.initialize();

const aiCompletionService = new AICompletionService(llmService);
```

### Code Completion
```javascript
const context = "int main() {\n    int x = 10;\n    ";
const position = { line: 2, column: 5 };
const result = await llmService.generateCodeCompletion(context, position);
```

### Code Refactoring
```javascript
const code = "int x = 10; int y = 20; int z = x + y;";
const result = await llmService.generateCodeRefactoring(code, "Improve readability");
```

### Error Diagnosis
```javascript
const error = "error: expected ';' before '}' token";
const code = "int main() { int x = 10 }";
const result = await llmService.diagnoseError(error, code);
``` 