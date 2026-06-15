import { Logger } from '@utils/logger';
import { TargetDatabaseInterface, TargetTransaction } from './database-interface';
import { QueryResult } from '@models/types';
import { PostgresDatabasePool } from './postgres-pool';
import { DatabaseConfig } from '@models/types';

/**
 * PostgreSQL Target Database Implementation
 * Provides write operations for migrated data
 */
export class PostgresTargetDatabase implements TargetDatabaseInterface {
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
        this.logger.info('Connected to target database');
      } else {
        throw new Error('Target database health check failed');
      }
    } catch (error) {
      this.logger.error('Failed to connect to target database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.close();
      this.connected = false;
      this.logger.info('Disconnected from target database');
    } catch (error) {
      this.logger.error('Error disconnecting from target database', error);
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
    const batchSize = 100;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const valuesClauses = batch
        .map((_, idx) => `(${keys.map((_, j) => `$${idx * keys.length + j + 1}`).join(',')})`)
        .join(',');

      const flatValues = batch.flatMap((r) => keys.map((k) => r[k]));
      const sql = `INSERT INTO ${table} (${columns}) VALUES ${valuesClauses}`;
      const result = await this.query(sql, flatValues);
      totalInserted += result.rowCount;
    }

    return totalInserted;
  }

  async upsert(
    table: string,
    records: any[],
    uniqueKeyColumns: string[]
  ): Promise<{ inserted: number; updated: number }> {
    this.ensureConnected();
    if (records.length === 0) return { inserted: 0, updated: 0 };

    let inserted = 0;
    let updated = 0;

    for (const record of records) {
      const keys = Object.keys(record);
      const values = keys.map((k) => record[k]);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
      const updateClauses = keys
        .filter((k) => !uniqueKeyColumns.includes(k))
        .map((k, i) => `${k} = $${i + 1 + uniqueKeyColumns.length}`)
        .join(',');
      const conflictClause = `ON CONFLICT (${uniqueKeyColumns.join(',')}) DO UPDATE SET ${updateClauses}`;

      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders}) ${conflictClause}`;
      const result = await this.query(sql, [...values, ...values.filter((_, i) => !uniqueKeyColumns.includes(keys[i]))]);
      
      if (result.rowCount > 0) {
        inserted++;
      }
    }

    return { inserted, updated };
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

  async beginTransaction(): Promise<TargetTransaction> {
    this.ensureConnected();
    const connection = await this.getConnection();
    await connection.beginTransaction();
    return connection as any;
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Target database is not connected');
    }
  }
}
