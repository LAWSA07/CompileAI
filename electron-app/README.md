# LAWSA C Compiler GUI

A graphical interface for the LAWSA C compiler with code refactoring capabilities.

## Features

- Edit C code with syntax highlighting
- Compile and run C programs
- Refactor code using an AI model or local rules
- Open and save files

## LLM Code Refactoring Options

The app includes multiple options for code refactoring:

### Option 1: Ollama (Recommended)

Run powerful open-source LLMs directly on your machine.

**Setup:**

1. Download and install Ollama from [ollama.ai](https://ollama.ai/)
2. Pull a code-specialized model:
   ```
   ollama pull codellama
   ```
3. Start the Ollama service
4. The app will automatically connect to the local Ollama server

**Benefits:**
- Free and unlimited usage
- No internet connection needed after model download
- Fully private (no data sent to external services)
- High quality refactoring with code-specialized models

### Option 2: Together AI

Use cloud-based AI models with free API credits.

**Setup:**

1. Sign up at [together.ai](https://www.together.ai/) to get an API key
2. Edit `src/services/togetherAIService.js` to add your API key
3. Update `index.js` to use TogetherAI:
   ```javascript
   const llmService = require('./src/services/togetherAIService');
   ```

**Benefits:**
- Access to state-of-the-art models
- Free API credits available
- No local hardware requirements

### Option 3: Local Rules (Fallback)

The app includes a fallback mode that uses JavaScript regex patterns to apply common C code formatting rules.

**Benefits:**
- Works offline
- No setup required
- Minimal resource usage

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the app:
   ```
   npm start
   ```

## Configuration

See the options above for configuring different LLM services.

## Contributing

Contributions welcome! Please feel free to submit a Pull Request. 