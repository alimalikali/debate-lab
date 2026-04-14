import { db } from '../config/database';
import { NotFoundError, AuthorizationError } from '../middleware/error.middleware';
import { topicService } from './topic.service';
import { userService } from './user.service';
import { debateAIService } from './ai/debate-ai.service';
import { aiServiceFactory } from './ai/ai-service.factory';
import { fallacyDetectorService } from './ai/fallacy-detector.service';
import { AIMessage, DebateSettings, StreamingCallback, FallacyAnalysisResult } from './ai/types';
import { paginationHelper, createPaginatedResponse, PaginatedResponse } from '../utils/helpers';

interface CreateDebateInput {
  topicId?: string;
  customTopicTitle?: string;
  customTopicDescription?: string;
  userPosition: string;
  difficulty: string;
  debateStyle: string;
  aiProvider: string;
  aiModel: string;
}

interface Debate {
  id: string;
  userId: string;
  topic: {
    id: string;
    title: string;
    description: string;
  } | null;
  customTopic: {
    title: string;
    description: string;
  } | null;
  userPosition: string;
  difficulty: string;
  debateStyle: string;
  aiProvider: string;
  aiModel: string;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  messageCount?: number;
}

interface Message {
  id: string;
  debateId: string;
  role: string;
  content: string;
  sentiment: string | null;
  tokensUsed: number | null;
  responseTimeMs: number | null;
  createdAt: Date;
}

