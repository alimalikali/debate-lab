import { getErrorMessage, getHttpStatus } from '../utils/errors';
import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { debateService } from '../services/debate.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { AuthRequest } from '../types/express';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const createDebateSchema = z.object({
  topicId: z.string().uuid().optional(),
  customTopicTitle: z.string().min(5).max(255).optional(),
  customTopicDescription: z.string().min(10).max(1000).optional(),
  userPosition: z.string().min(5, 'Your position must be at least 5 characters').max(500),
  difficulty: z.enum(['beginner', 'intermediate', 'expert']),
  debateStyle: z.enum(['aggressive', 'balanced', 'socratic']),
  aiProvider: z.string().default('ollama'),
  aiModel: z.string().default('llama2'),
}).refine(
  (data) => data.topicId || (data.customTopicTitle && data.customTopicDescription),
  { message: 'Either topicId or custom topic details are required' }
);

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});

// Create new debate
router.post(
  '/',
  validate(createDebateSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      console.log('[DEBUG] Route: Creating debate...');
      const debate = await debateService.createDebate(req.user!.id, req.body);
      console.log('[DEBUG] Route: Debate created, sending response...');
      res.status(201).json({
        success: true,
        data: debate,
      });
      console.log('[DEBUG] Route: Response sent');
    } catch (error) {
      console.log('[DEBUG] Route: Error caught', error);
      next(error);
    }
  }
);

// Get user's debates
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await debateService.getUserDebates(req.user!.id, page, limit);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// Get single debate
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const debate = await debateService.getDebate(req.user!.id, req.params.id);
    res.json({
      success: true,
      data: debate,
    });
  } catch (error) {
    next(error);
  }
});

// Get debate messages
router.get('/:id/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const messages = await debateService.getMessages(req.user!.id, req.params.id);
    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

// Send message (non-streaming)
router.post(
  '/:id/messages',
  validate(sendMessageSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await debateService.sendMessage(
        req.user!.id,
        req.params.id,
        req.body.content
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Send message with streaming response (SSE)
router.post(
  '/:id/messages/stream',
  validate(sendMessageSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const debateId = req.params.id;
    const userId = req.user!.id;
    const { content } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
      await debateService.sendMessageStreaming(userId, debateId, content, {
        onUserMessage: (message) => {
          res.write(`event: user_message\ndata: ${JSON.stringify(message)}\n\n`);
        },
        onFallacyAnalysis: (analysis) => {
          res.write(`event: fallacy_analysis\ndata: ${JSON.stringify(analysis)}\n\n`);
        },
        onToken: (token) => {
          res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
        },
        onComplete: (response) => {
          res.write(`event: complete\ndata: ${JSON.stringify(response)}\n\n`);
          res.end();
        },
        onError: (error) => {
          res.write(`event: error\ndata: ${JSON.stringify({ error: getErrorMessage(error) })}\n\n`);
          res.end();
        },
      });
    } catch (error: unknown) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: getErrorMessage(error) })}\n\n`);
      res.end();
    }
  }
);

// End debate and get summary
router.post('/:id/end', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await debateService.endDebate(req.user!.id, req.params.id);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get debate stats
router.get('/:id/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const debate = await debateService.getDebate(req.user!.id, req.params.id);
    const stats = await debateService.getDebateStats(req.params.id);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// Get debate summary
router.get('/:id/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const summary = await debateService.getDebateSummary(req.user!.id, req.params.id);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

// Delete debate
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await debateService.deleteDebate(req.user!.id, req.params.id);
    res.json({
      success: true,
      message: 'Debate deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
