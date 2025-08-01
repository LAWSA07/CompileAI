/**
 * TogetherAI Integration Service for Code Refactoring
 * 
 * This service connects to TogetherAI's API for code refactoring.
 * Together AI offers free API credits (as of 2023) which can be used
 * for code refactoring.
 * 
 * Prerequisites:
 * 1. Sign up at https://www.together.ai/
 * 2. Get an API key
 */

const axios = require('axios');
const { refactorCCode: localRefactorCCode } = require('./localRefactorService');

// Together AI API endpoint for chat completions
const TOGETHER_API_ENDPOINT = 'https://api.together.xyz/v1/chat/completions';

// Together AI API key
const TOGETHER_API_KEY = 'd0f2415592eed0d9eaf2c80d99165327421c8159c62369628c06cb538cfa3e23';

// Default model to use - a model known to be available on Together.ai
const MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

/**
 * Refactor C code using Together AI
 */
async function refactorCCode(code) {
  console.log('Starting code refactoring with Together AI...');
  
  if (!code || !code.trim()) {
    throw new Error('Empty code provided');
  }
  
  // Skip API call if API key is not configured
  if (!TOGETHER_API_KEY || TOGETHER_API_KEY === 'YOUR_TOGETHER_API_KEY') {
    console.log('Together AI API key not configured, using local refactoring.');
    return await localRefactorCCode(code);
  }
  
  try {
    const refactoredCode = await callTogetherAPI(code);
    console.log('Together AI refactoring completed successfully');
    return refactoredCode;
  } catch (error) {
    console.error('Error with Together AI refactoring:', error.message);
    console.log('Falling back to local refactoring implementation...');
    
    // Fallback to local implementation if Together AI fails
    return await localRefactorCCode(code);
  }
}

/**
 * Make a request to the Together AI API
 */
async function callTogetherAPI(code) {
  try {
    console.log(`Calling Together AI API with model: ${MODEL}`);
    
    const response = await axios.post(TOGETHER_API_ENDPOINT, {
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert C programmer who specializes in refactoring code. Return ONLY the refactored code without explanations. Do not include backticks or language tags, just the clean code."
        },
        {
          role: "user",
          content: `Please refactor this C code to improve it according to best practices:
\`\`\`c
${code}
\`\`\``
        }
      ],
      max_tokens: 2000,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      // Extract the raw content
      let result = response.data.choices[0].message.content;
      
      console.log("Raw API response:", result);
      
      // More robust cleaning of code blocks and markdown
      // First try to extract code between triple backticks
      const codeBlockMatch = result.match(/```(?:c|cpp)?\s*([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        result = codeBlockMatch[1].trim();
      } else {
        // If no code blocks found, just remove any markdown-style formatting
        result = result.replace(/```c\s*/g, '').replace(/```cpp\s*/g, '').replace(/```\s*/g, '').trim();
      }
      
      // Ensure the code has basic elements of a C program if it's missing
      if (!result.includes('#include') && code.includes('#include')) {
        // If original had includes but refactored doesn't, preserve the includes
        const includeLines = code.split('\n')
          .filter(line => line.trim().startsWith('#include'))
          .join('\n');
        result = includeLines + '\n\n' + result;
      }
      
      console.log("Cleaned result:", result);
      
      return result;
    } else {
      console.error('Invalid API response structure:', JSON.stringify(response.data));
      throw new Error('Invalid response from Together API');
    }
  } catch (error) {
    console.error('Together API error:', error);
    if (error.response) {
      console.error('API response status:', error.response.status);
      console.error('API response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  refactorCCode
}; 