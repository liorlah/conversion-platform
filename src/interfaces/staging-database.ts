import { Logger } from '@utils/logger';
import { StagingDatabaseInterface, ColumnSchema } from './database-interface';
import { QueryResult } from '@models/types';
import { PostgresDatabasePool } from './postgres-pool';
import { DatabaseConfig } from '@models/types';

/**
 * PostgreSQL Staging Database Implementation
 * Provides read-write access for intermediate transformations
 */
export class PostgresStagingDatabase implements StagingDatabaseInterface {
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
        this.logger.info('Connected to staging database');
      } else {
        throw new Error('Staging database health check failed');
      }
    } catch (error) {
      this.logger.error('Failed to connect to staging database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.close();
      this.connected = false;
      this.logger.info('Disconnected from staging database');
    } catch (error) {
      this.logger.error('Error disconnecting from staging database', error);
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

  async insert(table: string, records: any[]): Promise<number> {
    this.ensureConnected();
    if (records.length === 0) return 0;

    const keys = Object.keys(records[0]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
    const columns = keys.join(',');

    let totalInserted = 0;

    for (const record of records) {
      const values = keys.map((k) => record[k]);
      const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
      const result = await this.query(sql, values);
      totalInserted += result.rowCount;
    }

    return totalInserted;
  }

  async update(
    table: string,
    records: any[],
    primaryKeyColumn: string
  ): Promise<number> {
    this.ensureConnected();
    if (records.length === 0) return 0;

    let totalUpdated = 0;

    for (const record of records) {
      const pkValue = record[primaryKeyColumn];
      const updateClauses = Object.entries(record)
        .filter(([key]) => key !== primaryKeyColumn)
        .map(([key, value], index) => `${key} = $${index + 1}`)
        .join(',');

      const values = Object.values(record).filter((_, i) => {
        const keys = Object.keys(record);
        return keys[i] !== primaryKeyColumn;
      });

      const sql = `UPDATE ${table} SET ${updateClauses} WHERE ${primaryKeyColumn} = $${values.length + 1}`;
      const result = await this.query(sql, [...values, pkValue]);
      totalUpdated += result.rowCount;
    }

    return totalUpdated;
  }

  async delete(table: string, whereClause: string): Promise<number> {
    this.ensureConnected();
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await this.query(sql);
    return result.rowCount;
  }

  async truncate(table: string): Promise<void> {
    this.ensureConnected();
    const sql = `TRUNCATE TABLE ${table} CASCADE`;
    await this.query(sql);
    this.logger.info(`Truncated table: ${table}`);
  }

  async createTable(table: string, schema: ColumnSchema[]): Promise<void> {
    this.ensureConnected();
    const columnDefs = schema
      .map((col) => {
        let def = `${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.primaryKey) def += ' PRIMARY KEY';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        return def;
      })
      .join(',');

    const sql = `CREATE TABLE IF NOT EXISTS ${table} (${columnDefs})`;
    await this.query(sql);
    this.logger.info(`Created table: ${table}`);
  }

  async dropTable(table: string): Promise<void> {
    this.ensureConnected();
    const sql = `DROP TABLE IF EXISTS ${table} CASCADE`;
    await this.query(sql);
    this.logger.info(`Dropped table: ${table}`);
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Staging database is not connected');
    }
  }
}
