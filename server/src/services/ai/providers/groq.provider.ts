import axios from 'axios';
import { AIProvider, AIMessage, AIProviderConfig, AIResponse, StreamingCallback } from '../types';

export class GroqProvider implements AIProvider {
  name = 'groq';
  private baseUrl = 'https://api.groq.com/openai/v1';

  async generateResponse(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error('Groq API key is required');
    }

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: config.model,
          messages: messages,
          max_tokens: config.maxTokens ?? 1024,
          temperature: config.temperature ?? 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      return {
        content: response.data.choices[0].message.content || '',
        tokensUsed: response.data.usage?.total_tokens || 0,
        responseTimeMs: Date.now() - startTime,
        model: config.model,
        provider: this.name,
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Groq API key');
      }
      throw new Error(`Groq error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!config.apiKey) {
      callbacks.onError(new Error('Groq API key is required'));
      return;
    }

    const startTime = Date.now();
    let fullContent = '';

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: config.model,
          messages: messages,
          max_tokens: config.maxTokens ?? 1024,
          temperature: config.temperature ?? 0.7,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 60000,
        }
      );

      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              callbacks.onComplete({
                content: fullContent,
                tokensUsed: 0,
                responseTimeMs: Date.now() - startTime,
                model: config.model,
                provider: this.name,
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                callbacks.onToken(content);
                fullContent += content;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      response.data.on('error', callbacks.onError);
    } catch (error: any) {
      callbacks.onError(new Error(`Groq error: ${error.message}`));
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'llama2-70b-4096',
      'mixtral-8x7b-32768',
      'gemma-7b-it',
      'llama3-8b-8192',
      'llama3-70b-8192',
    ];
  }

  async testConnection(config?: Partial<AIProviderConfig>): Promise<boolean> {
    if (!config?.apiKey) {
      return false;
    }

    try {
      await axios.get(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
