import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { generateTokenPair, hashRefreshToken, getRefreshTokenExpiry, TokenPair } from '../utils/jwt';
import { UserPayload } from '../types/express';
import { ConflictError, AuthenticationError, NotFoundError } from '../middleware/error.middleware';

interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  tokens: TokenPair;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, username, password, displayName } = input;

    // Check if email already exists
    const emailExists = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailExists.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    // Check if username already exists
    const usernameExists = await db.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (usernameExists.rows.length > 0) {
      throw new ConflictError('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, display_name, avatar_url`,
      [email.toLowerCase(), username.toLowerCase(), passwordHash, displayName || username]
    );

    const user = result.rows[0];

    // Create user settings with defaults
    await db.query(
      `INSERT INTO user_settings (user_id) VALUES ($1)`,
      [user.id]
    );

    // Create user stats
    await db.query(
      `INSERT INTO user_stats (user_id) VALUES ($1)`,
      [user.id]
    );

    // Generate tokens
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    const tokens = generateTokenPair(payload);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user
    const result = await db.query(
      `SELECT id, email, username, password_hash, display_name, avatar_url
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate tokens
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    const tokens = generateTokenPair(payload);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(refreshToken);

    // Find and validate refresh token
    const result = await db.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
              u.email, u.username
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const storedToken = result.rows[0];

    if (storedToken.revoked_at) {
      throw new AuthenticationError('Refresh token has been revoked');
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      throw new AuthenticationError('Refresh token has expired');
    }

    // Revoke old token
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [storedToken.id]
    );

    // Generate new tokens
    const payload: UserPayload = {
      id: storedToken.user_id,
      email: storedToken.email,
      username: storedToken.username,
    };

    const tokens = generateTokenPair(payload);

    // Store new refresh token
    await this.storeRefreshToken(storedToken.user_id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  }

  async getUser(userId: string) {
    const result = await db.query(
      `SELECT id, email, username, display_name, avatar_url, created_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = hashRefreshToken(token);
    const expiresAt = getRefreshTokenExpiry();

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    // Clean up old tokens for this user (keep last 5)
    await db.query(
      `DELETE FROM refresh_tokens
       WHERE user_id = $1
       AND id NOT IN (
         SELECT id FROM refresh_tokens
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 5
       )`,
      [userId]
    );
  }
}

export const authService = new AuthService();
