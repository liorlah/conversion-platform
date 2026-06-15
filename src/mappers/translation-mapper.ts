import { FieldMapping, Record } from '@models/types';

/**
 * Translation Mapper
 * Maps source enum/lookup values to target values using translation tables
 */
export class TranslationMapper {
  private translationCache: Map<string, Map<string, string>> = new Map();

  /**
   * Apply translation mappings (lookup table joins)
   */
  async map(record: Record, mappings: FieldMapping[]): Promise<Record> {
    const result = { ...record };

    for (const mapping of mappings) {
      if (mapping.lookupTable && mapping.lookupSourceColumn && mapping.lookupTargetColumn) {
        const sourceValue = record[mapping.sourceField];

        if (sourceValue !== null && sourceValue !== undefined) {
          // Translate the value
          const translatedValue = await this.translateValue(
            mapping.lookupTable,
            mapping.lookupSourceColumn,
            mapping.lookupTargetColumn,
            sourceValue
          );

          result[mapping.targetField] = translatedValue || sourceValue;
        }
      }
    }

    return result;
  }

  /**
   * Translate a single value using lookup table
   */
  async translateValue(
    lookupTable: string,
    sourceColumn: string,
    targetColumn: string,
    sourceValue: any
  ): Promise<any> {
    const cacheKey = `${lookupTable}:${sourceColumn}:${targetColumn}`;

    // Check cache
    if (!this.translationCache.has(cacheKey)) {
      // Load translation table into cache
      // This would normally query the database
      this.translationCache.set(cacheKey, new Map());
    }

    const translations = this.translationCache.get(cacheKey)!;
    return translations.get(String(sourceValue));
  }

  /**
   * Load translation table into memory cache
   */
  async loadTranslationTable(
    lookupTable: string,
    sourceColumn: string,
    targetColumn: string,
    translations: Array<{ [key: string]: any }>
  ): Promise<void> {
    const cacheKey = `${lookupTable}:${sourceColumn}:${targetColumn}`;
    const map = new Map<string, string>();

    for (const row of translations) {
      map.set(String(row[sourceColumn]), row[targetColumn]);
    }

    this.translationCache.set(cacheKey, map);
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
  }
}
