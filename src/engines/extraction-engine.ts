import { SourceDatabaseInterface } from '@interfaces/database-interface';
import { StagingDatabaseInterface } from '@interfaces/database-interface';
import { Logger } from '@utils/logger';
import { ConversionConfig, Record } from '@models/types';

/**
 * Extraction Engine
 * Responsible for extracting data from source database and staging it
 */
export class ExtractionEngine {
  private sourceDb: SourceDatabaseInterface;
  private stagingDb: StagingDatabaseInterface;
  private logger: Logger;

  constructor(
    sourceDb: SourceDatabaseInterface,
    stagingDb: StagingDatabaseInterface,
    logger: Logger
  ) {
    this.sourceDb = sourceDb;
    this.stagingDb = stagingDb;
    this.logger = logger.constructor === Logger ? logger : new Logger('ExtractionEngine');
  }

  /**
   * Extract data from source and stage it
   */
  async extract(
    jobId: string,
    sourceTable: string,
    stagingTable: string,
    query: string,
    config: ConversionConfig,
    whereClause?: string
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    let totalExtracted = 0;
    let totalStaged = 0;
    const errors: any[] = [];

    try {
      this.logger.info(`Starting extraction for job ${jobId}`, {
        sourceTable,
        stagingTable,
      });

      // Truncate staging table
      await this.stagingDb.truncate(stagingTable);

      // Stream data in batches
      const fullQuery = whereClause ? `${query} WHERE ${whereClause}` : query;
      
      for await (const batch of this.sourceDb.streamQuery(
        fullQuery,
        config.batchSize
      )) {
        try {
          const records = Array.isArray(batch) ? batch : [batch];
          await this.stagingDb.insert(stagingTable, records);
          totalExtracted += records.length;
          totalStaged += records.length;
          
          this.logger.info(`Extracted batch of ${records.length} records`);
        } catch (error) {
          this.logger.error('Error staging batch', error);
          errors.push(error);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(`Extraction completed for job ${jobId}`, {
        totalExtracted,
        totalStaged,
        duration,
        errors: errors.length,
      });

      return {
        jobId,
        recordsExtracted: totalExtracted,
        recordsStaged: totalStaged,
        duration,
        status: errors.length === 0 ? 'success' : 'partial_success',
        errors,
      };
    } catch (error) {
      this.logger.error(`Extraction failed for job ${jobId}`, error);
      throw error;
    }
  }
}

export interface ExtractionResult {
  jobId: string;
  recordsExtracted: number;
  recordsStaged: number;
  duration: number;
  status: 'success' | 'partial_success' | 'failed';
  errors: any[];
}
