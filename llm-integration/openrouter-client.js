/**
 * OpenRouter API Client for LAWSA Cursor IDE
 * 
 * This module provides integration with OpenRouter API to access
 * the Qwen Coder model for AI-powered development assistance.
 */

const axios = require('axios');

class OpenRouterClient {
  constructor(apiKey) {
    this.apiKey = apiKey || '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';
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.defaultModel = 'qwen/qwen2.5-coder-7b-instruct';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lawsa-cursor-ide.com',
        'X-Title': 'LAWSA Cursor IDE'
      },
      timeout: 60000 // 60 seconds
    });
    
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = 100; // Minimum delay between requests (ms)
  }

  /**
   * Make a request to OpenRouter API with rate limiting
   */
  async makeRequest(endpoint, data) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await this.delay(this.rateLimitDelay - timeSinceLastRequest);
    }
    
    try {
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      const response = await this.client.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get available models
   */
  async getModels() {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion
   */
  async generateCompletion(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.1,
      maxTokens = 4096,
      stream = false,
      systemPrompt = null
    } = options;

    // Prepare messages
    let preparedMessages = messages;
    if (systemPrompt) {
      preparedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    }

    const requestData = {
      model: model,
      messages: preparedMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream
    };

    const endpoint = stream ? '/chat/completions/stream' : '/chat/completions';
    
    return await this.makeRequest(endpoint, requestData);
  }

  /**
   * Generate streaming completion
   */
  async *generateStreamingCompletion(messages, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.1,
      maxTokens = 4096,
      systemPrompt = null
    } = options;

    // Prepare messages
    let preparedMessages = messages;
    if (systemPrompt) {
      preparedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    }

    const requestData = {
      model: model,
      messages: preparedMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true
    };

    try {
      const response = await this.client.post('/chat/completions', requestData, {
        responseType: 'stream'
      });

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                yield parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming completion error:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const models = await this.getModels();
      return {
        success: true,
        models: models.data?.length || 0,
        message: 'OpenRouter API connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'OpenRouter API connection failed'
      };
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage() {
    try {
      const response = await this.client.get('/auth/key');
      return response.data;
    } catch (error) {
      console.error('Error fetching usage:', error);
      throw error;
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      rateLimitDelay: this.rateLimitDelay
    };
  }
}

module.exports = OpenRouterClient; 