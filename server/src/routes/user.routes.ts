import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { AuthRequest } from '../types/express';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

const updateSettingsSchema = z.object({
  defaultDifficulty: z.enum(['beginner', 'intermediate', 'expert']).optional(),
  defaultDebateStyle: z.enum(['aggressive', 'balanced', 'socratic']).optional(),
  preferredAiProvider: z.string().optional(),
  preferredModel: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notificationsEnabled: z.boolean().optional(),
});

const addApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'groq', 'openai_compatible']),
  apiKey: z.string().min(1, 'API key is required'),
  keyName: z.string().max(100).optional(),
  apiBaseUrl: z.string().url().optional(),
});

// Get profile
router.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await userService.getProfile(req.user!.id);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put(
  '/profile',
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await userService.updateProfile(req.user!.id, req.body);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get settings
router.get('/settings', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await userService.getSettings(req.user!.id);
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// Update settings
router.put(
  '/settings',
  validate(updateSettingsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const settings = await userService.updateSettings(req.user!.id, req.body);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get API keys
router.get('/api-keys', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const keys = await userService.getApiKeys(req.user!.id);
    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    next(error);
  }
});

// Add API key
router.post(
  '/api-keys',
  validate(addApiKeySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const key = await userService.addApiKey(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: key,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete API key
router.delete('/api-keys/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await userService.deleteApiKey(req.user!.id, req.params.id);
    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/account', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await userService.deleteAccount(req.user!.id);
    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
