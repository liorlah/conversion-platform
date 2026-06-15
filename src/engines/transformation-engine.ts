import { StagingDatabaseInterface } from '@interfaces/database-interface';
import { Logger } from '@utils/logger';
import { SchemaMapping, Record } from '@models/types';
import { FieldMapper } from '@mappers/field-mapper';
import { TranslationMapper } from '@mappers/translation-mapper';

/**
 * Transformation Engine
 * Applies field mappings, translations, and business logic
 */
export class TransformationEngine {
  private stagingDb: StagingDatabaseInterface;
  private logger: Logger;
  private fieldMapper: FieldMapper;
  private translationMapper: TranslationMapper;

  constructor(
    stagingDb: StagingDatabaseInterface,
    logger: Logger,
    fieldMapper: FieldMapper,
    translationMapper: TranslationMapper
  ) {
    this.stagingDb = stagingDb;
    this.logger = logger.constructor === Logger ? logger : new Logger('TransformationEngine');
    this.fieldMapper = fieldMapper;
    this.translationMapper = translationMapper;
  }

  /**
   * Transform raw staged data
   */
  async transform(
    jobId: string,
    mapping: SchemaMapping,
    batchSize: number = 1000
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalTransformed = 0;
    const errors: any[] = [];

    try {
      this.logger.info(`Starting transformation for job ${jobId}`, {
        mapping: mapping.id,
      });

      // Fetch raw records from staging
      const result = await this.stagingDb.query(`SELECT * FROM ${mapping.sourceTable} LIMIT 1000000`);
      const records = result.rows;

      // Process in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const transformedBatch: Record[] = [];

        for (const record of batch) {
          try {
            // Apply field mappings
            let transformed = await this.fieldMapper.map(record, mapping.fieldMappings);
            
            // Apply translation mappings
            transformed = await this.translationMapper.map(transformed, mapping.fieldMappings);
            
            // Apply custom logic if provided
            if (mapping.customLogic) {
              transformed = await mapping.customLogic(transformed);
            }

            transformedBatch.push(transformed);
            totalProcessed++;
          } catch (error) {
            this.logger.error('Error transforming record', error);
            errors.push({ record, error });
          }
        }

        // Stage transformed records
        if (transformedBatch.length > 0) {
          await this.stagingDb.insert(mapping.targetTable, transformedBatch);
          totalTransformed += transformedBatch.length;
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info(`Transformation completed for job ${jobId}`, {
        totalProcessed,
        totalTransformed,
        duration,
        errors: errors.length,
      });

      return {
        jobId,
        recordsProcessed: totalProcessed,
        recordsTransformed: totalTransformed,
        duration,
        status: errors.length === 0 ? 'success' : 'partial_success',
        errors,
      };
    } catch (error) {
      this.logger.error(`Transformation failed for job ${jobId}`, error);
      throw error;
    }
  }
}

export interface TransformationResult {
  jobId: string;
  recordsProcessed: number;
  recordsTransformed: number;
  duration: number;
  status: 'success' | 'partial_success' | 'failed';
  errors: any[];
}