export class DebateService {
  async createDebate(userId: string, input: CreateDebateInput): Promise<Debate> {
    console.log('[DEBUG] createDebate started', { userId, aiProvider: input.aiProvider, aiModel: input.aiModel });
    let topicTitle: string;
    let topicDescription: string;

    // Pre-flight check: Validate AI provider is accessible before creating debate
    if (input.aiProvider === 'ollama') {
      console.log('[DEBUG] Checking Ollama status...');
      const status = await aiServiceFactory.getProviderStatus('ollama');
      console.log('[DEBUG] Ollama status:', status);
      if (!status.connected) {
        throw new Error('Ollama is not running. Please start Ollama with "ollama serve" or select a different AI provider.');
      }
      // Also check if the requested model is available
      if (!status.models.includes(input.aiModel) && !status.models.some(m => m.startsWith(input.aiModel.split(':')[0]))) {
        throw new Error(`Model "${input.aiModel}" is not available in Ollama. Available models: ${status.models.join(', ') || 'none'}. Run "ollama pull ${input.aiModel}" to download it.`);
      }
    } else {
      // For cloud providers, check if user has API key
      const userApiKey = await this.getUserApiKey(userId, input.aiProvider);
      if (!userApiKey) {
        throw new Error(`${input.aiProvider} API key is required. Please add your API key in Settings.`);
      }
    }

    if (input.topicId) {
      const topic = await topicService.getTopic(input.topicId);
      topicTitle = topic.title;
      topicDescription = topic.description;
      await topicService.incrementUsageCount(input.topicId);
    } else if (input.customTopicTitle && input.customTopicDescription) {
      topicTitle = input.customTopicTitle;
      topicDescription = input.customTopicDescription;
    } else {
      throw new Error('Either topicId or custom topic details are required');
    }

    console.log('[DEBUG] Inserting debate into DB...');
    const result = await db.query(
      `INSERT INTO debates (
        user_id, topic_id, custom_topic_title, custom_topic_description,
        user_position, difficulty, debate_style, ai_provider, ai_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        userId,
        input.topicId || null,
        input.topicId ? null : input.customTopicTitle,
        input.topicId ? null : input.customTopicDescription,
        input.userPosition,
        input.difficulty,
        input.debateStyle,
        input.aiProvider,
        input.aiModel,
      ]
    );

    const debateId = result.rows[0].id;
    console.log('[DEBUG] Debate created with ID:', debateId);

    // Create initial debate stats
    await db.query('INSERT INTO debate_stats (debate_id) VALUES ($1)', [debateId]);
    console.log('[DEBUG] Debate stats created');

    // Generate and add initial AI message
    const settings: DebateSettings = {
      topicTitle,
      topicDescription,
      userPosition: input.userPosition,
      difficulty: input.difficulty as 'beginner' | 'intermediate' | 'expert',
      debateStyle: input.debateStyle as 'aggressive' | 'balanced' | 'socratic',
      aiProvider: input.aiProvider,
      aiModel: input.aiModel,
    };

    const userApiKey = await this.getUserApiKey(userId, input.aiProvider);

    const openingMessages: AIMessage[] = [
      {
        role: 'user',
        content: `The debate topic is: ${topicTitle}. ${topicDescription}\n\nI am arguing: "${input.userPosition}"\n\nPlease begin by presenting your counter-position.`,
      },
    ];

    try {
      console.log('[DEBUG] Generating AI response...');
      const aiResponse = await debateAIService.generateResponse(openingMessages, settings, userApiKey);
      console.log('[DEBUG] AI response received, length:', aiResponse.content.length);

      await this.addMessage(debateId, {
        role: 'ai',
        content: aiResponse.content,
        tokensUsed: aiResponse.tokensUsed,
        responseTimeMs: aiResponse.responseTimeMs,
      });
      console.log('[DEBUG] AI message saved');
    } catch (error: any) {
      // Log the error for debugging
      console.error('AI initial response failed:', error.message);

      // Delete the debate since AI failed
      await db.query('DELETE FROM debate_stats WHERE debate_id = $1', [debateId]);
      await db.query('DELETE FROM debates WHERE id = $1', [debateId]);

      // Re-throw with a helpful message
      throw new Error(`Failed to start debate: ${error.message}`);
    }

    console.log('[DEBUG] Fetching created debate...');
    const debate = await this.getDebate(userId, debateId);
    console.log('[DEBUG] Debate fetched successfully:', debate.id);
    return debate;
  }

  async getDebate(userId: string, debateId: string): Promise<Debate> {
    const result = await db.query(
      `SELECT d.*, dt.title as topic_title, dt.description as topic_description,
              (SELECT COUNT(*) FROM messages WHERE debate_id = d.id)::int as message_count
       FROM debates d
       LEFT JOIN debate_topics dt ON dt.id = d.topic_id
       WHERE d.id = $1`,
      [debateId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Debate not found');
    }

    const row = result.rows[0];

    if (row.user_id !== userId) {
      throw new AuthorizationError('Access denied');
    }

    return this.mapDebateRow(row);
  }

  async getUserDebates(userId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Debate>> {
    const { offset } = paginationHelper(page, limit);

    const countResult = await db.query(
      'SELECT COUNT(*)::int as total FROM debates WHERE user_id = $1',
      [userId]
    );
    const total = countResult.rows[0].total;

    const result = await db.query(
      `SELECT d.*, dt.title as topic_title, dt.description as topic_description,
              (SELECT COUNT(*) FROM messages WHERE debate_id = d.id)::int as message_count
       FROM debates d
       LEFT JOIN debate_topics dt ON dt.id = d.topic_id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const debates = result.rows.map(this.mapDebateRow);
    return createPaginatedResponse(debates, page, limit, total);
  }

  async getMessages(userId: string, debateId: string): Promise<Message[]> {
    // Verify access
    await this.getDebate(userId, debateId);

    const result = await db.query(
      `SELECT * FROM messages WHERE debate_id = $1 ORDER BY created_at ASC`,
      [debateId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      debateId: row.debate_id,
      role: row.role,
      content: row.content,
      sentiment: row.sentiment,
      tokensUsed: row.tokens_used,
      responseTimeMs: row.response_time_ms,
      createdAt: row.created_at,
    }));
  }

