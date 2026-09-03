import { getErrorMessage, getHttpStatus } from '../../../utils/errors';
import axios from 'axios';
import { AIProvider, AIMessage, AIProviderConfig, AIResponse, StreamingCallback } from '../types';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private baseUrl = 'https://api.anthropic.com/v1';

  async generateResponse(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const startTime = Date.now();

    // Separate system message from conversation messages
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: config.model,
          max_tokens: config.maxTokens ?? 1024,
          system: systemMessage?.content,
          messages: conversationMessages,
        },
        {
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000,
        }
      );

      const content = response.data.content
        .filter((c: { type: string; text?: string }) => c.type === 'text')
        .map((c: { type: string; text?: string }) => c.text ?? "")
        .join('');

      return {
        content,
        tokensUsed: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
        responseTimeMs: Date.now() - startTime,
        model: config.model,
        provider: this.name,
      };
    } catch (error: unknown) {
      if (getHttpStatus(error) === 401) {
        throw new Error('Invalid Anthropic API key');
      }
      throw new Error(`Anthropic error: ${getErrorMessage(error)}`);
    }
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!config.apiKey) {
      callbacks.onError(new Error('Anthropic API key is required'));
      return;
    }

    const startTime = Date.now();
    let fullContent = '';

    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: config.model,
          max_tokens: config.maxTokens ?? 1024,
          system: systemMessage?.content,
          messages: conversationMessages,
          stream: true,
        },
        {
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
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
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                callbacks.onToken(parsed.delta.text);
                fullContent += parsed.delta.text;
              }

              if (parsed.type === 'message_stop') {
                callbacks.onComplete({
                  content: fullContent,
                  tokensUsed: 0,
                  responseTimeMs: Date.now() - startTime,
                  model: config.model,
                  provider: this.name,
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      response.data.on('error', callbacks.onError);
    } catch (error: unknown) {
      callbacks.onError(new Error(`Anthropic error: ${getErrorMessage(error)}`));
    }
  }

  async listModels(): Promise<string[]> {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
    ];
  }

  async testConnection(config?: Partial<AIProviderConfig>): Promise<boolean> {
    if (!config?.apiKey) {
      return false;
    }

    try {
      // Anthropic doesn't have a simple endpoint to test, so we make a minimal request
      await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        },
        {
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          timeout: 10000,
        }
      );
      return true;
    } catch (error: unknown) {
      return getHttpStatus(error) !== 401;
    }
  }
}
