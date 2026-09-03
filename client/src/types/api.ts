export type Difficulty = "beginner" | "intermediate" | "expert";
export type DebateStyle = "aggressive" | "balanced" | "socratic";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthTokens { accessToken: string; refreshToken: string }
export interface AuthResult { user: User; tokens: AuthTokens }

export interface UserProfile extends User {
  createdAt: string;
  stats: { totalDebates: number; debatesWon: number; debatesLost: number; debatesDraw: number; avgArgumentStrength: number; totalDebateTimeMinutes: number; currentStreak: number; bestStreak: number };
}
export interface UserSettings { defaultDifficulty: string; defaultDebateStyle: string; preferredAiProvider: string; preferredModel: string | null; theme: string; notificationsEnabled: boolean }
export interface ApiKey { id: string; provider: string; keyName: string; apiBaseUrl?: string; isActive: boolean; lastUsed: string | null; createdAt: string; maskedKey?: string }
export interface Category { id: string; name: string; slug: string; description: string | null; iconName: string | null; color: string | null; topicCount: number }
export interface Topic { id: string; title: string; description: string; difficulty: Difficulty; category: { id: string; name: string; slug: string } | null; isPredefined: boolean; usageCount: number; createdAt: string }
export interface Debate { id: string; userId: string; topic: Pick<Topic, "id" | "title" | "description"> | null; customTopic: { title: string; description: string } | null; userPosition: string; difficulty: Difficulty; debateStyle: DebateStyle; aiProvider: string; aiModel: string; status: "active" | "paused" | "completed" | "abandoned"; startedAt: string; endedAt: string | null; messageCount: number }
export interface DebateMessage { id: string; debateId: string; role: "human" | "ai" | "system"; content: string; sentiment: "neutral" | "angry" | "logical" | "empathetic" | "sarcastic" | null; tokensUsed: number | null; responseTimeMs: number | null; createdAt: string }
export interface DebateStats { argumentStrength: number; logicalScore: number; persuasiveScore: number; fallaciesDetected: number; totalUserMessages: number; totalAiMessages: number; totalTokensUsed: number; durationMinutes: number; outcome: string | null }
export interface DebateSummary { summaryText: string; keyArgumentsUser: string[]; keyArgumentsAi: string[]; strengths: string[]; areasForImprovement: string[]; finalEvaluation: string; generatedAt: string }
export interface AiProvider { name: string; displayName?: string; connected?: boolean; models?: string[]; requiresApiKey?: boolean }
export interface GeneratedSummary { overallPerformance: string; argumentStrength: number; logicalScore: number; persuasiveScore: number; userStrengths: string[]; areasForImprovement: string[]; fallaciesDetected: Array<{ type: string; description: string }>; recommendation: string }
export interface DetailedFallacy { id: string; messageId: string; fallacyType: string; fallacyName: string; severity: "minor" | "moderate" | "major"; description: string; quote: string; suggestion: string; messageContent: string; argumentStrength: number; logicalSoundness: number; createdAt: string }
export interface EndDebateResult { summary: GeneratedSummary; stats: DebateStats; detailedFallacies: DetailedFallacy[] }
