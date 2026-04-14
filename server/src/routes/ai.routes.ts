import { Router, Request, Response, NextFunction } from 'express';
import { aiServiceFactory } from '../services/ai/ai-service.factory';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { userService } from '../services/user.service';
import { AuthRequest } from '../types/express';

const router = Router();

// Get available AI providers
router.get('/providers', (req: Request, res: Response) => {
  const providers = aiServiceFactory.listProviders();
  res.json({
    success: true,
    data: providers,
  });
});

// Get Ollama status (public)
router.get('/ollama/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await aiServiceFactory.getProviderStatus('ollama');
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

// Get Ollama models (public)
router.get('/ollama/models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = aiServiceFactory.getProvider('ollama');
    const models = await provider.listModels();
    res.json({
      success: true,
      data: models,
    });
  } catch (error) {
    next(error);
  }
});

// Get models for a specific provider (requires auth if provider needs API key)
router.get(
  '/providers/:name/models',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      const provider = aiServiceFactory.getProvider(name);

      let apiKey: string | undefined;
      let baseUrl: string | undefined;

      if (req.user && name !== 'ollama') {
        const keyData = await userService.getDecryptedApiKey(req.user.id, name);
        if (keyData) {
          apiKey = keyData.key;
          baseUrl = keyData.baseUrl;
        }
      }

      const models = await provider.listModels({ apiKey, baseUrl });
      res.json({
        success: true,
        data: models,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Test provider connection (requires auth)
router.post(
  '/providers/:name/test',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;
      const { apiKey, baseUrl } = req.body;

      // Use provided key or stored key
      let key = apiKey;
      let url = baseUrl;

      if (!key && req.user) {
        const keyData = await userService.getDecryptedApiKey(req.user.id, name);
        if (keyData) {
          key = keyData.key;
          url = keyData.baseUrl;
        }
      }

      const provider = aiServiceFactory.getProvider(name);
      const connected = await provider.testConnection({ apiKey: key, baseUrl: url });

      res.json({
        success: true,
        data: {
          provider: name,
          connected,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get provider status (requires auth for providers with API keys)
router.get(
  '/providers/:name/status',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name } = req.params;

      let apiKey: string | undefined;
      let baseUrl: string | undefined;

      if (req.user && name !== 'ollama') {
        const keyData = await userService.getDecryptedApiKey(req.user.id, name);
        if (keyData) {
          apiKey = keyData.key;
          baseUrl = keyData.baseUrl;
        }
      }

      const status = await aiServiceFactory.getProviderStatus(name, apiKey, baseUrl);
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
