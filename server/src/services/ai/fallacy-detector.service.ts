import { aiServiceFactory } from './ai-service.factory';
import {
  AIMessage,
  AIProviderConfig,
  DebateSettings,
  FallacyAnalysisResult,
  DetectedFallacy,
  FallacyType,
} from './types';

// Fallacy descriptions for educational purposes
const FALLACY_INFO: Record<FallacyType, { name: string; description: string }> = {
  ad_hominem: {
    name: 'Ad Hominem',
    description: 'Attacking the person making the argument rather than the argument itself.',
  },
  straw_man: {
    name: 'Straw Man',
    description: 'Misrepresenting or oversimplifying an opponent\'s argument to make it easier to attack.',
  },
  false_dilemma: {
    name: 'False Dilemma',
    description: 'Presenting only two options when more exist, forcing a false choice.',
  },
  appeal_to_authority: {
    name: 'Appeal to Authority',
    description: 'Using an authority figure\'s opinion as evidence without proper justification.',
  },
  appeal_to_emotion: {
    name: 'Appeal to Emotion',
    description: 'Using emotional manipulation instead of logical reasoning.',
  },
  appeal_to_popularity: {
    name: 'Appeal to Popularity',
    description: 'Arguing something is true because many people believe it.',
  },
  hasty_generalization: {
    name: 'Hasty Generalization',
    description: 'Drawing broad conclusions from limited examples or evidence.',
  },
  slippery_slope: {
    name: 'Slippery Slope',
    description: 'Claiming one event will lead to extreme consequences without justification.',
  },
  red_herring: {
    name: 'Red Herring',
    description: 'Introducing an irrelevant topic to divert attention from the original issue.',
  },
  circular_reasoning: {
    name: 'Circular Reasoning',
    description: 'Using the conclusion as a premise; the argument assumes what it\'s trying to prove.',
  },
  false_cause: {
    name: 'False Cause',
    description: 'Assuming that because one event followed another, it was caused by it.',
  },
  equivocation: {
    name: 'Equivocation',
    description: 'Using the same word with different meanings in an argument.',
  },
  tu_quoque: {
    name: 'Tu Quoque (You Too)',
    description: 'Deflecting criticism by pointing out the accuser\'s similar behavior.',
  },
  loaded_language: {
    name: 'Loaded Language',
    description: 'Using emotionally charged words to influence rather than inform.',
  },
  moving_goalposts: {
    name: 'Moving the Goalposts',
    description: 'Changing the criteria for proof after evidence has been provided.',
  },
  begging_the_question: {
    name: 'Begging the Question',
    description: 'Assuming the truth of the conclusion in the premise.',
  },
  false_equivalence: {
    name: 'False Equivalence',
    description: 'Treating two things as equal when they differ significantly.',
  },
  anecdotal: {
    name: 'Anecdotal Evidence',
    description: 'Using personal experience as proof instead of proper evidence.',
  },
  burden_of_proof: {
    name: 'Burden of Proof',
    description: 'Claiming something is true because it hasn\'t been proven false.',
  },
  no_true_scotsman: {
    name: 'No True Scotsman',
    description: 'Dismissing counterexamples by changing the definition.',
  },
};

export class FallacyDetectorService {
  private buildAnalysisPrompt(
    userMessage: string,
    conversationHistory: AIMessage[],
    settings: DebateSettings
  ): string {
    return `You are an expert in logical reasoning and argumentation analysis. Analyze the following argument for logical fallacies.

DEBATE CONTEXT:
- Topic: ${settings.topicTitle}
- Description: ${settings.topicDescription}
- User's stated position: "${settings.userPosition}"
- Difficulty level: ${settings.difficulty}

RECENT CONVERSATION CONTEXT:
${conversationHistory.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

USER'S ARGUMENT TO ANALYZE:
"${userMessage}"

Analyze this argument for logical fallacies. Be constructive and educational - the goal is to help improve argumentation skills.

For ${settings.difficulty} level:
${settings.difficulty === 'beginner' ? '- Be encouraging and focus on major issues only\n- Explain fallacies in simple terms' : ''}
${settings.difficulty === 'intermediate' ? '- Point out moderate and major fallacies\n- Provide clear explanations' : ''}
${settings.difficulty === 'expert' ? '- Identify all fallacies including subtle ones\n- Be rigorous in your analysis' : ''}

Respond ONLY with valid JSON in this exact format:
{
  "hasFallacies": boolean,
  "fallacies": [
    {
      "type": "one of: ad_hominem, straw_man, false_dilemma, appeal_to_authority, appeal_to_emotion, appeal_to_popularity, hasty_generalization, slippery_slope, red_herring, circular_reasoning, false_cause, equivocation, tu_quoque, loaded_language, moving_goalposts, begging_the_question, false_equivalence, anecdotal, burden_of_proof, no_true_scotsman",
      "severity": "minor | moderate | major",
      "quote": "the specific part of the argument with the fallacy",
      "suggestion": "how to improve this part of the argument"
    }
  ],
  "argumentStrength": number from 1-10,
  "logicalSoundness": number from 1-10,
  "overallFeedback": "brief constructive feedback (1-2 sentences)"
}

If no fallacies are found, return hasFallacies: false with an empty fallacies array.
Respond ONLY with the JSON, no other text.`;
  }

