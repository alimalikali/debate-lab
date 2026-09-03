import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const positivePort = z.coerce.number().int().min(1).max(65535);
const positiveInteger = z.coerce.number().int().positive();
const envSchema = z.object({
  PORT: positivePort.default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: positivePort.default(5432),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRY must use a duration such as 15m'),
  JWT_REFRESH_EXPIRY: z.string().regex(/^\d+d$/, 'JWT_REFRESH_EXPIRY must be expressed in days, such as 7d'),
  ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, 'ENCRYPTION_KEY must be 64 hexadecimal characters'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  DEFAULT_OLLAMA_MODEL: z.string().min(1).default('llama3.2:1b'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: positiveInteger.default(60000),
  RATE_LIMIT_MAX_REQUESTS: positiveInteger.default(100),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid server configuration: ${details}`);
}

export const env = Object.freeze({
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  database: Object.freeze({ host: parsed.data.DB_HOST, port: parsed.data.DB_PORT, name: parsed.data.DB_NAME, user: parsed.data.DB_USER, password: parsed.data.DB_PASSWORD }),
  jwt: Object.freeze({ secret: parsed.data.JWT_SECRET, refreshSecret: parsed.data.JWT_REFRESH_SECRET, expiry: parsed.data.JWT_EXPIRY, refreshExpiry: parsed.data.JWT_REFRESH_EXPIRY }),
  encryption: Object.freeze({ key: parsed.data.ENCRYPTION_KEY }),
  ollama: Object.freeze({ baseUrl: parsed.data.OLLAMA_BASE_URL, defaultModel: parsed.data.DEFAULT_OLLAMA_MODEL }),
  frontend: Object.freeze({ url: parsed.data.FRONTEND_URL }),
  rateLimit: Object.freeze({ windowMs: parsed.data.RATE_LIMIT_WINDOW_MS, maxRequests: parsed.data.RATE_LIMIT_MAX_REQUESTS }),
});

export type Env = typeof env;
