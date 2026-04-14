
export type MessageRole = "human" | "ai";

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  sentiment?: "neutral" | "angry" | "logical" | "empathetic" | "sarcastic";
}

export interface DebateStats {
  argumentStrength: number;
  fallaciesDetected: number;
  duration: number;
  persuasiveScore?: number;
  logicalScore?: number;
}

export interface TrendingDebate {
  id: string;
  topic: string;
  description: string;
  messageCount: number;
  duration: number;
  category?: string;
  participantCount?: number;
  sentiment?: number; // 0-100 scale
}

export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "expert";
  category?: "ethics" | "tech" | "politics" | "culture" | "philosophy" | "ai";
}

export interface DebateSession {
  id: string;
  topic: DebateTopic;
  messages: Message[];
  stats: DebateStats;
  startedAt: Date;
  endedAt?: Date;
}

export interface DebateCategory {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  color?: string;
}

export interface UserEngagement {
  visitCount: number;
  debateCount: number;
  completionRate: number;
  avgDuration: number;
  level: "new" | "returning" | "high";
}

export interface FallacyDetection {
  type: string;
  description: string;
  severity: number;
  messageId: string;
  suggestion?: string;
}

