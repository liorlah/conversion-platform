import { SourceDatabaseInterface, StagingDatabaseInterface, TargetDatabaseInterface } from '@interfaces/database-interface';
import { Logger } from '@utils/logger';
import { ConversionResult, ConversionConfig, JobStatus, ConversionJobState } from '@models/types';
import { SchemaMapping } from '@models/types';
import { ExtractionEngine } from './extraction-engine';
import { TransformationEngine } from './transformation-engine';
import { LoadingEngine } from './loading-engine';
import { FieldMapper } from '@mappers/field-mapper';
import { TranslationMapper } from '@mappers/translation-mapper';
import { StateManager } from '@state/state-manager';
import { AuditLogger } from '@audit/audit-logger';
import { v4 as uuid } from 'uuid';

/**
 * Conversion Orchestrator
 * Manages the end-to-end ETL pipeline
 */
export class ConversionOrchestrator {
  private sourceDb: SourceDatabaseInterface;
  private stagingDb: StagingDatabaseInterface;
  private targetDb: TargetDatabaseInterface;
  private extractionEngine: ExtractionEngine;
  private transformationEngine: TransformationEngine;
  private loadingEngine: LoadingEngine;
  private stateManager: StateManager;
  private auditLogger: AuditLogger;
  private logger: Logger;

  constructor(
    sourceDb: SourceDatabaseInterface,
    stagingDb: StagingDatabaseInterface,
    targetDb: TargetDatabaseInterface,
    stateManager: StateManager,
    auditLogger: AuditLogger,
    logger: Logger
  ) {
    this.sourceDb = sourceDb;
    this.stagingDb = stagingDb;
    this.targetDb = targetDb;
    this.stateManager = stateManager;
    this.auditLogger = auditLogger;
    this.logger = logger;

    // Initialize engines
    const fieldMapper = new FieldMapper();
    const translationMapper = new TranslationMapper();

    this.extractionEngine = new ExtractionEngine(sourceDb, stagingDb, logger);
    this.transformationEngine = new TransformationEngine(
      stagingDb,
      logger,
      fieldMapper,
      translationMapper
    );
    this.loadingEngine = new LoadingEngine(stagingDb, targetDb, logger);
  }

  /**
   * Execute complete conversion pipeline
   */
  async executeConversion(
    sourceTable: string,
    targetTable: string,
    mapping: SchemaMapping,
    config: ConversionConfig
  ): Promise<ConversionResult> {
    const jobId = uuid();
    const startTime = Date.now();

    try {
      // Initialize job state
      const jobState: ConversionJobState = {
        jobId,
        status: JobStatus.RUNNING,
        stage: 'extraction',
        progress: {
          totalRecords: 0,
          processedRecords: 0,
          successfulRecords: 0,
          failedRecords: 0,
        },
        startedAt: new Date(),
        updatedAt: new Date(),
      };

      await this.stateManager.saveState(jobId, jobState);

      this.logger.info(`Starting conversion pipeline: ${jobId}`);

      // Stage 1: Extraction
      this.logger.info('Stage 1: Extraction starting...');
      const extractionQuery = `SELECT * FROM ${sourceTable}`;
      const extractionResult = await this.extractionEngine.extract(
        jobId,
        sourceTable,
        `${mapping.sourceTable}_raw`,
        extractionQuery,
        config
      );

      if (extractionResult.status === 'failed') {
        throw new Error(`Extraction failed: ${extractionResult.errors.length} errors`);
      }

      jobState.stage = 'transformation';
      jobState.progress.totalRecords = extractionResult.recordsExtracted;
      await this.stateManager.saveState(jobId, jobState);

      // Stage 2: Transformation
      this.logger.info('Stage 2: Transformation starting...');
      const transformationResult = await this.transformationEngine.transform(
        jobId,
        mapping,
        config.batchSize
      );

      if (transformationResult.status === 'failed') {
        throw new Error(`Transformation failed: ${transformationResult.errors.length} errors`);
      }

      jobState.stage = 'loading';
      jobState.progress.processedRecords = transformationResult.recordsTransformed;
      await this.stateManager.saveState(jobId, jobState);

      // Stage 3: Loading
      this.logger.info('Stage 3: Loading starting...');
      const loadingResult = await this.loadingEngine.load(
        jobId,
        mapping.targetTable,
        config,
        [mapping.primaryKey]
      );

      if (loadingResult.status === 'failed') {
        throw new Error(`Loading failed: ${loadingResult.errors.length} errors`);
      }

      // Mark job as completed
      jobState.status = JobStatus.COMPLETED;
      jobState.progress.successfulRecords = loadingResult.recordsLoaded;
      jobState.progress.failedRecords = loadingResult.errors.length;
      jobState.updatedAt = new Date();
      await this.stateManager.saveState(jobId, jobState);

      const duration = Date.now() - startTime;
      const successRate =
        loadingResult.recordsLoaded /
        (loadingResult.recordsLoaded + loadingResult.errors.length);

      // Log audit record
      await this.auditLogger.logConversion(jobId, {
        sourceTable,
        targetTable,
        recordsProcessed: loadingResult.recordsLoaded,
        status: 'success',
        duration,
      });

      this.logger.info(`Conversion completed successfully: ${jobId}`, {
        duration,
        recordsLoaded: loadingResult.recordsLoaded,
      });

      return {
        jobId,
        status: 'success',
        recordsExtracted: extractionResult.recordsExtracted,
        recordsTransformed: transformationResult.recordsTransformed,
        recordsLoaded: loadingResult.recordsLoaded,
        recordsFailed: loadingResult.errors.length,
        duration,
        successRate,
        errors: loadingResult.errors,
        metrics: {
          stage: 'loading',
          startTime: new Date(startTime),
          endTime: new Date(),
          durationMs: duration,
          recordsProcessed: loadingResult.recordsLoaded,
          recordsSucceeded: loadingResult.recordsLoaded,
          recordsFailed: loadingResult.errors.length,
          successRate,
          throughputRecordsPerSecond: (loadingResult.recordsLoaded / duration) * 1000,
          averageRecordProcessingTimeMs: duration / loadingResult.recordsLoaded,
          validationPassRate: 100,
          dataQualityScore: 100,
        },
        warnings: [],
      };
    } catch (error) {
      const jobState = await this.stateManager.getState(jobId);
      if (jobState) {
        jobState.status = JobStatus.FAILED;
        await this.stateManager.saveState(jobId, jobState);
      }

      this.logger.error(`Conversion failed: ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Resume a paused conversion from checkpoint
   */
  async resumeConversion(jobId: string): Promise<ConversionResult> {
    const state = await this.stateManager.getState(jobId);
    if (!state) {
      throw new Error(`No state found for job ${jobId}`);
    }

    this.logger.info(`Resuming conversion from checkpoint: ${jobId}`);
    // Implementation would load from checkpoint and continue
    throw new Error('Resume not yet implemented');
  }

  /**
   * Get conversion job status
   */
  async getStatus(jobId: string): Promise<ConversionJobState | null> {
    return this.stateManager.getState(jobId);
  }
}