  async addMessage(
    debateId: string,
    message: { role: string; content: string; tokensUsed?: number; responseTimeMs?: number }
  ): Promise<Message> {
    const result = await db.query(
      `INSERT INTO messages (debate_id, role, content, tokens_used, response_time_ms)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [debateId, message.role, message.content, message.tokensUsed, message.responseTimeMs]
    );

    const row = result.rows[0];

    // Update stats
    await db.query(
      `UPDATE debate_stats SET
        total_user_messages = total_user_messages + CASE WHEN $2 = 'human' THEN 1 ELSE 0 END,
        total_ai_messages = total_ai_messages + CASE WHEN $2 = 'ai' THEN 1 ELSE 0 END,
        total_tokens_used = total_tokens_used + COALESCE($3, 0),
        updated_at = NOW()
       WHERE debate_id = $1`,
      [debateId, message.role, message.tokensUsed || 0]
    );

    return {
      id: row.id,
      debateId: row.debate_id,
      role: row.role,
      content: row.content,
      sentiment: row.sentiment,
      tokensUsed: row.tokens_used,
      responseTimeMs: row.response_time_ms,
      createdAt: row.created_at,
    };
  }

  async sendMessage(userId: string, debateId: string, content: string): Promise<{ userMessage: Message; aiMessage: Message }> {
    const debate = await this.getDebate(userId, debateId);

    if (debate.status !== 'active') {
      throw new Error('Cannot send messages to a completed or paused debate');
    }

    // Add user message
    const userMessage = await this.addMessage(debateId, {
      role: 'human',
      content,
    });

    // Get conversation history
    const messages = await this.getMessages(userId, debateId);
    const aiMessages: AIMessage[] = messages.map((m) => ({
      role: m.role === 'human' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Get debate settings
    const topicTitle = debate.topic?.title || debate.customTopic?.title || '';
    const topicDescription = debate.topic?.description || debate.customTopic?.description || '';

    const settings: DebateSettings = {
      topicTitle,
      topicDescription,
      userPosition: debate.userPosition,
      difficulty: debate.difficulty as 'beginner' | 'intermediate' | 'expert',
      debateStyle: debate.debateStyle as 'aggressive' | 'balanced' | 'socratic',
      aiProvider: debate.aiProvider,
      aiModel: debate.aiModel,
    };

    const userApiKey = await this.getUserApiKey(userId, debate.aiProvider);

    // Generate AI response
    const aiResponse = await debateAIService.generateResponse(aiMessages, settings, userApiKey);

    const aiMessage = await this.addMessage(debateId, {
      role: 'ai',
      content: aiResponse.content,
      tokensUsed: aiResponse.tokensUsed,
      responseTimeMs: aiResponse.responseTimeMs,
    });

    return { userMessage, aiMessage };
  }

  async sendMessageStreaming(
    userId: string,
    debateId: string,
    content: string,
    callbacks: StreamingCallback & {
      onUserMessage: (message: Message) => void;
      onFallacyAnalysis?: (analysis: FallacyAnalysisResult) => void;
    }
  ): Promise<void> {
    const debate = await this.getDebate(userId, debateId);

    if (debate.status !== 'active') {
      throw new Error('Cannot send messages to a completed or paused debate');
    }

    // Add user message
    const userMessage = await this.addMessage(debateId, {
      role: 'human',
      content,
    });
    callbacks.onUserMessage(userMessage);

    // Get conversation history
    const messages = await this.getMessages(userId, debateId);
    const aiMessages: AIMessage[] = messages.map((m) => ({
      role: m.role === 'human' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Get debate settings
    const topicTitle = debate.topic?.title || debate.customTopic?.title || '';
    const topicDescription = debate.topic?.description || debate.customTopic?.description || '';

    const settings: DebateSettings = {
      topicTitle,
      topicDescription,
      userPosition: debate.userPosition,
      difficulty: debate.difficulty as 'beginner' | 'intermediate' | 'expert',
      debateStyle: debate.debateStyle as 'aggressive' | 'balanced' | 'socratic',
      aiProvider: debate.aiProvider,
      aiModel: debate.aiModel,
    };

    const userApiKey = await this.getUserApiKey(userId, debate.aiProvider);

    // Analyze user's argument for fallacies (async, non-blocking)
    if (callbacks.onFallacyAnalysis && content.length > 30) {
      // Run fallacy detection in parallel with AI response generation
      fallacyDetectorService.analyzeArgument(content, aiMessages.slice(0, -1), settings, userApiKey)
        .then(async (analysis) => {
          analysis.messageId = userMessage.id;

          // Save detected fallacies to database for later retrieval in summary
          if (analysis.fallacies && analysis.fallacies.length > 0) {
            for (const fallacy of analysis.fallacies) {
              try {
                await db.query(
                  `INSERT INTO debate_fallacies
                   (debate_id, message_id, fallacy_type, fallacy_name, severity, description, quote, suggestion, argument_strength, logical_soundness)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                  [
                    debateId,
                    userMessage.id,
                    fallacy.type,
                    fallacy.name,
                    fallacy.severity,
                    fallacy.description,
                    fallacy.quote || '',
                    fallacy.suggestion || '',
                    analysis.argumentStrength,
                    analysis.logicalSoundness,
                  ]
                );
              } catch (dbError: any) {
                console.error('[FALLACY] Failed to save fallacy:', dbError.message);
              }
            }
          }

          callbacks.onFallacyAnalysis!(analysis);
        })
        .catch((error) => {
          console.error('[FALLACY] Detection error:', error.message);
        });
    }

    // Generate AI response with streaming
    await debateAIService.generateStreamingResponse(aiMessages, settings, {
      onToken: callbacks.onToken,
      onComplete: async (response) => {
        const aiMessage = await this.addMessage(debateId, {
          role: 'ai',
          content: response.content,
          tokensUsed: response.tokensUsed,
          responseTimeMs: response.responseTimeMs,
        });
        callbacks.onComplete({ ...response, messageId: aiMessage.id } as any);
      },
      onError: callbacks.onError,
    }, userApiKey);
  }

  async endDebate(userId: string, debateId: string): Promise<{ summary: any; stats: any }> {
    const debate = await this.getDebate(userId, debateId);

    // Update debate status
    await db.query(
      `UPDATE debates SET status = 'completed', ended_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [debateId]
    );

    // Get messages for summary
    const messages = await this.getMessages(userId, debateId);
    const aiMessages: AIMessage[] = messages.map((m) => ({
      role: m.role === 'human' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Get debate settings
    const topicTitle = debate.topic?.title || debate.customTopic?.title || '';
    const topicDescription = debate.topic?.description || debate.customTopic?.description || '';

    const settings: DebateSettings = {
      topicTitle,
      topicDescription,
      userPosition: debate.userPosition,
      difficulty: debate.difficulty as 'beginner' | 'intermediate' | 'expert',
      debateStyle: debate.debateStyle as 'aggressive' | 'balanced' | 'socratic',
      aiProvider: debate.aiProvider,
      aiModel: debate.aiModel,
    };

    const userApiKey = await this.getUserApiKey(userId, debate.aiProvider);

    // Generate summary
    let summaryData: any;
    try {
      const summaryJson = await debateAIService.generateDebateSummary(aiMessages, settings, userApiKey);
      summaryData = JSON.parse(summaryJson);
    } catch (error) {
      // Fallback summary
      summaryData = {
        overallPerformance: 'Summary generation failed',
        argumentStrength: 5,
        logicalScore: 5,
        persuasiveScore: 5,
        userStrengths: ['Engaged in discussion'],
        areasForImprovement: ['Continue practicing'],
        keyArgumentsUser: [],
        keyArgumentsAI: [],
        fallaciesDetected: [],
        recommendation: 'Keep debating to improve your skills',
      };
    }

    // Save summary
    await db.query(
      `INSERT INTO debate_summaries (
        debate_id, summary_text, key_arguments_user, key_arguments_ai,
        strengths, areas_for_improvement, final_evaluation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (debate_id) DO UPDATE SET
        summary_text = EXCLUDED.summary_text,
        key_arguments_user = EXCLUDED.key_arguments_user,
        key_arguments_ai = EXCLUDED.key_arguments_ai,
        strengths = EXCLUDED.strengths,
        areas_for_improvement = EXCLUDED.areas_for_improvement,
        final_evaluation = EXCLUDED.final_evaluation,
        generated_at = NOW()`,
      [
        debateId,
        summaryData.overallPerformance,
        JSON.stringify(summaryData.keyArgumentsUser),
        JSON.stringify(summaryData.keyArgumentsAI),
        JSON.stringify(summaryData.userStrengths),
        JSON.stringify(summaryData.areasForImprovement),
        summaryData.recommendation,
      ]
    );

    // Get real fallacy count from stored fallacies
    const fallacyCountResult = await db.query(
      'SELECT COUNT(*)::int as count FROM debate_fallacies WHERE debate_id = $1',
      [debateId]
    );
    const realFallacyCount = fallacyCountResult.rows[0].count;

    // Update stats with real fallacy count
    const duration = Math.floor((Date.now() - new Date(debate.startedAt).getTime()) / 60000);
    await db.query(
      `UPDATE debate_stats SET
        argument_strength = $2,
        logical_score = $3,
        persuasive_score = $4,
        fallacies_detected = $5,
        duration_minutes = $6,
        outcome = 'completed',
        updated_at = NOW()
       WHERE debate_id = $1`,
      [
        debateId,
        summaryData.argumentStrength,
        summaryData.logicalScore,
        summaryData.persuasiveScore,
        realFallacyCount, // Use actual stored fallacy count
        duration,
      ]
    );

    // Update user stats
    await this.updateUserStats(userId);

    const stats = await this.getDebateStats(debateId);

    // Fetch all real-time detected fallacies for this debate
    const detailedFallacies = await this.getDebateFallacies(debateId);

    return { summary: summaryData, stats, detailedFallacies };
  }

  async getDebateFallacies(debateId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT df.*, m.content as message_content
       FROM debate_fallacies df
       JOIN messages m ON df.message_id = m.id
       WHERE df.debate_id = $1
       ORDER BY df.created_at ASC`,
      [debateId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      messageId: row.message_id,
      fallacyType: row.fallacy_type,
      fallacyName: row.fallacy_name,
      severity: row.severity,
      description: row.description,
      quote: row.quote,
      suggestion: row.suggestion,
      argumentStrength: row.argument_strength,
      logicalSoundness: row.logical_soundness,
      messageContent: row.message_content,
      createdAt: row.created_at,
    }));
  }

  async getDebateStats(debateId: string) {
    const result = await db.query('SELECT * FROM debate_stats WHERE debate_id = $1', [debateId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      argumentStrength: parseFloat(row.argument_strength),
      logicalScore: parseFloat(row.logical_score),
      persuasiveScore: parseFloat(row.persuasive_score),
      fallaciesDetected: row.fallacies_detected,
      totalUserMessages: row.total_user_messages,
      totalAiMessages: row.total_ai_messages,
      totalTokensUsed: row.total_tokens_used,
      durationMinutes: row.duration_minutes,
      outcome: row.outcome,
    };
  }

  async getDebateSummary(userId: string, debateId: string) {
    await this.getDebate(userId, debateId); // Verify access

    const result = await db.query('SELECT * FROM debate_summaries WHERE debate_id = $1', [debateId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      summaryText: row.summary_text,
      keyArgumentsUser: row.key_arguments_user,
      keyArgumentsAi: row.key_arguments_ai,
      strengths: row.strengths,
      areasForImprovement: row.areas_for_improvement,
      finalEvaluation: row.final_evaluation,
      generatedAt: row.generated_at,
    };
  }

  async deleteDebate(userId: string, debateId: string): Promise<void> {
    await this.getDebate(userId, debateId); // Verify access
    await db.query('DELETE FROM debates WHERE id = $1', [debateId]);
    await this.updateUserStats(userId);
  }

  private async getUserApiKey(userId: string, provider: string): Promise<{ key: string; baseUrl?: string } | undefined> {
    if (provider === 'ollama') {
      return undefined;
    }
    const keyData = await userService.getDecryptedApiKey(userId, provider);
    return keyData || undefined;
  }

  private async updateUserStats(userId: string): Promise<void> {
    await db.query(
      `UPDATE user_stats SET
        total_debates = (SELECT COUNT(*) FROM debates WHERE user_id = $1),
        debates_won = (SELECT COUNT(*) FROM debates d JOIN debate_stats ds ON ds.debate_id = d.id WHERE d.user_id = $1 AND ds.outcome = 'won'),
        avg_argument_strength = COALESCE((SELECT AVG(ds.argument_strength) FROM debates d JOIN debate_stats ds ON ds.debate_id = d.id WHERE d.user_id = $1), 0),
        total_debate_time_minutes = COALESCE((SELECT SUM(ds.duration_minutes) FROM debates d JOIN debate_stats ds ON ds.debate_id = d.id WHERE d.user_id = $1), 0),
        last_debate_at = (SELECT MAX(created_at) FROM debates WHERE user_id = $1),
        updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  }

  private mapDebateRow(row: any): Debate {
    return {
      id: row.id,
      userId: row.user_id,
      topic: row.topic_id
        ? {
            id: row.topic_id,
            title: row.topic_title,
            description: row.topic_description,
          }
        : null,
      customTopic:
        row.custom_topic_title && row.custom_topic_description
          ? {
              title: row.custom_topic_title,
              description: row.custom_topic_description,
            }
          : null,
      userPosition: row.user_position,
      difficulty: row.difficulty,
      debateStyle: row.debate_style,
      aiProvider: row.ai_provider,
      aiModel: row.ai_model,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      messageCount: row.message_count,
    };
  }
}

export const debateService = new DebateService();
