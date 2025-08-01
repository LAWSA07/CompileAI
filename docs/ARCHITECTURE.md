# LAWSA Cursor IDE Architecture

## Overview

The LAWSA Cursor IDE is built as a modular, AI-powered development environment that integrates the LAWSA C compiler with advanced code assistance features. The architecture follows a service-oriented design pattern with clear separation of concerns.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LAWSA Cursor IDE                        │
├─────────────────────────────────────────────────────────────┤
│  Electron Main Process                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   File System   │  │   IPC Bridge    │  │   Compiler  │ │
│  │   Operations    │  │                 │  │   Interface │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Electron Renderer Process                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Monaco Editor │  │   UI Components │  │   Panels    │ │
│  │   (Code Editor) │  │                 │  │   (Console, │ │
│  └─────────────────┘  └─────────────────┘  │   Assembly, │ │
│                                            │   Diff)      │ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 Service Layer                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │  Memory     │  │    LLM      │  │     AI      │   │ │
│  │  │  Service    │  │   Service   │  │ Completion  │   │ │
│  │  │             │  │             │  │   Service   │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Core Services                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Memory Store  │  │  OpenRouter     │  │  Qwen Coder │ │
│  │   (JSON-based)  │  │     Client      │  │   Service   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  LAWSA C Compiler                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Tokenizer     │  │     Parser      │  │   Code      │ │
│  │                 │  │     (AST)       │  │ Generator   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Electron Main Process

**Responsibilities:**
- File system operations (open, save, read)
- IPC communication with renderer process
- Compiler process management
- Application lifecycle management

**Key Components:**
- `main.js`: Main process entry point
- File handlers for open/save operations
- Compiler process spawner
- IPC event handlers

### 2. Electron Renderer Process

**Responsibilities:**
- User interface rendering
- Editor management
- Service coordination
- Real-time updates

**Key Components:**
- `renderer.js`: Main renderer logic
- Monaco Editor integration
- Panel management (Console, Assembly, Diff)
- Service initialization and coordination

### 3. Service Layer

#### Memory Service
**Purpose:** Persistent storage and retrieval of project context, history, and AI interactions.

**Key Features:**
- JSON-based storage in `.lawsa-memory/` directory
- Automatic indexing of functions, variables, and imports
- History tracking with automatic cleanup
- AI interaction logging
- Context-aware search capabilities

**Data Structure:**
```javascript
{
  project: {
    id: "unique-project-id",
    name: "project-name",
    path: "/project/path",
    createdAt: "timestamp",
    lastModified: "timestamp"
  },
  files: {
    "relative/path/file.c": {
      content: "file content",
      functions: [...],
      variables: [...],
      imports: [...],
      lastModified: "timestamp"
    }
  },
  context: {
    currentFile: "current/file.c",
    cursorPosition: { line: 1, column: 1 },
    selectedText: "",
    compilationState: "idle"
  },
  history: [...],
  aiInteractions: [...]
}
```

#### LLM Service
**Purpose:** AI-powered code assistance using the Qwen Coder model via OpenRouter.

**Key Features:**
- Code completion with context awareness
- Intelligent code refactoring
- Error diagnosis and fix suggestions
- Code generation from requirements
- Code review and feedback

**Integration Points:**
- OpenRouter API for model access
- Memory service for context retrieval
- Monaco Editor for completion integration

#### AI Completion Service
**Purpose:** Monaco Editor integration for intelligent code completion.

**Key Features:**
- Real-time completion suggestions
- Context-aware completions
- Caching for performance
- Function signature suggestions
- Variable name suggestions

### 4. Core Services

#### Memory Store
**Purpose:** Low-level persistent storage implementation.

**Features:**
- JSON file-based storage
- Automatic directory creation
- Data validation and sanitization
- Export/import capabilities
- Memory cleanup utilities

#### OpenRouter Client
**Purpose:** HTTP client for OpenRouter API communication.

**Features:**
- Authentication handling
- Rate limiting
- Error handling and retries
- Streaming support
- Connection testing

#### Qwen Coder Service
**Purpose:** Specialized service for Qwen Coder model interactions.

**Features:**
- Compiler-aware system prompts
- Task-specific prompt building
- Response parsing and validation
- Fallback mechanisms
- Service health monitoring

### 5. LAWSA C Compiler

**Purpose:** Core C compiler functionality.

**Components:**
- **Tokenizer:** Converts source code to tokens
- **Parser:** Builds Abstract Syntax Tree (AST)
- **Code Generator:** Produces x86-64 assembly
- **Preprocessor:** Handles directives (#include, #define, etc.)
- **Type System:** Manages C type checking

## Data Flow

### 1. Code Editing Flow
```
User Input → Monaco Editor → Content Change Event → Memory Service → AI Context Update
```

### 2. Compilation Flow
```
Code → LAWSA Compiler → Assembly Output → Console Panel → Memory History
```

### 3. AI Assistance Flow
```
User Request → LLM Service → OpenRouter API → Qwen Coder → Response → UI Update
```

### 4. Memory Persistence Flow
```
Service Operations → Memory Store → JSON Files → .lawsa-memory/ Directory
```

## Configuration Management

### Configuration Files
- `config/openrouter.json`: OpenRouter API settings
- `config/memory.json`: Memory system configuration
- `config/ide.json`: IDE behavior settings

### Environment Variables
- `LAWSA_API_KEY`: OpenRouter API key
- `LAWSA_PROJECT_PATH`: Project directory path
- `LAWSA_DEBUG`: Debug mode flag

## Security Considerations

### API Key Management
- API keys stored in configuration files
- Environment variable support for production
- No hardcoded keys in source code

### Data Privacy
- Memory data stored locally only
- No external data transmission beyond API calls
- User consent for AI interactions

### Error Handling
- Graceful degradation when services fail
- Local fallback mechanisms
- Comprehensive error logging

## Performance Optimizations

### Caching Strategy
- AI completion results cached for 5 minutes
- Memory data cached in memory with JSON persistence
- Editor state cached for quick restoration

### Resource Management
- Automatic cleanup of old history entries
- Memory usage monitoring
- Service health checks

### Async Operations
- Non-blocking UI operations
- Background service initialization
- Progressive loading of large files

## Extension Points

### Service Plugins
- Custom LLM service implementations
- Alternative memory storage backends
- Additional editor integrations

### Compiler Extensions
- New language feature support
- Custom optimization passes
- Alternative target architectures

### UI Customization
- Theme system for editor appearance
- Panel layout customization
- Keyboard shortcut configuration

## Testing Strategy

### Unit Tests
- Service method testing
- Memory store operations
- API client functionality

### Integration Tests
- Service interaction testing
- Editor integration testing
- Compiler workflow testing

### End-to-End Tests
- Complete user workflow testing
- Error scenario testing
- Performance benchmarking

## Deployment

### Development
- Local file-based configuration
- Hot reloading for development
- Debug mode with verbose logging

### Production
- Packaged Electron application
- Optimized for performance
- Minimal logging for security

### Distribution
- Cross-platform builds (Windows, macOS, Linux)
- Auto-update mechanism
- Installer generation 