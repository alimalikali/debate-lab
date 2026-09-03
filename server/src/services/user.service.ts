import { QueryConfigValues } from 'pg';
import { db } from '../config/database';
import { NotFoundError } from '../middleware/error.middleware';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../utils/encryption';

interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

interface UserSettings {
  defaultDifficulty: string;
  defaultDebateStyle: string;
  preferredAiProvider: string;
  preferredModel: string | null;
  theme: string;
  notificationsEnabled: boolean;
}

interface ApiKeyInput {
  provider: string;
  apiKey: string;
  keyName?: string;
  apiBaseUrl?: string;
}

export class UserService {
  async getProfile(userId: string) {
    const result = await db.query(
      `SELECT u.id, u.email, u.username, u.display_name, u.avatar_url, u.created_at,
              us.total_debates, us.debates_won, us.debates_lost, us.debates_draw,
              us.avg_argument_strength, us.total_debate_time_minutes,
              us.streak_current, us.streak_best
       FROM users u
       LEFT JOIN user_stats us ON us.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      stats: {
        totalDebates: row.total_debates || 0,
        debatesWon: row.debates_won || 0,
        debatesLost: row.debates_lost || 0,
        debatesDraw: row.debates_draw || 0,
        avgArgumentStrength: parseFloat(row.avg_argument_strength) || 0,
        totalDebateTimeMinutes: row.total_debate_time_minutes || 0,
        currentStreak: row.streak_current || 0,
        bestStreak: row.streak_best || 0,
      },
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const updates: string[] = [];
    const values: QueryConfigValues<unknown[]> = [];
    let paramIndex = 1;

    if (input.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(input.displayName);
    }

    if (input.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(input.avatarUrl);
    }

    if (updates.length === 0) {
      return this.getProfile(userId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.getProfile(userId);
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const result = await db.query(
      `SELECT default_difficulty, default_debate_style, preferred_ai_provider,
              preferred_model, theme, notifications_enabled
       FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      await db.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
      return {
        defaultDifficulty: 'beginner',
        defaultDebateStyle: 'balanced',
        preferredAiProvider: 'ollama',
        preferredModel: null,
        theme: 'system',
        notificationsEnabled: true,
      };
    }

    const row = result.rows[0];
    return {
      defaultDifficulty: row.default_difficulty,
      defaultDebateStyle: row.default_debate_style,
      preferredAiProvider: row.preferred_ai_provider,
      preferredModel: row.preferred_model,
      theme: row.theme,
      notificationsEnabled: row.notifications_enabled,
    };
  }

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const updates: string[] = [];
    const values: QueryConfigValues<unknown[]> = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      defaultDifficulty: 'default_difficulty',
      defaultDebateStyle: 'default_debate_style',
      preferredAiProvider: 'preferred_ai_provider',
      preferredModel: 'preferred_model',
      theme: 'theme',
      notificationsEnabled: 'notifications_enabled',
    };

    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      values.push(userId);

      await db.query(
        `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
        values
      );
    }

    return this.getSettings(userId);
  }

  // API Key Management
  async getApiKeys(userId: string) {
    const result = await db.query(
      `SELECT id, provider, key_name, api_base_url, is_active, last_used, created_at
       FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      keyName: row.key_name,
      apiBaseUrl: row.api_base_url,
      isActive: row.is_active,
      lastUsed: row.last_used,
      createdAt: row.created_at,
    }));
  }

  async addApiKey(userId: string, input: ApiKeyInput) {
    const encryptedKey = encryptApiKey(input.apiKey);
    const keyName = input.keyName || `${input.provider} Key`;

    const result = await db.query(
      `INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_name, api_base_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, provider, key_name, api_base_url, is_active, created_at`,
      [userId, input.provider, encryptedKey, keyName, input.apiBaseUrl]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      provider: row.provider,
      keyName: row.key_name,
      apiBaseUrl: row.api_base_url,
      isActive: row.is_active,
      createdAt: row.created_at,
      maskedKey: maskApiKey(input.apiKey),
    };
  }

  async deleteApiKey(userId: string, keyId: string) {
    const result = await db.query(
      `DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2 RETURNING id`,
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('API key not found');
    }
  }

  async getDecryptedApiKey(userId: string, provider: string): Promise<{ key: string; baseUrl?: string } | null> {
    const result = await db.query(
      `SELECT encrypted_key, api_base_url FROM user_api_keys
       WHERE user_id = $1 AND provider = $2 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [userId, provider]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      key: decryptApiKey(result.rows[0].encrypted_key),
      baseUrl: result.rows[0].api_base_url,
    };
  }

  async deleteAccount(userId: string) {
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}

export const userService = new UserService();
