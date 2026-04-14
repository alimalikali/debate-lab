import { db } from '../config/database';
import { NotFoundError } from '../middleware/error.middleware';
import { generateSlug, paginationHelper, createPaginatedResponse, PaginatedResponse } from '../utils/helpers';

interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  isPredefined: boolean;
  usageCount: number;
  createdAt: Date;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  color: string | null;
  topicCount: number;
}

interface CreateTopicInput {
  title: string;
  description: string;
  difficulty: string;
  categoryId?: string;
}

interface TopicFilters {
  categorySlug?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class TopicService {
  async getCategories(): Promise<Category[]> {
    const result = await db.query(
      `SELECT tc.id, tc.name, tc.slug, tc.description, tc.icon_name, tc.color,
              COUNT(dt.id)::int as topic_count
       FROM topic_categories tc
       LEFT JOIN debate_topics dt ON dt.category_id = tc.id AND dt.is_active = true
       WHERE tc.is_active = true
       GROUP BY tc.id
       ORDER BY tc.display_order`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      iconName: row.icon_name,
      color: row.color,
      topicCount: row.topic_count,
    }));
  }

  async getTopics(filters: TopicFilters): Promise<PaginatedResponse<Topic>> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const { offset } = paginationHelper(page, limit);

    let whereClause = 'WHERE dt.is_active = true';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.categorySlug) {
      whereClause += ` AND tc.slug = $${paramIndex++}`;
      params.push(filters.categorySlug);
    }

    if (filters.difficulty) {
      whereClause += ` AND dt.difficulty = $${paramIndex++}`;
      params.push(filters.difficulty);
    }

    if (filters.search) {
      whereClause += ` AND (dt.title ILIKE $${paramIndex} OR dt.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*)::int as total
       FROM debate_topics dt
       LEFT JOIN topic_categories tc ON tc.id = dt.category_id
       ${whereClause}`,
      params
    );
    const total = countResult.rows[0].total;

    // Get topics
    const result = await db.query(
      `SELECT dt.id, dt.title, dt.description, dt.difficulty, dt.is_predefined,
              dt.usage_count, dt.created_at,
              tc.id as category_id, tc.name as category_name, tc.slug as category_slug
       FROM debate_topics dt
       LEFT JOIN topic_categories tc ON tc.id = dt.category_id
       ${whereClause}
       ORDER BY dt.is_predefined DESC, dt.usage_count DESC, dt.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    const topics: Topic[] = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
          }
        : null,
      isPredefined: row.is_predefined,
      usageCount: row.usage_count,
      createdAt: row.created_at,
    }));

    return createPaginatedResponse(topics, page, limit, total);
  }

  async getTopic(topicId: string): Promise<Topic> {
    const result = await db.query(
      `SELECT dt.id, dt.title, dt.description, dt.difficulty, dt.is_predefined,
              dt.usage_count, dt.created_at,
              tc.id as category_id, tc.name as category_name, tc.slug as category_slug
       FROM debate_topics dt
       LEFT JOIN topic_categories tc ON tc.id = dt.category_id
       WHERE dt.id = $1`,
      [topicId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Topic not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
          }
        : null,
      isPredefined: row.is_predefined,
      usageCount: row.usage_count,
      createdAt: row.created_at,
    };
  }

  async createTopic(userId: string, input: CreateTopicInput): Promise<Topic> {
    const result = await db.query(
      `INSERT INTO debate_topics (title, description, difficulty, category_id, created_by, is_predefined)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id`,
      [input.title, input.description, input.difficulty, input.categoryId, userId]
    );

    return this.getTopic(result.rows[0].id);
  }

  async incrementUsageCount(topicId: string): Promise<void> {
    await db.query(
      'UPDATE debate_topics SET usage_count = usage_count + 1 WHERE id = $1',
      [topicId]
    );
  }

  async getTrendingTopics(limit: number = 5): Promise<Topic[]> {
    const result = await db.query(
      `SELECT dt.id, dt.title, dt.description, dt.difficulty, dt.is_predefined,
              dt.usage_count, dt.created_at,
              tc.id as category_id, tc.name as category_name, tc.slug as category_slug
       FROM debate_topics dt
       LEFT JOIN topic_categories tc ON tc.id = dt.category_id
       WHERE dt.is_active = true
       ORDER BY dt.usage_count DESC, dt.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
          }
        : null,
      isPredefined: row.is_predefined,
      usageCount: row.usage_count,
      createdAt: row.created_at,
    }));
  }
}

export const topicService = new TopicService();
