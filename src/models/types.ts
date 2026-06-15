/**
 * Type Definitions for Conversion Platform
 */

// Database Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  timeout?: number;
}

// Connection Types
export interface Connection {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  beginTransaction(): Promise<Transaction>;
  close(): Promise<void>;
}

export interface Transaction extends Connection {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface QueryResult {
  rows: Record[];
  rowCount: number;
}

export interface PaginatedResult extends QueryResult {
  hasMore: boolean;
  offset: number;
  limit: number;
}

// Mapping Types
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string | ((value: any) => any);
  required?: boolean;
  defaultValue?: any;
  lookupTable?: string;
  lookupSourceColumn?: string;
  lookupTargetColumn?: string;
}

export interface SchemaMapping {
  id: string;
  sourceTable: string;
  targetTable: string;
  primaryKey: string;
  fieldMappings: FieldMapping[];
  validationRules?: ValidationRule[];
  customLogic?: (record: Record) => Promise<Record>;
}

// Validation Types
export interface ValidationRule {
  name: string;
  level: 'source' | 'staging' | 'target';
  table: string;
  field?: string;
  rule: string;
  pattern?: string;
  condition?: (record: Record) => boolean | Promise<boolean>;
  errorMessage?: (record: Record) => string;
  severity?: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  record: Record;
  field: string;
  rule: string;
  message: string;
  value: any;
}

export interface ValidationWarning {
  record: Record;
  field: string;
  message: string;
}

// Conversion Job Types
export interface ConversionJob {
  jobId: string;
  name: string;
  sourceTable: string;
  targetTable: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  config: ConversionConfig;
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ConversionConfig {
  batchSize: number;
  checkpointInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableTransactions: boolean;
  timeoutMs: number;
  incremental: boolean;
  lastProcessedId?: string;
}

// Result Types
export interface ConversionResult {
  jobId: string;
  status: 'success' | 'partial_success' | 'failed';
  recordsExtracted: number;
  recordsTransformed: number;
  recordsLoaded: number;
  recordsFailed: number;
  duration: number;
  successRate: number;
  errors: ConversionError[];
  metrics: ConversionMetrics;
  warnings: string[];
}

export interface ConversionError {
  recordId: string;
  error: string;
  stack?: string;
  category: ErrorCategory;
  timestamp: Date;
}

export enum ErrorCategory {
  EXTRACTION_ERROR = 'extraction_error',
  TRANSFORMATION_ERROR = 'transformation_error',
  VALIDATION_ERROR = 'validation_error',
  LOADING_ERROR = 'loading_error',
  CONNECTION_ERROR = 'connection_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface ConversionMetrics {
  stage: 'extraction' | 'transformation' | 'loading';
  startTime: Date;
  endTime: Date;
  durationMs: number;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  successRate: number;
  throughputRecordsPerSecond: number;
  averageRecordProcessingTimeMs: number;
  validationPassRate: number;
  dataQualityScore: number;
}

// Audit Types
export interface AuditRecord {
  id: string;
  jobId: string;
  timestamp: Date;
  action: string;
  sourceId: string;
  targetId?: string;
  details: Record;
}

export interface LineageRecord {
  id: string;
  jobId: string;
  sourceTable: string;
  sourceId: string;
  stagingId: string;
  targetTable: string;
  targetId: string;
  transformationApplied: string;
  status: 'success' | 'failed';
  createdAt: Date;
}

// State Management Types
export interface ConversionJobState {
  jobId: string;
  status: JobStatus;
  stage: 'extraction' | 'transformation' | 'loading' | 'validation';
  progress: {
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
  };
  lastCheckpoint?: CheckpointData;
  startedAt: Date;
  updatedAt: Date;
}

export interface CheckpointData {
  checkpointId: string;
  jobId: string;
  stage: string;
  timestamp: Date;
  lastProcessedId: string;
  recordsProcessed: number;
  stagingCursor?: any;
  duration: number;
  successCount: number;
  errorCount: number;
}

// Translation Types
export interface TranslationMapping {
  sourceSystem: string;
  sourceValue: string;
  targetValue: string;
  validFrom: Date;
  validTo?: Date;
}

// Configuration Types
export interface MappingConfig {
  version: string;
  metadata: {
    name: string;
    description: string;
    createdBy: string;
    lastModified: Date;
  };
  transformations: SchemaMapping[];
}

// Generic Record Type
export type Record = {
  [key: string]: any;
};
