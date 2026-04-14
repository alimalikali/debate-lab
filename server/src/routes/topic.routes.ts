import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { topicService } from '../services/topic.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { AuthRequest } from '../types/express';

const router = Router();

// Validation schemas
const createTopicSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  difficulty: z.enum(['beginner', 'intermediate', 'expert']),
  categoryId: z.string().uuid().optional(),
});

const topicFiltersSchema = z.object({
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

// Get all categories
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await topicService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// Get trending topics
router.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const topics = await topicService.getTrendingTopics(Math.min(limit, 20));
    res.json({
      success: true,
      data: topics,
    });
  } catch (error) {
    next(error);
  }
});

// Get all topics with filters
router.get(
  '/',
  validate(topicFiltersSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        categorySlug: req.query.category as string,
        difficulty: req.query.difficulty as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await topicService.getTopics(filters);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single topic
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topic = await topicService.getTopic(req.params.id);
    res.json({
      success: true,
      data: topic,
    });
  } catch (error) {
    next(error);
  }
});

// Create custom topic (requires auth)
router.post(
  '/',
  authMiddleware,
  validate(createTopicSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const topic = await topicService.createTopic(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: topic,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
