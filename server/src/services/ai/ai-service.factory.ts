import { AIProvider } from './types';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { GroqProvider } from './providers/groq.provider';

class AIServiceFactory {
  private providers: Map<string, AIProvider> = new Map();

  getProvider(name: string): AIProvider {
    if (!this.providers.has(name)) {
      switch (name) {
        case 'ollama':
          this.providers.set(name, new OllamaProvider());
          break;
        case 'openai':
        case 'openai_compatible':
          this.providers.set(name, new OpenAIProvider());
          break;
        case 'anthropic':
          this.providers.set(name, new AnthropicProvider());
          break;
        case 'google':
          this.providers.set(name, new GoogleProvider());
          break;
        case 'groq':
          this.providers.set(name, new GroqProvider());
          break;
        default:
          throw new Error(`Unknown AI provider: ${name}`);
      }
    }
    return this.providers.get(name)!;
  }

  listProviders(): { name: string; requiresApiKey: boolean; description: string }[] {
    return [
      {
        name: 'ollama',
        requiresApiKey: false,
        description: 'Local AI using Ollama (free)',
      },
      {
        name: 'openai',
        requiresApiKey: true,
        description: 'OpenAI GPT models (GPT-3.5, GPT-4)',
      },
      {
        name: 'anthropic',
        requiresApiKey: true,
        description: 'Anthropic Claude models',
      },
      {
        name: 'google',
        requiresApiKey: true,
        description: 'Google Gemini models',
      },
      {
        name: 'groq',
        requiresApiKey: true,
        description: 'Groq fast inference (Llama, Mixtral)',
      },
      {
        name: 'openai_compatible',
        requiresApiKey: true,
        description: 'Any OpenAI-compatible API',
      },
    ];
  }

  async getProviderStatus(name: string, apiKey?: string, baseUrl?: string) {
    try {
      const provider = this.getProvider(name);
      const connected = await provider.testConnection({ apiKey, baseUrl });
      const models = connected ? await provider.listModels({ apiKey, baseUrl }) : [];

      return {
        name,
        connected,
        models,
      };
    } catch (error) {
      return {
        name,
        connected: false,
        models: [],
      };
    }
  }
}

export const aiServiceFactory = new AIServiceFactory();
