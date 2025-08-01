# LAWSA Cursor IDE

LAWSA Cursor IDE is an AI-powered development environment that combines the LAWSA C compiler with advanced code assistance features, inspired by Cursor IDE. It provides intelligent code completion, refactoring, error diagnosis, and code generation using the Qwen Coder model via OpenRouter.

## Features

### Core IDE Features
- **Monaco Editor Integration**: Professional code editor with syntax highlighting
- **Real-time Compilation**: Instant compilation and assembly generation
- **Multi-panel Interface**: Console, Assembly, and Diff panels
- **File Management**: Open, save, and manage C source files
- **Keyboard Shortcuts**: Efficient workflow with keyboard shortcuts

### AI-Powered Features
- **Intelligent Code Completion**: Context-aware suggestions using Qwen Coder
- **Code Refactoring**: AI-assisted code improvement and restructuring
- **Error Diagnosis**: Smart error analysis and fix suggestions
- **Code Generation**: Generate code from natural language requirements
- **Code Review**: AI-powered code review and feedback

### Memory System
- **Persistent Context**: Remembers project structure and file history
- **AI Interaction History**: Tracks all AI interactions for context
- **Smart Search**: Search through code, history, and AI interactions
- **Project Intelligence**: Learns from your coding patterns

### Compiler Features
- **LAWSA C Compiler**: Educational C compiler with x86-64 assembly output
- **Basic C Syntax Support**:
  - Integer arithmetic and logic operations
  - Control structures (if/else, while, for)
  - Function definitions and calls
  - Arrays and pointers
  - Character arrays

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)
- OpenRouter API key (for AI features)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd compiler2
   ```

2. **Install dependencies**:
   ```bash
   cd electron-app
   npm install
   ```

3. **Configure AI features** (optional):
   - Edit `config/openrouter.json` to add your OpenRouter API key
   - Or set the `LAWSA_API_KEY` environment variable

### Running the IDE

#### Quick Start
```bash
node start-cursor-ide.js
```

#### Manual Start
```bash
cd electron-app
npm start
```

### Using the IDE

1. **Code Editor**: Write C code in the Monaco editor
2. **Compile**: Click "Compile" or press `Ctrl+Enter`
3. **Run**: Click "Run" to execute the compiled program
4. **AI Features**: 
   - Code completion appears automatically as you type
   - Select code and click "Refactor" for AI-assisted refactoring
   - Errors are automatically diagnosed with AI suggestions
5. **Panels**: 
   - **Console**: View program output and errors
   - **Assembly**: See generated x86-64 assembly code
   - **Diff**: View changes after refactoring

### Example Workflow

1. Open the IDE
2. Write C code in the editor
3. Press `Ctrl+Enter` to compile
4. View assembly output in the Assembly panel
5. Use AI features for code completion and refactoring
6. Save your work with `Ctrl+S`

## Example Program

```c
int main() {
    int a = 5;
    int b = 10;
    return a + b;
}
```

## Architecture

### IDE Architecture
The LAWSA Cursor IDE is built with a modular, service-oriented architecture:

- **Electron Framework**: Cross-platform desktop application
- **Monaco Editor**: Professional code editor with C syntax highlighting
- **Service Layer**: Memory, LLM, and AI completion services
- **LAWSA Compiler**: Core C compiler with x86-64 assembly output

### AI Integration
- **OpenRouter API**: Access to Qwen Coder model
- **Memory System**: Persistent storage of project context and AI interactions
- **Intelligent Completion**: Context-aware code suggestions
- **Error Diagnosis**: AI-powered error analysis and fixes

### Compiler Architecture
LAWSA is structured as a simple multi-pass compiler:
1. Lexical analysis - Tokenizes the input source
2. Parsing - Builds an Abstract Syntax Tree (AST)
3. Code generation - Produces x86-64 assembly code

The compiler outputs assembly code that can be assembled and linked using GCC.

## Limitations

As an educational compiler, LAWSA has several limitations:
- Limited standard library support
- No support for structs or unions
- Limited type checking
- No optimization passes

## Getting Started

1. Ensure GCC is installed and available in your PATH
2. Run the LAWSA-IDE or use the command-line interface
3. Write or load a C program
4. Compile and run

## License

This project is open source and available for educational purposes.

## Project Structure

### Core Compiler Files
- `tokenize.c` - Lexical analyzer (tokenizer)
- `parse.c` - Parser (AST builder)
- `codegen.c` - Code generator (assembly output)
- `type.c` - Type system
- `main.c` - Entry point

### IDE Components
- `electron-app/` - Electron application
  - `src/services/` - Service layer (Memory, LLM, AI Completion)
  - `renderer.js` - Main UI logic
  - `index.html` - Application interface
- `memory-system/` - Persistent memory implementation
- `llm-integration/` - OpenRouter and Qwen Coder integration
- `config/` - Configuration files
- `docs/` - Documentation and API reference

### Configuration
- `config/openrouter.json` - OpenRouter API configuration
- `config/memory.json` - Memory system settings
- `config/ide.json` - IDE behavior configuration

## Educational Purpose

This is intended as an educational project that demonstrates compiler principles while gradually adding real-world compiler features. It's not meant to be a production compiler but rather a learning tool to understand how compilers work. 