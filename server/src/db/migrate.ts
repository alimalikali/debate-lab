import { db } from '../config/database';

const migrations = [
  // Enable UUID extension
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE
  );`,

  // User settings table
  `CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    default_difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (default_difficulty IN ('beginner', 'intermediate', 'expert')),
    default_debate_style VARCHAR(20) DEFAULT 'balanced' CHECK (default_debate_style IN ('aggressive', 'balanced', 'socratic')),
    preferred_ai_provider VARCHAR(50) DEFAULT 'ollama',
    preferred_model VARCHAR(100),
    theme VARCHAR(20) DEFAULT 'system',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
  );`,

  // User API keys table
  `CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'groq', 'openai_compatible')),
    encrypted_key TEXT NOT NULL,
    key_name VARCHAR(100),
    api_base_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider, key_name)
  );`,

  // Refresh tokens table
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
  );`,

  // Topic categories table
  `CREATE TABLE IF NOT EXISTS topic_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50),
    color VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Debate topics table
  `CREATE TABLE IF NOT EXISTS debate_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
    category_id UUID REFERENCES topic_categories(id) ON DELETE SET NULL,
    is_predefined BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Debates table
  `CREATE TABLE IF NOT EXISTS debates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES debate_topics(id) ON DELETE SET NULL,
    custom_topic_title VARCHAR(255),
    custom_topic_description TEXT,
    user_position TEXT,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'expert')),
    debate_style VARCHAR(20) NOT NULL DEFAULT 'balanced' CHECK (debate_style IN ('aggressive', 'balanced', 'socratic')),
    ai_provider VARCHAR(50) NOT NULL DEFAULT 'ollama',
    ai_model VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Messages table
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('human', 'ai', 'system')),
    content TEXT NOT NULL,
    sentiment VARCHAR(20) CHECK (sentiment IN ('neutral', 'angry', 'logical', 'empathetic', 'sarcastic')),
    tokens_used INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Debate stats table
  `CREATE TABLE IF NOT EXISTS debate_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE UNIQUE,
    argument_strength DECIMAL(3,1) DEFAULT 5.0 CHECK (argument_strength >= 0 AND argument_strength <= 10),
    logical_score DECIMAL(3,1) DEFAULT 5.0 CHECK (logical_score >= 0 AND logical_score <= 10),
    persuasive_score DECIMAL(3,1) DEFAULT 5.0 CHECK (persuasive_score >= 0 AND persuasive_score <= 10),
    fallacies_detected INTEGER DEFAULT 0,
    total_user_messages INTEGER DEFAULT 0,
    total_ai_messages INTEGER DEFAULT 0,
    avg_response_length INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    outcome VARCHAR(20) CHECK (outcome IN ('won', 'lost', 'draw', 'incomplete')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Debate summaries table
  `CREATE TABLE IF NOT EXISTS debate_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE UNIQUE,
    summary_text TEXT NOT NULL,
    key_arguments_user JSONB,
    key_arguments_ai JSONB,
    strengths JSONB,
    areas_for_improvement JSONB,
    final_evaluation TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Debate fallacies table (stores real-time detected fallacies)
  `CREATE TABLE IF NOT EXISTS debate_fallacies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    fallacy_type VARCHAR(50) NOT NULL,
    fallacy_name VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'major')),
    description TEXT NOT NULL,
    quote TEXT,
    suggestion TEXT,
    argument_strength INTEGER CHECK (argument_strength >= 1 AND argument_strength <= 10),
    logical_soundness INTEGER CHECK (logical_soundness >= 1 AND logical_soundness <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // User stats table
  `CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_debates INTEGER DEFAULT 0,
    debates_won INTEGER DEFAULT 0,
    debates_lost INTEGER DEFAULT 0,
    debates_draw INTEGER DEFAULT 0,
    avg_argument_strength DECIMAL(3,1) DEFAULT 0,
    total_debate_time_minutes INTEGER DEFAULT 0,
    favorite_category_id UUID REFERENCES topic_categories(id),
    streak_current INTEGER DEFAULT 0,
    streak_best INTEGER DEFAULT 0,
    last_debate_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
  `CREATE INDEX IF NOT EXISTS idx_debates_user_id ON debates(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);`,
  `CREATE INDEX IF NOT EXISTS idx_debates_created_at ON debates(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_debate_id ON messages(debate_id);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_debate_topics_category ON debate_topics(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_debate_fallacies_debate ON debate_fallacies(debate_id);`,
  `CREATE INDEX IF NOT EXISTS idx_debate_fallacies_message ON debate_fallacies(message_id);`,
];

async function migrate(): Promise<void> {
  console.log('Starting database migration...');

  for (const migration of migrations) {
    try {
      await db.query(migration);
      console.log('✓ Migration executed successfully');
    } catch (error) {
      console.error('✗ Migration failed:', error);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
  await db.end();
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
