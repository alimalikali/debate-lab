import axios from 'axios';
import { AIProvider, AIMessage, AIProviderConfig, AIResponse, StreamingCallback } from '../types';

export class GoogleProvider implements AIProvider {
  name = 'google';
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  private formatMessages(messages: AIMessage[]) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const contents = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    return {
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
      contents,
    };
  }

  async generateResponse(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse> {
    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }

    const startTime = Date.now();
    const { systemInstruction, contents } = this.formatMessages(messages);

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
        {
          systemInstruction,
          contents,
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens ?? 1024,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokensUsed =
        (response.data.usageMetadata?.promptTokenCount || 0) +
        (response.data.usageMetadata?.candidatesTokenCount || 0);

      return {
        content,
        tokensUsed,
        responseTimeMs: Date.now() - startTime,
        model: config.model,
        provider: this.name,
      };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid Google API key');
      }
      if (error.response?.status === 404) {
        throw new Error(`Model "${config.model}" not found. Try gemini-2.0-flash, gemini-1.5-flash, or gemini-1.5-pro`);
      }
      throw new Error(`Google AI error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: StreamingCallback
  ): Promise<void> {
    if (!config.apiKey) {
      callbacks.onError(new Error('Google API key is required'));
      return;
    }

    const startTime = Date.now();
    let fullContent = '';
    const { systemInstruction, contents } = this.formatMessages(messages);

    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`,
        {
          systemInstruction,
          contents,
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens ?? 1024,
          },
        },
        {
          headers: {
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
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                callbacks.onToken(text);
                fullContent += text;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      response.data.on('end', () => {
        callbacks.onComplete({
          content: fullContent,
          tokensUsed: 0,
          responseTimeMs: Date.now() - startTime,
          model: config.model,
          provider: this.name,
        });
      });

      response.data.on('error', callbacks.onError);
    } catch (error: any) {
      if (error.response?.status === 404) {
        callbacks.onError(new Error(`Model "${config.model}" not found. Try gemini-2.0-flash, gemini-1.5-flash, or gemini-1.5-pro`));
      } else {
        callbacks.onError(new Error(`Google AI error: ${error.response?.data?.error?.message || error.message}`));
      }
    }
  }

  async listModels(config?: Partial<AIProviderConfig>): Promise<string[]> {
    // If we have an API key, fetch actual available models
    if (config?.apiKey) {
      try {
        const response = await axios.get(`${this.baseUrl}/models?key=${config.apiKey}`, {
          timeout: 10000,
        });

        // Filter for generative models that support generateContent
        const models = response.data.models
          ?.filter((m: any) =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            m.name?.includes('gemini')
          )
          .map((m: any) => m.name.replace('models/', ''))
          .slice(0, 10) || [];

        if (models.length > 0) {
          return models;
        }
      } catch (error) {
        // Fall through to defaults
      }
    }

    // Return default models (most commonly available)
    return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  }

  async testConnection(config?: Partial<AIProviderConfig>): Promise<boolean> {
    if (!config?.apiKey) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/models?key=${config.apiKey}`, {
        timeout: 10000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
