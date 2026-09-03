import { Pool, PoolClient, QueryResult, QueryResultRow, QueryConfigValues } from 'pg';
import { env } from './env';

const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: QueryConfigValues<unknown[]>): Promise<QueryResult<T>> => {
    return pool.query<T>(text, params);
  },

  getClient: (): Promise<PoolClient> => {
    return pool.connect();
  },

  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  end: (): Promise<void> => {
    return pool.end();
  },
};

export async function testConnection(): Promise<boolean> {
  try {
    const result = await db.query('SELECT NOW()');
    console.log('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
