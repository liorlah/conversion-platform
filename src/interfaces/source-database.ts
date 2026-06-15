import { Logger } from '@utils/logger';
import { SourceDatabaseInterface, ColumnSchema } from './database-interface';
import { QueryResult, PaginatedResult } from '@models/types';
import { PostgresDatabasePool } from './postgres-pool';
import { DatabaseConfig } from '@models/types';

/**
 * PostgreSQL Source Database Implementation
 * Read-only interface to source data
 */
export class PostgresSourceDatabase implements SourceDatabaseInterface {
  private pool: PostgresDatabasePool;
  private logger: Logger;
  private connected: boolean = false;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.logger = logger;
    this.pool = new PostgresDatabasePool(config, logger);
  }

  async connect(): Promise<void> {
    try {
      const isHealthy = await this.pool.health();
      if (isHealthy) {
        this.connected = true;
        this.logger.info('Connected to source database');
      } else {
        throw new Error('Source database health check failed');
      }
    } catch (error) {
      this.logger.error('Failed to connect to source database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.close();
      this.connected = false;
      this.logger.info('Disconnected from source database');
    } catch (error) {
      this.logger.error('Error disconnecting from source database', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getConnection() {
    return this.pool.getConnection();
  }

  async releaseConnection(connection: any): Promise<void> {
    await connection.close();
  }

  async health(): Promise<boolean> {
    return this.pool.health();
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    this.ensureConnected();
    return this.pool.query(sql, params);
  }

  async queryWithPagination(
    sql: string,
    params: any[],
    offset: number,
    limit: number
  ): Promise<PaginatedResult> {
    this.ensureConnected();
    return this.pool.queryWithPagination(sql, params, offset, limit);
  }

  async *streamQuery(
    sql: string,
    batchSize: number,
    params?: any[]
  ): AsyncIterator<any> {
    this.ensureConnected();
    yield* this.pool.streamQuery(sql, batchSize, params);
  }

  async count(table: string, whereClause?: string): Promise<number> {
    this.ensureConnected();
    const sql = whereClause
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`
      : `SELECT COUNT(*) as count FROM ${table}`;

    const result = await this.query(sql);
    return result.rows[0]?.count || 0;
  }

  async getTableSchema(table: string): Promise<ColumnSchema[]> {
    this.ensureConnected();
    const sql = `
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable,
        column_name IN (
          SELECT a.attname FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid
          WHERE i.indrelname = '${table}_pkey'
        ) as "primaryKey"
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const result = await this.query(sql, [table]);
    return result.rows;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Source database is not connected');
    }
  }
}
