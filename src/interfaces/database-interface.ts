import { Connection, QueryResult, PaginatedResult } from '@models/types';

/**
 * Base interface for database connectivity
 */
export interface DatabaseConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnection(): Promise<Connection>;
  releaseConnection(connection: Connection): Promise<void>;
  health(): Promise<boolean>;
}

/**
 * Source Database Interface
 * Provides read-only access to source data
 */
export interface SourceDatabaseInterface extends DatabaseConnector {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  
  queryWithPagination(
    sql: string,
    params: any[],
    offset: number,
    limit: number
  ): Promise<PaginatedResult>;
  
  streamQuery(
    sql: string,
    batchSize: number,
    params?: any[]
  ): AsyncIterator<any>;
  
  count(table: string, whereClause?: string): Promise<number>;
  
  getTableSchema(table: string): Promise<ColumnSchema[]>;
}

/**
 * Staging Database Interface
 * Provides read-write access for intermediate transformations
 */
export interface StagingDatabaseInterface extends DatabaseConnector {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  
  insert(table: string, records: any[]): Promise<number>;
  
  update(
    table: string,
    records: any[],
    primaryKeyColumn: string
  ): Promise<number>;
  
  delete(table: string, whereClause: string): Promise<number>;
  
  truncate(table: string): Promise<void>;
  
  createTable(table: string, schema: ColumnSchema[]): Promise<void>;
  
  dropTable(table: string): Promise<void>;
}

/**
 * Target Database Interface
 * Provides write operations for migrated data
 */
export interface TargetDatabaseInterface extends DatabaseConnector {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  
  insert(table: string, records: any[]): Promise<number>;
  
  upsert(
    table: string,
    records: any[],
    uniqueKeyColumns: string[]
  ): Promise<{ inserted: number; updated: number }>;
  
  update(
    table: string,
    records: any[],
    primaryKeyColumn: string
  ): Promise<number>;
  
  delete(table: string, whereClause: string): Promise<number>;
  
  beginTransaction(): Promise<TargetTransaction>;
}

/**
 * Target Database Transaction
 */
export interface TargetTransaction extends Connection {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Column schema information
 */
export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
}
