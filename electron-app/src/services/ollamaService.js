/**
 * Ollama Integration Service for Code Refactoring
 * 
 * This service connects to a locally running Ollama server to provide
 * code refactoring capabilities without relying on external APIs.
 * 
 * Prerequisites:
 * 1. Install Ollama from https://ollama.ai/
 * 2. Run: ollama pull codellama
 * 3. Start Ollama server
 */

const axios = require('axios');
const localRefactor = require('./localRefactorService');

// Ollama API endpoint (default port is 11434)
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
// Default model to use
const MODEL = 'codellama';

/**
 * Refactor C code using Ollama's local LLM
 */
async function refactorCCode(code) {
  console.log('Starting code refactoring with Ollama...');
  
  if (!code || !code.trim()) {
    throw new Error('Empty code provided');
  }
  
  try {
    const refactoredCode = await callOllamaAPI(code);
    console.log('Ollama refactoring completed successfully');
    return refactoredCode;
  } catch (error) {
    console.error('Error with Ollama refactoring:', error.message);
    console.log('Falling back to local refactoring implementation...');
    
    // Fallback to local implementation if Ollama fails
    return await localRefactor.refactorCCode(code);
  }
}

/**
 * Make a request to the local Ollama API
 */
async function callOllamaAPI(code) {
  try {
    console.log(`Calling Ollama API with model: ${MODEL}`);
    
    const prompt = `
You are an expert C programmer. Please refactor the following C code to improve it.
Make it more readable, better structured, and follow best C practices.
Return ONLY the refactored code without explanations or markdown.

Here's the code to refactor:

\`\`\`c
${code}
\`\`\`
`;

    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.95
      }
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data && response.data.response) {
      // Extract just the code part, removing any explanations
      let result = response.data.response;
      
      // Clean up code blocks and markdown
      result = result.replace(/```c\n/g, '').replace(/```/g, '').trim();
      
      return result;
    } else {
      throw new Error('Invalid response from Ollama API');
    }
  } catch (error) {
    console.error('Ollama API error:', error.message);
    throw error;
  }
}

module.exports = {
  refactorCCode
}; 