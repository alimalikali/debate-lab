import axios from 'axios';
import { AIProvider, AIMessage, AIProviderConfig, AIResponse, StreamingCallback } from '../types';
import { env } from '../../../config/env';

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.ollama.baseUrl;
  }

  async generateResponse(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    const startTime = Date.now();
    console.log('[DEBUG] OllamaProvider.generateResponse - model:', config.model, 'baseUrl:', this.baseUrl);

    try {
      console.log('[DEBUG] Sending request to Ollama...');
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: config.model || env.ollama.defaultModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: config.temperature ?? 0.7,
            num_predict: config.maxTokens ?? 1024,
          },
        },
        {
          timeout: 90000, // 90 second timeout (CPU-only mode is slower)
        }
      );
      console.log('[DEBUG] Ollama response received, duration:', Date.now() - startTime, 'ms');

      return {
        content: response.data.message.content,
        tokensUsed: response.data.eval_count || 0,
        responseTimeMs: Date.now() - startTime,
        model: config.model || env.ollama.defaultModel,
        provider: this.name,
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama server is not running. Please start Ollama first.');
      }
      throw new Error(`Ollama error: ${error.message}`);
    }
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: StreamingCallback
  ): Promise<void> {
    const startTime = Date.now();
    let totalTokens = 0;
    let fullContent = '';

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: config.model || env.ollama.defaultModel,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          options: {
            temperature: config.temperature ?? 0.7,
            num_predict: config.maxTokens ?? 1024,
          },
        },
        {
          responseType: 'stream',
          timeout: 90000, // 90 second timeout (CPU-only mode is slower)
        }
      );

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.message?.content) {
              callbacks.onToken(data.message.content);
              fullContent += data.message.content;
            }

            if (data.eval_count) {
              totalTokens = data.eval_count;
            }

            if (data.done) {
              callbacks.onComplete({
                content: fullContent,
                tokensUsed: totalTokens,
                responseTimeMs: Date.now() - startTime,
                model: config.model || env.ollama.defaultModel,
                provider: this.name,
              });
            }
          } catch (e) {
            // Ignore JSON parse errors for incomplete chunks
          }
        }
      });

      response.data.on('error', (error: Error) => {
        callbacks.onError(error);
      });

      response.data.on('end', () => {
        if (!fullContent) {
          callbacks.onError(new Error('No response received from Ollama'));
        }
      });
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        callbacks.onError(new Error('Ollama server is not running. Please start Ollama first.'));
      } else {
        callbacks.onError(new Error(`Ollama error: ${error.message}`));
      }
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 10000,
      });

      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return [];
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