  async analyzeArgument(
    userMessage: string,
    conversationHistory: AIMessage[],
    settings: DebateSettings,
    userApiKey?: { key: string; baseUrl?: string }
  ): Promise<FallacyAnalysisResult> {
    try {
      const provider = aiServiceFactory.getProvider(settings.aiProvider);

      const analysisPrompt = this.buildAnalysisPrompt(userMessage, conversationHistory, settings);

      const messages: AIMessage[] = [
        { role: 'user', content: analysisPrompt },
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

      console.log('[DEBUG] Analyzing argument for fallacies...');
      const response = await provider.generateResponse(messages, config);
      console.log('[DEBUG] Fallacy analysis complete');

      // Parse the JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[FALLACY] Failed to parse JSON response:', response.content);
        return this.getDefaultAnalysis();
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Enrich fallacies with descriptions from our reference
      const enrichedFallacies: DetectedFallacy[] = (analysis.fallacies || []).map((f: any) => {
        const fallacyInfo = FALLACY_INFO[f.type as FallacyType] || {
          name: f.type,
          description: 'A logical error in reasoning.',
        };

        return {
          type: f.type as FallacyType,
          name: fallacyInfo.name,
          severity: f.severity || 'moderate',
          description: fallacyInfo.description,
          quote: f.quote || '',
          suggestion: f.suggestion || 'Consider restructuring this part of your argument.',
        };
      });

      return {
        hasFallacies: analysis.hasFallacies ?? enrichedFallacies.length > 0,
        fallacies: enrichedFallacies,
        argumentStrength: Math.min(10, Math.max(1, analysis.argumentStrength || 5)),
        logicalSoundness: Math.min(10, Math.max(1, analysis.logicalSoundness || 5)),
        overallFeedback: analysis.overallFeedback || 'Keep developing your argument!',
      };
    } catch (error: any) {
      console.error('[FALLACY] Analysis error:', error.message);
      return this.getDefaultAnalysis();
    }
  }

  private getDefaultAnalysis(): FallacyAnalysisResult {
    return {
      hasFallacies: false,
      fallacies: [],
      argumentStrength: 5,
      logicalSoundness: 5,
      overallFeedback: 'Analysis unavailable. Continue making your argument!',
    };
  }

  // Quick check for obvious patterns (can be used before full AI analysis)
  quickPatternCheck(message: string): { possibleFallacies: string[]; shouldAnalyze: boolean } {
    const patterns: { pattern: RegExp; fallacy: string }[] = [
      { pattern: /you('re| are) (stupid|dumb|idiot|moron)/i, fallacy: 'ad_hominem' },
      { pattern: /everyone (knows|thinks|believes)/i, fallacy: 'appeal_to_popularity' },
      { pattern: /if.*(then).*(will lead to|cause|result in).*(disaster|chaos|ruin)/i, fallacy: 'slippery_slope' },
      { pattern: /either.*(or).*nothing else/i, fallacy: 'false_dilemma' },
      { pattern: /my (friend|uncle|cousin|neighbor) (said|told|experienced)/i, fallacy: 'anecdotal' },
      { pattern: /prove.*(wrong|doesn't exist|isn't true)/i, fallacy: 'burden_of_proof' },
      { pattern: /what about.*\?/i, fallacy: 'tu_quoque' },
    ];

    const possibleFallacies: string[] = [];
    for (const { pattern, fallacy } of patterns) {
      if (pattern.test(message)) {
        possibleFallacies.push(fallacy);
      }
    }

    return {
      possibleFallacies,
      shouldAnalyze: message.length > 50, // Only analyze substantial messages
    };
  }

  getFallacyInfo(type: FallacyType): { name: string; description: string } {
    return FALLACY_INFO[type] || { name: type, description: 'A logical fallacy.' };
  }
}

export const fallacyDetectorService = new FallacyDetectorService();
