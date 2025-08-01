/**
 * OpenRouter API Client for LAWSA Cursor IDE
 * 
 * This module provides integration with OpenRouter API to access
 * the Qwen Coder model for AI-powered development assistance.
 */

const axios = require('axios');

class OpenRouterClient {
    constructor(apiKey, baseURL = 'https://openrouter.ai/api/v1') {
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://lawsa-cursor-ide.com',
                'X-Title': 'LAWSA Cursor IDE'
            },
            timeout: 30000
        });
    }

    async makeRequest(endpoint, data) {
        try {
            const response = await this.client.post(endpoint, data);
            return response.data;
        } catch (error) {
            console.error('OpenRouter API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getModels() {
        try {
            const response = await this.client.get('/models');
            return response.data;
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }

    async generateCompletion(model, messages, options = {}) {
        const {
            maxTokens = 2048,
            temperature = 0.7,
            topP = 1,
            frequencyPenalty = 0,
            presencePenalty = 0,
            stop = null
        } = options;

        const data = {
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty
        };

        if (stop) {
            data.stop = Array.isArray(stop) ? stop : [stop];
        }

        return await this.makeRequest('/chat/completions', data);
    }

    async generateStreamingCompletion(model, messages, options = {}) {
        const {
            maxTokens = 2048,
            temperature = 0.7,
            topP = 1,
            frequencyPenalty = 0,
            presencePenalty = 0,
            stop = null
        } = options;

        const data = {
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            stream: true
        };

        if (stop) {
            data.stop = Array.isArray(stop) ? stop : [stop];
        }

        try {
            const response = await this.client.post('/chat/completions', data, {
                responseType: 'stream'
            });

            return response.data;
        } catch (error) {
            console.error('Streaming completion error:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const models = await this.getModels();
            return {
                success: true,
                models: models.data?.length || 0,
                message: 'Connection successful'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Connection failed'
            };
        }
    }

    async getUsage() {
        try {
            const response = await this.client.get('/auth/key');
            return response.data;
        } catch (error) {
            console.error('Error fetching usage:', error);
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            baseURL: this.baseURL,
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey ? this.apiKey.length : 0
        };
    }
}

module.exports = OpenRouterClient; 