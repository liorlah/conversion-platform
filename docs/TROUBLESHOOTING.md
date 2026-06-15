# Troubleshooting Guide

## Common Issues & Solutions

### Connection Issues

#### Problem: "Unable to connect to source database"

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Verify database is running
   ```bash
   psql -h localhost -U postgres -d source_db
   ```

2. Check firewall rules
   ```bash
   telnet localhost 5432
   ```

3. Verify credentials in .env file
   ```bash
   echo $SOURCE_DB_PASSWORD
   ```

4. Check pool settings
   ```typescript
   const config = {
     poolSize: 10,
     timeout: 30000  // Increase if network is slow
   };
   ```

### Performance Issues

#### Problem: "Conversion taking too long"

**Solutions:**

1. Increase batch size
   ```typescript
   const config = { batchSize: 5000 };  // Increase from 1000
   ```

2. Enable parallel processing
   ```typescript
   // Process multiple tables in parallel
   await Promise.all([
     orchestrator.executeConversion(...),
     orchestrator.executeConversion(...)
   ]);
   ```

3. Add database indexes
   ```sql
   CREATE INDEX idx_status ON customers(status);
   CREATE INDEX idx_created_date ON customers(created_date);
   ```

4. Monitor resource usage
   ```bash
   # CPU
   top
   
   # Memory
   free -h
   
   # Disk I/O
   iostat -x 1
   ```

### Memory Issues

#### Problem: "JavaScript heap out of memory"

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solutions:**

1. Reduce batch size
   ```typescript
   const config = { batchSize: 1000 };  // Reduce from 5000
   ```

2. Enable streaming for large datasets
   ```typescript
   for await (const record of sourceDb.streamQuery(sql, 500)) {
     // Process one record at a time
   }
   ```

3. Increase Node.js heap size
   ```bash
   node --max-old-space-size=4096 src/index.ts
   ```

4. Profile memory usage
   ```bash
   node --inspect src/index.ts
   # Open chrome://inspect in Chrome DevTools
   ```

### Data Quality Issues

#### Problem: "High number of validation failures"

**Solutions:**

1. Review mapping configuration
   ```typescript
   // Check field mappings are correct
   console.log(mapping.fieldMappings);
   ```

2. Add more detailed validation rules
   ```typescript
   const rules = [
     { field: 'email', rule: 'required_and_unique' },
     { field: 'phone', rule: 'valid_format', pattern: '^\\+?1?\\d{10}$' }
   ];
   ```

3. Inspect failing records
   ```sql
   SELECT * FROM staging_errors WHERE status = 'FAILED' LIMIT 10;
   ```

4. Review transformation logic
   ```typescript
   // Test transformation on sample records
   const testRecord = { ...sourceRecord };
   const transformed = await fieldMapper.map(testRecord, mappings);
   console.log(transformed);
   ```

#### Problem: "Duplicate key violations"

```
Error: duplicate key value violates unique constraint
```

**Solutions:**

1. Use upsert instead of insert
   ```typescript
   await targetDb.upsert(
     'customers',
     records,
     ['customer_id']  // unique key
   );
   ```

2. Clean target table before loading
   ```typescript
   await targetDb.delete('customers', 'created_at < NOW() - INTERVAL 1 DAY');
   ```

3. Check for duplicate source records
   ```sql
   SELECT id, COUNT(*) 
   FROM src_customers 
   GROUP BY id 
   HAVING COUNT(*) > 1;
   ```

### Transformation Issues

#### Problem: "Values not translating correctly"

**Solutions:**

1. Verify translation table data
   ```sql
   SELECT * FROM status_translations WHERE source_code = 'A';
   ```

2. Check translation mapper configuration
   ```typescript
   const mapping = {
     sourceField: 'status_code',
     lookupTable: 'status_translations',
     lookupSourceColumn: 'source_code',
     lookupTargetColumn: 'target_code'
   };
   ```

3. Test translation in isolation
   ```typescript
   const value = await translator.translateValue(
     'status_translations',
     'source_code',
     'target_code',
     'A'
   );
   console.log(value);  // Should print translated value
   ```

#### Problem: "Date format conversions failing"

**Solutions:**

1. Use explicit date transformation
   ```typescript
   const mapping = {
     sourceField: 'created_date',
     targetField: 'createdAt',
     transform: (value) => {
       const date = new Date(value);
       return date.toISOString();
     }
   };
   ```

2. Handle multiple date formats
   ```typescript
   const parseDate = (value) => {
     // Try ISO format
     let date = new Date(value);
     if (isNaN(date.getTime())) {
       // Try MM/DD/YYYY format
       const parts = value.split('/');
       date = new Date(parts[2], parts[0] - 1, parts[1]);
     }
     return date.toISOString();
   };
   ```

### Rollback & Recovery

#### Problem: "Need to rollback a failed conversion"

**Solutions:**

1. For PostgreSQL with transactions
   ```typescript
   const transaction = await targetDb.beginTransaction();
   try {
     // Perform operations
     await transaction.commit();
   } catch (error) {
     await transaction.rollback();
   }
   ```

2. Keep backup of target table
   ```sql
   CREATE TABLE customers_backup AS SELECT * FROM customers;
   -- After conversion, if needed:
   TRUNCATE TABLE customers;
   INSERT INTO customers SELECT * FROM customers_backup;
   ```

3. Use checkpoint-based recovery
   ```typescript
   const state = await stateManager.getState(jobId);
   // Resume from last checkpoint
   await orchestrator.resumeConversion(jobId);
   ```

### Debugging Techniques

#### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

#### Add Detailed Logging

```typescript
logger.debug('Record transformation details', {
  sourceRecord,
  fieldMappings,
  transformedRecord,
  timestamp: new Date()
});
```

#### Use Node.js Inspector

```bash
node --inspect src/index.ts
# Open chrome://inspect in Chrome
# Set breakpoints and step through code
```

#### Create Minimal Reproduction

```typescript
// Isolate the problem
const testRecord = { id: '123', status: 'A' };
const mappings = [{
  sourceField: 'status',
  targetField: 'status',
  lookupTable: 'status_translations'
}];

const result = await fieldMapper.map(testRecord, mappings);
console.log(result);
```

---

For more help, check the ARCHITECTURE.md or API_SPECS.md.
