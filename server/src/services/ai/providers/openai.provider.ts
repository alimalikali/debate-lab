import { getErrorMessage, getHttpStatus } from '../../../utils/errors';
import axios from 'axios';
import { AIProvider, AIMessage, AIProviderConfig, AIResponse, StreamingCallback } from '../types';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private defaultBaseUrl = 'https://api.openai.com/v1';

  async generateResponse(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const startTime = Date.now();
    const baseUrl = config.baseUrl || this.defaultBaseUrl;

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
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
    } catch (error: unknown) {
      if (getHttpStatus(error) === 401) {
        throw new Error('Invalid OpenAI API key');
      }
      throw new Error(`OpenAI error: ${getErrorMessage(error)}`);
    }
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!config.apiKey) {
      callbacks.onError(new Error('OpenAI API key is required'));
      return;
    }

    const startTime = Date.now();
    const baseUrl = config.baseUrl || this.defaultBaseUrl;
    let fullContent = '';

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
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
                tokensUsed: 0, // Streaming doesn't provide token count
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
              // Ignore JSON parse errors
            }
          }
        }
      });

      response.data.on('error', callbacks.onError);
    } catch (error: unknown) {
      callbacks.onError(new Error(`OpenAI error: ${getErrorMessage(error)}`));
    }
  }

  async listModels(config?: Partial<AIProviderConfig>): Promise<string[]> {
    if (!config?.apiKey) {
      return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
    }

    try {
      const baseUrl = config.baseUrl || this.defaultBaseUrl;
      const response = await axios.get(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        timeout: 10000,
      });

      return response.data.data
        .filter((m: { id: string }) => m.id.includes('gpt'))
        .map((m: { id: string }) => m.id)
        .sort();
    } catch {
      return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'];
    }
  }

  async testConnection(config?: Partial<AIProviderConfig>): Promise<boolean> {
    if (!config?.apiKey) {
      return false;
    }

    try {
      const baseUrl = config.baseUrl || this.defaultBaseUrl;
      await axios.get(`${baseUrl}/models`, {
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
