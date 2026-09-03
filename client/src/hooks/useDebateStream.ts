import { useState, useCallback, useRef } from 'react';
import { debatesApi } from '@/lib/api';

interface Message {
  id: string;
  debateId: string;
  role: string;
  content: string;
  createdAt: Date;
}

// Fallacy Analysis Types
export type FallacySeverity = 'minor' | 'moderate' | 'major';

export interface DetectedFallacy {
  type: string;
  name: string;
  severity: FallacySeverity;
  description: string;
  quote: string;
  suggestion: string;
}

export interface FallacyAnalysisResult {
  messageId?: string;
  hasFallacies: boolean;
  fallacies: DetectedFallacy[];
  argumentStrength: number;
  logicalSoundness: number;
  overallFeedback: string;
}

interface UseDebateStreamOptions {
  debateId: string;
  onMessage?: (message: Message) => void;
  onFallacyAnalysis?: (analysis: FallacyAnalysisResult) => void;
  onError?: (error: Error) => void;
}

export function useDebateStream({ debateId, onMessage, onFallacyAnalysis, onError }: UseDebateStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    setIsStreaming(true);
    setStreamingContent('');
    abortControllerRef.current = new AbortController();

    try {
      const response = await debatesApi.sendMessageStream(debateId, content);

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/event: (\w+)/);
          const dataMatch = line.match(/data: (.+)/s);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);

              switch (event) {
                case 'user_message':
                  onMessage?.(data);
                  break;
                case 'token':
                  fullContent += data.token;
                  setStreamingContent(fullContent);
                  break;
                case 'complete': {
                  // The AI message is complete - add it to messages
                  const aiMessage: Message = {
                    id: data.messageId || data.id || crypto.randomUUID(),
                    debateId,
                    role: 'ai',
                    content: fullContent,
                    createdAt: new Date(),
                  };
                  onMessage?.(aiMessage);
                  setStreamingContent('');
                  break;
                }
                case 'fallacy_analysis':
                  onFallacyAnalysis?.(data);
                  break;
                case 'error':
                  onError?.(new Error(data.error));
                  break;
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        onError?.(error as Error);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [debateId, isStreaming, onMessage, onFallacyAnalysis, onError]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return {
    sendMessage,
    cancelStream,
    isStreaming,
    streamingContent,
  };
}
