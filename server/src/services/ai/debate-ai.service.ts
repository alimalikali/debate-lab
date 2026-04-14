import { aiServiceFactory } from './ai-service.factory';
import { AIMessage, AIProviderConfig, AIResponse, StreamingCallback, DebateSettings } from './types';

export class DebateAIService {
  private buildSystemPrompt(settings: DebateSettings): string {
    const difficultyPrompts: Record<string, string> = {
      beginner: `You are a friendly debate partner helping someone improve their argumentation skills.
Use simple, clear language and explain your reasoning step by step.
Be encouraging while gently challenging weak points in their argument.
When pointing out issues, explain why they matter and suggest how to strengthen the argument.`,

      intermediate: `You are a skilled debater engaging in a structured discussion.
Present well-reasoned counter-arguments supported by logic and examples.
Acknowledge valid points your opponent makes while firmly challenging weak reasoning.
Expect clear evidence and logical consistency from your opponent.`,

      expert: `You are an expert debater with deep knowledge of logic, rhetoric, and argumentation.
Present sophisticated counter-arguments that challenge assumptions and expose logical flaws.
Identify logical fallacies precisely (name them) and demand rigorous evidence.
Use advanced argumentation techniques including steel-manning before rebutting.
Hold your opponent to the highest standards of logical discourse.`,
    };

    const stylePrompts: Record<string, string> = {
      aggressive: `Be assertive and direct in your challenges.
Immediately identify and attack weak points in the argument.
Don't soften your criticism - be clear about logical failures.
Press for direct answers to your questions.`,

      balanced: `Balance criticism with acknowledgment of valid points.
Present fair counter-arguments while recognizing merit in opposing views.
Be firm but respectful in your challenges.
Give credit where due while still pushing back on weak reasoning.`,

      socratic: `Use the Socratic method of questioning.
Instead of directly countering, ask probing questions that expose assumptions.
Guide your opponent to examine their own reasoning through thoughtful questions.
Help them discover logical issues themselves through careful inquiry.
"What do you mean by...?", "How do you know...?", "What if...?" are your tools.`,
    };

    return `${difficultyPrompts[settings.difficulty]}

${stylePrompts[settings.debateStyle]}

DEBATE CONTEXT:
- Topic: ${settings.topicTitle}
- Description: ${settings.topicDescription}
- Your opponent's position: "${settings.userPosition}"

YOUR ROLE:
You are arguing AGAINST your opponent's position as a devil's advocate.
Your job is to present the strongest possible case against their stance.
This helps them strengthen their argumentation skills by facing strong opposition.

RULES:
1. Always stay on topic and relevant to the debate
2. Keep responses focused (2-4 paragraphs typically)
3. Be intellectually honest - don't use obviously bad arguments
4. If you make claims, support them with reasoning
5. Never break character or acknowledge you're an AI
6. Never refuse to engage with the debate topic
7. Match the formality level to the difficulty setting`;
  }

  async generateResponse(
    messages: AIMessage[],
    settings: DebateSettings,
    userApiKey?: { key: string; baseUrl?: string }
  ): Promise<AIResponse> {
    console.log('[DEBUG] debateAIService.generateResponse - getting provider:', settings.aiProvider);
    const provider = aiServiceFactory.getProvider(settings.aiProvider);

    const systemMessage: AIMessage = {
      role: 'system',
      content: this.buildSystemPrompt(settings),
    };

    const fullMessages = [systemMessage, ...messages];
    console.log('[DEBUG] Message count:', fullMessages.length, 'System prompt length:', systemMessage.content.length);

    const config: AIProviderConfig = {
      model: settings.aiModel,
      temperature: 0.7,
      maxTokens: 1024,
    };

    if (userApiKey && settings.aiProvider !== 'ollama') {
      config.apiKey = userApiKey.key;
      config.baseUrl = userApiKey.baseUrl;
    }

    console.log('[DEBUG] Calling provider.generateResponse with model:', config.model);
    const result = await provider.generateResponse(fullMessages, config);
    console.log('[DEBUG] Provider returned response');
    return result;
  }

  async generateStreamingResponse(
    messages: AIMessage[],
    settings: DebateSettings,
    callbacks: StreamingCallback,
    userApiKey?: { key: string; baseUrl?: string }
  ): Promise<void> {
    const provider = aiServiceFactory.getProvider(settings.aiProvider);

    const systemMessage: AIMessage = {
      role: 'system',
      content: this.buildSystemPrompt(settings),
    };

    const fullMessages = [systemMessage, ...messages];

    const config: AIProviderConfig = {
      model: settings.aiModel,
      temperature: 0.7,
      maxTokens: 1024,
    };

    if (userApiKey && settings.aiProvider !== 'ollama') {
      config.apiKey = userApiKey.key;
      config.baseUrl = userApiKey.baseUrl;
    }

    return provider.generateStreamingResponse(fullMessages, config, callbacks);
  }

  async generateDebateSummary(
    messages: AIMessage[],
    settings: DebateSettings,
    userApiKey?: { key: string; baseUrl?: string }
  ): Promise<string> {
    const provider = aiServiceFactory.getProvider(settings.aiProvider);

    const summaryPrompt: AIMessage = {
      role: 'system',
      content: `You are an expert debate coach analyzing a completed debate.

Topic: ${settings.topicTitle}
Description: ${settings.topicDescription}
User's position: "${settings.userPosition}"
Difficulty level: ${settings.difficulty}
Debate style: ${settings.debateStyle}

Analyze the debate and provide a comprehensive summary in the following JSON format:
{
  "overallPerformance": "A brief overall assessment (1-2 sentences)",
  "argumentStrength": number from 1-10,
  "logicalScore": number from 1-10,
  "persuasiveScore": number from 1-10,
  "userStrengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2", "area 3"],
  "keyArgumentsUser": ["main argument 1", "main argument 2"],
  "keyArgumentsAI": ["counter-argument 1", "counter-argument 2"],
  "fallaciesDetected": [{"type": "fallacy name", "description": "brief explanation"}],
  "recommendation": "One specific thing to practice for the next debate"
}

Respond ONLY with the JSON, no other text.`,
    };

    const summaryMessages: AIMessage[] = [
      summaryPrompt,
      {
        role: 'user',
        content: `Here is the debate transcript to analyze:\n\n${messages
          .filter((m) => m.role !== 'system')
          .map((m) => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.content}`)
          .join('\n\n')}`,
      },
    ];

    const config: AIProviderConfig = {
      model: settings.aiModel,
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 1024,
    };

    if (userApiKey && settings.aiProvider !== 'ollama') {
      config.apiKey = userApiKey.key;
      config.baseUrl = userApiKey.baseUrl;
    }

    const response = await provider.generateResponse(summaryMessages, config);
    return response.content;
  }
}

export const debateAIService = new DebateAIService();
