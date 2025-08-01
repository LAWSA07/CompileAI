# LAWSA Cursor IDE

A Cursor-like IDE with AI-powered development assistance, built on top of the LAWSA educational C compiler.

## 🚀 Features

### Core IDE Features
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Real-time Compilation**: Instant C code compilation with LAWSA compiler
- **Assembly Output**: View generated x86-64 assembly code
- **File Management**: Open, save, and manage C source files
- **Multi-panel Interface**: Console, Assembly, and Diff panels

### AI-Powered Features
- **Intelligent Code Completion**: Context-aware suggestions using Qwen Coder model
- **AI Code Refactoring**: Smart code improvements and restructuring
- **Error Diagnosis**: AI-powered error analysis and fix suggestions
- **Memory System**: Persistent context tracking across sessions
- **Project Context Awareness**: AI understands your project structure and history

### Memory System
- **Persistent Memory**: Stores project context, file history, and AI interactions
- **Context Indexing**: Fast search across functions, variables, and files
- **History Tracking**: Complete development history with timestamps
- **AI Interaction Log**: Records all AI suggestions and their effectiveness

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- LAWSA compiler (included)

### Setup
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd lawsa-cursor-ide
   ```

2. **Install dependencies**:
   ```bash
   cd electron-app
   npm install
   ```

3. **Configure API Key**:
   - Open `electron-app/renderer.js`
   - Replace the API key with your OpenRouter API key:
   ```javascript
   const apiKey = 'your-openrouter-api-key-here';
   ```

4. **Start the IDE**:
   ```bash
   npm start
   ```

## 🔧 Configuration

### OpenRouter API Setup
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Update the API key in `electron-app/renderer.js`

### Memory System Configuration
The memory system stores data in `.lawsa-memory/` directory:
- `memory.json`: Project context and file data
- `index.json`: Searchable index of functions and variables
- `history.json`: Development history

## 📖 Usage

### Basic Development Workflow
1. **Open the IDE**: Launch the application
2. **Write C Code**: Use the Monaco editor with AI assistance
3. **Compile**: Click "Compile" to generate assembly
4. **Run**: Execute the compiled program
5. **Refactor**: Use AI to improve your code

### AI Features

#### Code Completion
- Type in the editor to trigger AI suggestions
- Suggestions are based on project context and current file
- Press `Ctrl+Space` to manually trigger completions

#### Code Refactoring
1. Select code to refactor (or leave empty for entire file)
2. Click "Refactor Code" button
3. Review the AI suggestions in the diff panel
4. Apply the changes

#### Error Diagnosis
- When compilation fails, AI automatically analyzes errors
- View AI diagnosis in the console panel
- Apply suggested fixes directly

### Keyboard Shortcuts
- `Ctrl+S`: Save file
- `Ctrl+O`: Open file
- `Ctrl+Enter`: Compile code
- `Ctrl+Space`: Trigger AI completion

## 🏗️ Architecture

### Core Components

#### Memory System (`memory-system/`)
- **MemoryStore**: Persistent storage for project context
- **Context Management**: Real-time context tracking
- **Indexing**: Fast search across project files

#### LLM Integration (`llm-integration/`)
- **OpenRouterClient**: API client for OpenRouter
- **QwenCoderService**: Specialized service for Qwen Coder model
- **Prompt Engineering**: Compiler-aware prompt generation

#### IDE Services (`electron-app/src/services/`)
- **MemoryService**: Memory system integration
- **LLMService**: LLM integration wrapper
- **AICompletionService**: Monaco Editor integration

### Data Flow
```
Editor → Memory Service → LLM Service → OpenRouter API
   ↓           ↓              ↓              ↓
Monaco → Context Update → AI Processing → Qwen Coder
   ↓           ↓              ↓              ↓
Display ← Memory Update ← Response Parse ← AI Response
```

## 🔍 AI Capabilities

### Code Completion
- **Context-Aware**: Understands current file and project structure
- **Function Signatures**: Suggests function parameters and return types
- **Variable Suggestions**: Recommends variables based on scope
- **Import Suggestions**: Suggests relevant header files

### Code Refactoring
- **Style Improvements**: Consistent formatting and naming
- **Performance Optimization**: Efficient code patterns
- **Best Practices**: C language conventions
- **Compiler Compatibility**: LAWSA compiler-specific optimizations

### Error Diagnosis
- **Syntax Errors**: Detailed explanations and fixes
- **Semantic Errors**: Type checking and logic issues
- **Compiler Errors**: LAWSA-specific error analysis
- **Runtime Errors**: Program execution issues

## 🧪 Testing

### Service Tests
```bash
# Test memory system
node -e "const MemoryStore = require('./memory-system/memory-store'); const store = new MemoryStore('.'); console.log('Memory system test:', store.isReady());"

# Test LLM integration
node -e "const QwenCoderService = require('./llm-integration/qwen-coder-service'); const service = new QwenCoderService('your-api-key'); service.testService().then(console.log);"
```

### IDE Tests
1. **Memory System**: Check `.lawsa-memory/` directory creation
2. **LLM Integration**: Verify API key and connection
3. **Code Completion**: Test AI suggestions in editor
4. **Refactoring**: Test AI code improvements

## 🚀 Development

### Project Structure
```
lawsa-cursor-ide/
├── memory-system/           # Memory management
│   ├── memory-store.js
│   └── ...
├── llm-integration/         # LLM services
│   ├── openrouter-client.js
│   ├── qwen-coder-service.js
│   └── ...
├── electron-app/            # IDE application
│   ├── src/services/        # IDE services
│   ├── renderer.js          # Main renderer
│   └── ...
├── lawsa/                   # Original compiler
│   ├── main.c
│   ├── parse.c
│   └── ...
└── docs/                    # Documentation
```

### Adding New Features

#### Custom AI Prompts
1. Add new prompt in `qwen-coder-service.js`
2. Create corresponding method in `llm-service.js`
3. Integrate with IDE in `renderer.js`

#### Memory Extensions
1. Extend `MemoryStore` class
2. Add new data structures
3. Update indexing system

#### IDE Enhancements
1. Add new Monaco Editor features
2. Create new panels or services
3. Integrate with existing memory system

## 🔧 Troubleshooting

### Common Issues

#### API Connection Errors
- Verify OpenRouter API key is correct
- Check internet connection
- Ensure API key has sufficient credits

#### Memory System Issues
- Check file permissions in project directory
- Verify `.lawsa-memory/` directory exists
- Clear memory cache if needed

#### Compilation Errors
- Ensure LAWSA compiler is properly built
- Check C code syntax
- Verify file paths and permissions

### Debug Mode
Start the IDE in debug mode:
```bash
npm run dev
```

This enables additional logging and error reporting.

## 📈 Performance

### Optimization Tips
- **Memory Cleanup**: Regularly clear old history entries
- **Cache Management**: Monitor completion cache size
- **API Usage**: Track OpenRouter API usage and costs
- **File Indexing**: Optimize for large projects

### Monitoring
- Check memory usage in `.lawsa-memory/` directory
- Monitor API request counts in service logs
- Track completion cache hit rates

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Follow existing code patterns
- Add comprehensive comments
- Include error handling
- Write tests for new features

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **LAWSA Compiler**: Educational C compiler foundation
- **OpenRouter**: AI model access and API
- **Qwen Coder**: AI model for code assistance
- **Monaco Editor**: Code editing capabilities
- **Electron**: Cross-platform desktop framework

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the documentation
- Test with the provided examples

---

**LAWSA Cursor IDE** - Bringing AI-powered development to educational compiler projects. 