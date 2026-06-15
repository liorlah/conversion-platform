import { FieldMapping, Record } from '@models/types';

/**
 * Field Mapper
 * Maps source fields to target fields with optional transformations
 */
export class FieldMapper {
  /**
   * Apply field mappings to a record
   */
  async map(record: Record, mappings: FieldMapping[]): Promise<Record> {
    const result: Record = {};

    for (const mapping of mappings) {
      const sourceValue = record[mapping.sourceField];

      // Check if field is required
      if (mapping.required && (sourceValue === null || sourceValue === undefined)) {
        throw new Error(
          `Required field ${mapping.sourceField} is missing or null`
        );
      }

      // Use default value if provided and source is null/undefined
      let targetValue = sourceValue;
      if ((sourceValue === null || sourceValue === undefined) && mapping.defaultValue !== undefined) {
        targetValue = mapping.defaultValue;
      }

      // Apply transformation
      if (mapping.transform) {
        if (typeof mapping.transform === 'string') {
          targetValue = this.applyBuiltInTransform(targetValue, mapping.transform);
        } else if (typeof mapping.transform === 'function') {
          targetValue = await mapping.transform(targetValue);
        }
      }

      result[mapping.targetField] = targetValue;
    }

    return result;
  }

  /**
   * Apply built-in transformations
   */
  private applyBuiltInTransform(value: any, transform: string): any {
    if (value === null || value === undefined) return value;

    switch (transform) {
      case 'toNumber':
        return Number(value);
      case 'toString':
        return String(value);
      case 'toUpperCase':
        return String(value).toUpperCase();
      case 'toLowerCase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'toDate':
        return new Date(value);
      case 'toISOString':
        return new Date(value).toISOString();
      default:
        return value;
    }
  }
}
