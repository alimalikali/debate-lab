export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  messageId?: string;
  content: string;
  tokensUsed: number;
  responseTimeMs: number;
  model: string;
  provider: string;
}

export interface StreamingCallback {
  onToken: (token: string) => void;
  onComplete: (response: AIResponse) => void;
  onError: (error: Error) => void;
}

export interface AIProvider {
  name: string;

  generateResponse(messages: AIMessage[], config: AIProviderConfig): Promise<AIResponse>;

  generateStreamingResponse(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: StreamingCallback
  ): Promise<void>;

  listModels(config?: Partial<AIProviderConfig>): Promise<string[]>;

  testConnection(config?: Partial<AIProviderConfig>): Promise<boolean>;
}

export interface DebateSettings {
  topicTitle: string;
  topicDescription: string;
  userPosition: string;
  difficulty: 'beginner' | 'intermediate' | 'expert';
  debateStyle: 'aggressive' | 'balanced' | 'socratic';
  aiProvider: string;
  aiModel: string;
}

// Fallacy Detection Types
export type FallacySeverity = 'minor' | 'moderate' | 'major';

export type FallacyType =
  | 'ad_hominem'
  | 'straw_man'
  | 'false_dilemma'
  | 'appeal_to_authority'
  | 'appeal_to_emotion'
  | 'appeal_to_popularity'
  | 'hasty_generalization'
  | 'slippery_slope'
  | 'red_herring'
  | 'circular_reasoning'
  | 'false_cause'
  | 'equivocation'
  | 'tu_quoque'
  | 'loaded_language'
  | 'moving_goalposts'
  | 'begging_the_question'
  | 'false_equivalence'
  | 'anecdotal'
  | 'burden_of_proof'
  | 'no_true_scotsman';

export interface DetectedFallacy {
  type: FallacyType;
  name: string;
  severity: FallacySeverity;
  description: string;
  quote: string; // The part of the argument containing the fallacy
  suggestion: string; // How to improve the argument
}

export interface FallacyAnalysisResult {
  messageId?: string;
  hasFallacies: boolean;
  fallacies: DetectedFallacy[];
  argumentStrength: number; // 1-10
  logicalSoundness: number; // 1-10
  overallFeedback: string;
}

export interface ArgumentAnalysis {
  messageId: string;
  content: string;
  fallacyAnalysis: FallacyAnalysisResult;
  timestamp: Date;
}
